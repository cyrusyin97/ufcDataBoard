"""Build versioned bout observations and pre-event reference populations offline."""
import calendar
import datetime as dt
import re
from collections import defaultdict
from audit_bout_stats import METRICS, date_value, division_key, elapsed_seconds
from common import canonical, digest


def window_start(date, years):
    day = dt.date.fromisoformat(date)
    year = day.year - years
    return day.replace(year=year, day=min(day.day, calendar.monthrange(year, day.month)[1])).isoformat()


def quantile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * fraction
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower)


def bounds(values):
    for fraction, method in [(0.95, 'P95'), (0.99, 'P99'), (1, 'MAX')]:
        upper = quantile(values, fraction)
        if upper is not None and upper > 0:
            return {'upper': upper, 'method': method}
    return {'upper': None, 'method': None}


def normalized_stats(row, seconds):
    if row is None:
        return None, False
    stats = {k: row.get(k) for k in METRICS}
    invalid = any(v is not None and (not isinstance(v, int) or v < 0) for v in stats.values())
    for landed, attempted in [('distance_landed','distance_attempted'),('clinch_landed','clinch_attempted'),('td_landed','td_attempted')]:
        if stats[landed] is not None and stats[attempted] is not None and stats[landed] > stats[attempted]:
            invalid = True
    if seconds is not None and stats['ctrl_seconds'] is not None and stats['ctrl_seconds'] > seconds:
        invalid = True
    parts = [stats[k] for k in ('distance_landed','clinch_landed','ground_landed')]
    if stats['sig_landed'] is not None and all(x is not None for x in parts) and sum(parts) != stats['sig_landed']:
        invalid = True
    # Raw invalid source rows remain in SQLite. Do not publish them as trustworthy counts.
    return (None if invalid else stats), invalid


def make_reference(cohort, division, cutoff, source_hash, policy):
    start = window_start(cutoff, policy['historyYears'])
    included = [b for b in cohort if start <= b['eventDate'] < cutoff]
    enough = len(included) >= policy['minimumBoutCount']
    periods = {}
    for kind in ('bout', 'round'):
        observations = [(p['elapsedSeconds'], x['stats']) for b in included for p in b['periods']
                        if (p['round'] == 0) == (kind == 'bout') for x in p['participants']]
        computed = {key: bounds([s[key] * (1 if key == 'ctrl_seconds' else 300) / seconds
                                 for seconds, s in observations]) for key in METRICS}
        periods[kind] = {'observationCount': len(observations), 'bounds': computed}
    reference = {'schemaVersion': 1, 'formulaVersion': policy['formulaVersion'], 'policyVersion': policy['policyVersion'],
                 'sourceDatabaseSha256': source_hash, 'divisionId': division,
                 'windowStart': start, 'cutoffExclusive': cutoff, 'distinctBoutCount': len(included),
                 'minimumBoutCount': policy['minimumBoutCount'],
                 'status': 'available' if enough else 'insufficient-cohort', 'periods': periods}
    reference['id'] = digest(canonical(reference))
    return reference


def prepare_bouts(connection, divisions, source_hash, policy):
    if policy['formulaVersion'] != '1.1' or policy['historyYears'] != 5 or policy['minimumBoutCount'] != 50 or policy['shortPeriodSeconds'] != 60:
        raise ValueError('Unsupported bout policy; change its version and checks before export')
    details = {r['id']: dict(r) for r in connection.execute('SELECT * FROM fight_details')}
    events = {r['id']: dict(r) for r in connection.execute('SELECT * FROM events')}
    paired, stats = defaultdict(list), defaultdict(dict)
    for row in connection.execute('SELECT * FROM fights ORDER BY id,fighter_id'):
        paired[row['id']].append(dict(row))
    for row in connection.execute('SELECT * FROM fight_round_stats ORDER BY fight_id,fighter_id,round'):
        stats[row['fight_id']][(row['fighter_id'], row['round'])] = dict(row)
    if set(stats) - set(paired):
        raise ValueError('Statistics contain orphan bout IDs')
    bundles, cohorts = [], defaultdict(list)
    outcome_map = {'win': 'W', 'loss': 'L', 'draw': 'D', 'nc': 'NC'}
    for bid, pair in sorted(paired.items()):
        if len(pair) != 2 or pair[0]['fighter_id'] == pair[1]['fighter_id']:
            raise ValueError('Invalid bout participants')
        ids = [p['fighter_id'] for p in pair]
        if any(fid not in ids for fid, _ in stats[bid]):
            raise ValueError('Statistics contain a nonparticipant')
        d = details.get(bid, {})
        end = d.get('end_round')
        if not isinstance(end, int) or end <= 0:
            end = None
        event_rows = [events.get(p['event_id'], {}) for p in pair]
        conflict = pair[0]['event_id'] != pair[1]['event_id']
        event = event_rows[0] if not conflict else {}
        division = division_key(d.get('bout_type'), divisions)
        issues = set()
        if conflict: issues.add('event-conflict')
        if division is None: issues.add('unmapped-division')
        if not stats[bid]: issues.add('missing-stats')
        rounds = sorted({0, *(range(1, end + 1) if end else []), *(r for _, r in stats[bid])})
        if any(r < 0 or (end is not None and r > end) for r in rounds):
            raise ValueError('Source period exceeds bout schedule')
        periods = []
        for period in rounds:
            duration = elapsed_seconds(d.get('time_format'), end, d.get('end_time'), period)
            if duration is None: issues.add('unknown-duration')
            participants = []
            for fid in ids:
                row = stats[bid].get((fid, period))
                value, invalid = normalized_stats(row, duration)
                if invalid: issues.add('invalid-stats')
                if row is None: issues.add('missing-period')
                if value is not None and any(v is None for v in value.values()): issues.add('incomplete-stats')
                participants.append({'fighterId': fid, 'stats': value})
            periods.append({'round': period, 'elapsedSeconds': duration, 'participants': participants})
        b = {'schemaVersion': 1, 'id': bid, 'fighterIds': ids, 'divisionId': division,
             'boutType': d.get('bout_type'), 'eventName': event.get('name'), 'eventDate': date_value(event.get('date')),
             'sourceUrl': d.get('url'), 'capturedAt': d.get('scraped_at'), 'timeFormat': d.get('time_format'),
             'endRound': end, 'endTime': d.get('end_time'), 'method': d.get('method'),
             'outcomes': [outcome_map.get(p['result']) for p in pair], 'periods': periods,
             'issues': sorted(issues), 'referenceId': None}
        bundles.append(b)
        # Exclude aliases, absent fields, unknown classes, and nonstandard reference schedules.
        if not issues and b['eventDate'] and re.match(r'^UFC(?:\b|:)', b['eventName'] or '') and b['timeFormat'] in policy['referenceTimeFormats']:
            cohorts[division].append(b)
    references = {}
    by_key = {}
    for bout in bundles:
        if bout['divisionId'] is None or bout['eventDate'] is None:
            continue
        key = (bout['divisionId'], bout['eventDate'])
        if key not in by_key:
            ref = make_reference(cohorts[key[0]], key[0], key[1], source_hash, policy)
            references[ref['id']] = ref
            by_key[key] = ref['id']
        bout['referenceId'] = by_key[key]
    return {'policy': policy, 'bouts': bundles, 'references': references}
