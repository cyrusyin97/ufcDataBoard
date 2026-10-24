"""Read-only M6 coverage audit. Never publish or modify the source database."""
import argparse
import datetime as dt
import hashlib
import json
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path

METRICS = (
    'distance_landed', 'distance_attempted', 'clinch_landed', 'clinch_attempted',
    'td_landed', 'td_attempted', 'sub_att', 'ctrl_seconds', 'ground_landed',
    'sig_landed', 'kd',
)


def date_value(value):
    for fmt in ('%b. %d, %Y', '%b %d, %Y', '%B %d, %Y', '%Y-%m-%d'):
        try:
            return dt.datetime.strptime(value or '', fmt).date().isoformat()
        except ValueError:
            pass
    return None


def round_schedule(time_format):
    """Accept explicit finite schedules, including overtime. Reject ambiguous formats."""
    match = re.fullmatch(r'(\d+) Rnd(?: \+ (\d*)OT)? \((\d+(?:-\d+)*)\)', time_format or '')
    if not match:
        return None
    overtime = (int(match[2]) if match[2] else 1) if 'OT' in time_format else 0
    minutes = list(map(int, match[3].split('-')))
    if len(minutes) != int(match[1]) + overtime or any(m <= 0 for m in minutes):
        return None
    return [m * 60 for m in minutes]


def elapsed_seconds(time_format, end_round, end_time, period):
    schedule = round_schedule(time_format)
    match = re.fullmatch(r'(\d+):([0-5]\d)', end_time or '')
    if schedule is None or not match or not isinstance(end_round, int) or not 1 <= end_round <= len(schedule):
        return None
    if not isinstance(period, int) or not 0 <= period <= end_round:
        return None
    final = int(match[1]) * 60 + int(match[2])
    if final > schedule[end_round - 1]:
        return None
    duration = sum(schedule[:end_round - 1]) + final if period == 0 else final if period == end_round else schedule[period - 1]
    return duration if duration > 0 else None


def division_key(bout_type, divisions):
    """Use the bout's category, never the fighter's current ranking membership."""
    text = (bout_type or '').casefold()
    women = "women's" in text or 'women’s' in text
    for division in sorted(divisions, key=lambda d: len(d['label']), reverse=True):
        label = division['label'].casefold()
        if women != ("women's" in label or 'women’s' in label):
            continue
        if re.search(r'(?<!\w)' + re.escape(label) + r'(?!\w)', text):
            return division['id']
    return None


def audit(db, metadata):
    source = Path(db)
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    divisions = json.loads(Path(metadata).read_text())['divisions']
    c = sqlite3.connect(source.resolve().as_uri() + '?mode=ro', uri=True)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA query_only = ON')
    c.execute('BEGIN')
    try:
        details = {r['id']: dict(r) for r in c.execute('SELECT * FROM fight_details')}
        events = {r['id']: dict(r) for r in c.execute('SELECT id,name,date FROM events')}
        perspectives = defaultdict(list)
        for r in c.execute('SELECT id,fighter_id,event_id FROM fights'):
            perspectives[r['id']].append(dict(r))
        stats = defaultdict(list)
        for r in c.execute('SELECT * FROM fight_round_stats ORDER BY fight_id,fighter_id,round'):
            stats[r['fight_id']].append(dict(r))
        counts = Counter(); by_division = defaultdict(Counter); issues = defaultdict(list)
        totals = Counter(); nulls = Counter(); invalid = Counter(); bad_control = 0
        formats = Counter(d.get('time_format') for d in details.values())
        for bid, pair in sorted(perspectives.items()):
            d = details.get(bid); rows = stats.get(bid, [])
            division = division_key(d.get('bout_type') if d else None, divisions) or 'unmapped'
            group = by_division[division]; group['bouts'] += 1
            if not d:
                counts['missingDetails'] += 1; issues['missingDetails'].append(bid)
            if not rows:
                counts['missingStats'] += 1; issues['missingStats'].append(bid)
                continue
            group['withStats'] += 1; counts['withStats'] += 1
            ids = {p['fighter_id'] for p in pair}
            if len(pair) != 2 or len(ids) != 2 or {r['fighter_id'] for r in rows} != ids:
                counts['invalidParticipants'] += 1; issues['invalidParticipants'].append(bid)
            complete = True
            if d is None or not isinstance(d.get('end_round'), int) or d['end_round'] <= 0:
                complete = False
            else:
                expected = {(fid, period) for fid in ids for period in range(d['end_round'] + 1)}
                complete = expected == {(r['fighter_id'], r['round']) for r in rows} and len(rows) == len(expected) and len(ids) == 2
            if not complete:
                counts['incompleteRoundSet'] += 1; issues['incompleteRoundSet'].append(bid)
            valid_duration = True
            for r in rows:
                t = elapsed_seconds(d.get('time_format'), d.get('end_round'), d.get('end_time'), r['round']) if d else None
                valid_duration &= t is not None
                if t is None: counts['unknownDurationRows'] += 1
                elif t < 60: counts['shortPeriodRows'] += 1
                for key in METRICS:
                    if r[key] is None: nulls[key] += 1
                    elif not isinstance(r[key], int) or r[key] < 0: invalid[key] += 1
                if t is not None and r['ctrl_seconds'] is not None and r['ctrl_seconds'] > t:
                    bad_control += 1; complete = False
                if all(r[k] is not None for k in ('sig_landed','distance_landed','clinch_landed','ground_landed')):
                    if r['sig_landed'] != r['distance_landed'] + r['clinch_landed'] + r['ground_landed']:
                        counts['strikePartitionMismatchRows'] += 1; complete = False
                for landed, attempted in [('distance_landed','distance_attempted'),('clinch_landed','clinch_attempted'),('td_landed','td_attempted')]:
                    if r[landed] is not None and r[attempted] is not None and r[landed] > r[attempted]:
                        counts['landedAboveAttemptedRows'] += 1; complete = False
            if complete:
                for fid in ids:
                    by_round = {r['round']: r for r in rows if r['fighter_id'] == fid}
                    for key in METRICS:
                        values = [r[key] for n,r in by_round.items() if n > 0]
                        if by_round[0][key] is not None and all(x is not None for x in values) and sum(values) != by_round[0][key]:
                            totals[key] += 1
            if not valid_duration:
                counts['unknownDurationBouts'] += 1; issues['unknownDurationBouts'].append(bid)
            dates = {date_value(events.get(p['event_id'], {}).get('date')) for p in pair}
            if len(dates) != 1 or None in dates:
                counts['invalidEventDate'] += 1
            event_ids = {p['event_id'] for p in pair}
            if len(event_ids) != 1:
                counts['eventMismatch'] += 1; issues['eventMismatch'].append(bid)
            event = events.get(pair[0]['event_id'], {})
            is_ufc = bool(re.match(r'^UFC(?:\b|:)', event.get('name') or ''))
            if complete and valid_duration and is_ufc and len(event_ids)==1 and d['time_format'] in ('3 Rnd (5-5-5)', '5 Rnd (5-5-5-5-5)') and len(dates)==1 and None not in dates and division != 'unmapped' and all(all(r[k] is not None and isinstance(r[k],int) and r[k]>=0 for k in METRICS) for r in rows):
                group['completeUfcCandidates'] += 1
        result = {
            'auditVersion': 1, 'sourceDatabaseSha256': before,
            'sourceCounts': {'bouts':len(perspectives),'detailBouts':len(details),'statsBouts':len(stats),'statsRows':sum(map(len,stats.values()))},
            'coverage': dict(sorted(counts.items())), 'divisions': {k:dict(v) for k,v in sorted(by_division.items())},
            'nullMetrics':dict(nulls), 'invalidMetrics':dict(invalid), 'controlAboveDurationRows':bad_control,
            'aggregateVsRoundMismatchCounts':dict(totals),
            'orphanStatsBouts':sorted(set(stats)-set(perspectives)),
            'timeFormats':dict(sorted(formats.items(),key=lambda p:str(p[0]))),
            'issueExamples':{k:v[:10] for k,v in sorted(issues.items())},
            'notes':['Candidates are not per-event reference cohorts. Eligibility still requires the chosen historical window and minimum sample.', 'Stored round-zero totals are audited, not reconstructed from round sums.', 'No source or active release files are modified.'],
        }
    finally:
        c.rollback();c.close()
    if hashlib.sha256(source.read_bytes()).hexdigest() != before:
        raise ValueError('Source database changed during audit')
    return result


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--db',required=True)
    parser.add_argument('--metadata',default='data/config/division-metadata.json')
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    result=audit(args.db,args.metadata)
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    print(json.dumps(result['sourceCounts']))
    print(json.dumps(result['coverage']))
