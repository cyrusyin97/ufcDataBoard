import argparse
import datetime as dt
import json
import os
import re
import shutil
import sqlite3
import tempfile
from collections import defaultdict
from pathlib import Path

from common import atomic_json, canonical, digest, file_digest, read_json
from media import TRANSFORM_VERSION, cached_variants

PLACEHOLDERS = {'', '--', '—', '-', 'n/a', 'N/A'}


def nullable(value):
    return None if value is None or str(value).strip() in PLACEHOLDERS else value


def date_value(value):
    value = nullable(value)
    if value is None: return None
    for fmt in ['%b. %d, %Y', '%b %d, %Y', '%B %d, %Y', '%Y-%m-%d']:
        try: return dt.datetime.strptime(value, fmt).date().isoformat()
        except ValueError: pass
    return None


def inches(value):
    value = nullable(value)
    if value is None: return None
    match = re.search(r"(\d+)\s*'\s*(\d+(?:\.\d+)?)", str(value))
    if match: return float(match[1]) * 12 + float(match[2])
    match = re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*"?\s*', str(value))
    return float(match[1]) if match else None


def record(value):
    match = re.fullmatch(r'(\d+)-(\d+)-(\d+)', value or '')
    return dict(zip(['wins', 'losses', 'draws'], map(int, match.groups()))) if match else None


def age(birth_date, as_of):
    if birth_date is None: return None
    born = dt.date.fromisoformat(birth_date)
    today = dt.date.fromisoformat(as_of)
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def number(value):
    value = nullable(value)
    if value is None: return None
    try: return int(value)
    except (TypeError, ValueError): return None


def validate_config(config, ids):
    divisions = config['divisions']
    keys = [d['id'] for d in divisions]
    if len(set(keys)) != len(keys) or config['defaultDivisionId'] not in keys:
        raise ValueError('Invalid division registry')
    seen = set()
    for mapping in config['mappings']:
        if mapping['fighterId'] not in ids or mapping['fighterId'] in seen or mapping['matchState'] != 'reviewed':
            raise ValueError('Invalid or unreviewed fighter mapping')
        seen.add(mapping['fighterId'])
    for division in divisions:
        entries = division['entries']
        entry_ids = [e['fighterId'] for e in entries]
        if not entries or len(set(entry_ids)) != len(entries) or any(fid not in ids for fid in entry_ids):
            raise ValueError('Invalid ranking identities')
        ranks = [e['rank'] for e in entries]
        if ranks != sorted(ranks) or any(not isinstance(x, int) or x < 0 for x in ranks):
            raise ValueError('Invalid ranking ordering')
        champs = [e['fighterId'] for e in entries if e['isChampion']]
        if division['publicationState'] == 'published' and (champs != [division['defaultFighterId']] or entries[0]['rank'] != 0):
            raise ValueError('Invalid published champion')


def prepare(db_path, config_path, cache_root, reviews_path, output_root, as_of):
    db_path = Path(db_path)
    before = file_digest(db_path)
    config = read_json(config_path)
    connection = sqlite3.connect(db_path.resolve().as_uri() + '?mode=ro', uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA query_only = ON')
    connection.execute('BEGIN')
    if connection.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        raise ValueError('SQLite integrity check failed')
    if connection.execute('PRAGMA foreign_key_check').fetchone():
        raise ValueError('SQLite foreign key check failed')
    required = {'fighters': {'id', 'name', 'url', 'wins', 'losses', 'draws', 'dob', 'height', 'reach'},
                'fights': {'id', 'fighter_id', 'event_id', 'result', 'method', 'round', 'time'},
                'events': {'id', 'name', 'date', 'url'}}
    for table, columns in required.items():
        actual = {row['name'] for row in connection.execute('PRAGMA table_info(' + table + ')')}
        if not columns <= actual: raise ValueError('Missing required database columns')
    fighters = [dict(row) for row in connection.execute('SELECT * FROM fighters ORDER BY id')]
    ids = {row['id'] for row in fighters}
    if any(not re.fullmatch('[0-9a-f]{16}', fid) for fid in ids): raise ValueError('Invalid source fighter ID')
    validate_config(config, ids)
    source_counts = {table: connection.execute('SELECT count(*) FROM ' + table).fetchone()[0]
                     for table in ['fighters', 'events', 'fights', 'fight_details']}
    mappings = {m['fighterId']: m for m in config['mappings']}
    events = {e['id']: dict(e) for e in connection.execute('SELECT * FROM events')}
    paired = defaultdict(list)
    fights = [dict(row) for row in connection.execute('SELECT * FROM fights ORDER BY id,fighter_id')]
    for row in fights: paired[row['id']].append(row['fighter_id'])
    if any(len(v) != 2 or len(set(v)) != 2 or any(fid not in ids for fid in v) for v in paired.values()):
        raise ValueError('Every bout must contain two valid fighter perspectives')
    histories = defaultdict(list)
    outcomes = {'win': 'W', 'loss': 'L', 'draw': 'D', 'nc': 'NC'}
    for row in fights:
        event = events.get(row['event_id'])
        if not event: raise ValueError('A fight references an absent event')
        opponent_id = next(fid for fid in paired[row['id']] if fid != row['fighter_id'])
        histories[row['fighter_id']].append({
            'id': row['id'], 'fighterId': row['fighter_id'], 'opponentId': opponent_id,
            'opponentName': nullable(row['opponent']), 'eventId': event['ufcstats_id'] or 'local-event-' + str(event['id']),
            'eventName': event['name'], 'date': date_value(event['date']), 'location': nullable(event['location']),
            'result': outcomes[row['result']], 'method': nullable(row['method']),
            'round': number(row['round']), 'time': nullable(row['time']), 'sourceUrl': nullable(row['fight_url'])})
    connection.rollback()
    connection.close()
    if before != file_digest(db_path): raise ValueError('The source database changed during export')
    profiles = []
    conflicts = []
    for row in fighters:
        mapping = mappings.get(row['id'])
        observation = mapping.get('observations', {}) if mapping else {}
        birth = date_value(row['dob'])
        career = {key: number(row[key]) for key in ['wins', 'losses', 'draws', 'no_contests']}
        career['noContests'] = career.pop('no_contests')
        ufc_record = record(observation.get('careerRecord'))
        if ufc_record and any(career[k] != ufc_record[k] for k in ufc_record):
            conflicts.append({'fighterId': row['id'], 'field': 'careerRecord', 'ufcstats': career, 'ufcCom': ufc_record})
        bio = observation.get('bio', {})
        for key, db_field in [('Height', 'height'), ('Reach', 'reach')]:
            observed = inches(bio.get(key))
            chosen = inches(row[db_field])
            if observed is not None and chosen is not None and abs(observed - chosen) > 0.01:
                conflicts.append({'fighterId': row['id'], 'field': db_field, 'ufcstatsInches': chosen, 'ufcComInches': observed})
        height, reach = inches(row['height']), inches(row['reach'])
        profiles.append({'id': row['id'], 'name': row['name'], 'displayName': observation.get('name') or row['name'],
            'ufcSlug': mapping['ufcSlug'] if mapping else None, 'nickname': nullable(row['nickname']),
            'careerRecord': career, 'birthDate': birth, 'ageAtSnapshot': age(birth, as_of),
            'heightCm': round(height * 2.54, 2) if height is not None else None,
            'reachCm': round(reach * 2.54, 2) if reach is not None else None, 'stance': nullable(row['stance']),
            'placeOfBirth': nullable(bio.get('Place of Birth')), 'trainingGym': nullable(bio.get('Trains at')),
            'fightingStyle': nullable(bio.get('Fighting style')), 'status': nullable(bio.get('Status')),
            'finishCounts': {'knockout': number(observation.get('finishCounts', {}).get('Wins by Knockout')),
                             'submission': number(observation.get('finishCounts', {}).get('Wins by Submission'))},
            'fieldSources': {'careerRecord': row['url'], 'birthDate': row['url'], 'heightCm': row['url'], 'reachCm': row['url'],
                'finishCounts': mapping['sourcePageUrl'] if mapping else None,
                'biography': mapping['sourcePageUrl'] if mapping else None},
            'sourceObservations': {'ufcCom': {'capturedAt': mapping['capturedAt'], 'sourceUrl': mapping['sourcePageUrl'],
                                  'values': observation} if mapping else None,
                                   'ufcstats': {'sourceUrl': row['url'], 'scrapedAt': nullable(row['scraped_at'])}},
            'sourceUrl': row['url']})
        histories[row['id']].sort(key=lambda r: (r['date'] or '', r['id']), reverse=True)
    cache = Path(cache_root)
    receipt = read_json(cache / 'receipt.json') if (cache / 'receipt.json').exists() else {'assets': {}}
    reviews = read_json(reviews_path).get('reviews', {}) if Path(reviews_path).exists() else {}
    public_media = {fid: {'headshot': None, 'half_body': None, 'full_body': None} for fid in sorted(ids)}
    output_root = Path(output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='pending-', dir=output_root))
    media_dir = stage / 'media'
    source_media = []
    for key, asset in sorted(receipt['assets'].items()):
        review = reviews.get(key)
        if not review or review['state'] != 'approved':
            continue
        candidates = [asset] + list(reversed(receipt.get('history', {}).get(key, [])))
        asset = next((item for item in candidates if item['sha256'] == review['sha256']), None)
        if not asset: continue
        fid, role = key.split(':')
        if fid not in ids or fid not in mappings or role not in public_media[fid]:
            raise ValueError('Media references an unknown identity or role')
        path = cache / asset['file']
        if file_digest(path) != asset['sha256']: raise ValueError('Media cache hash differs')
        outputs = cached_variants(path.read_bytes(), role, cache, media_dir)
        public_media[fid][role] = {'sourceUrl': asset['sourceUrl'], 'sourceSha256': asset['sha256'],
            'role': role, 'reviewedAt': review['reviewedAt'], 'rightsStatus': 'unknown',
            'variants': [{**{k: value for k, value in v.items() if k != 'file'}, 'path': 'media/' + v['file']} for v in outputs]}
        source_media.append({'fighterId': fid, 'role': role, 'sha256': asset['sha256']})
    source = {'databaseSha256': before, 'sourceCounts': source_counts, 'asOf': as_of, 'config': config,
              'media': public_media, 'transformVersion': TRANSFORM_VERSION, 'schemaVersion': 1,
              'contentSha256': digest(canonical({'profiles': profiles, 'histories': dict(histories)}))}
    version = as_of + '-' + digest(canonical(source))[:16]
    bundles = []
    for profile in profiles:
        value = {'schemaVersion': 1, 'datasetVersion': version, 'profile': profile, 'records': histories[profile['id']]}
        bundles.append(value)
        atomic_json(stage / 'fighters' / (profile['id'] + '.json'), value)
    atomic_json(stage / 'index.json', {'schemaVersion': 1, 'datasetVersion': version,
        'fighters': [{'id': p['id'], 'name': p['name'], 'displayName': p['displayName'], 'ufcSlug': p['ufcSlug']} for p in profiles]})
    registry = {'schemaVersion': 1, 'datasetVersion': version, 'defaultDivisionId': config['defaultDivisionId'], 'divisions': config['divisions']}
    atomic_json(stage / 'divisions.json', registry)
    for roles in public_media.values():
        for asset in roles.values():
            if asset:
                for variant in asset['variants']: variant['url'] = '/data/v1/' + version + '/' + variant.pop('path')
    atomic_json(stage / 'media.json', {'schemaVersion': 1, 'datasetVersion': version, 'fighters': public_media})
    atomic_json(stage / 'conflicts.json', {'schemaVersion': 1, 'datasetVersion': version, 'observations': conflicts})
    files = {str(p.relative_to(stage)): {'sha256': file_digest(p), 'bytes': p.stat().st_size}
             for p in sorted(stage.rglob('*')) if p.is_file()}
    manifest = {'schemaVersion': 1, 'datasetVersion': version, 'asOf': as_of,
        'sourceDatabaseSha256': before, 'sourceCounts': source_counts,
        'counts': {'fighters': len(profiles), 'records': len(fights), 'bouts': len(paired), 'divisions': len(config['divisions']),
                   'mediaAssets': len(source_media), 'fieldConflicts': len(conflicts)}, 'files': files}
    atomic_json(stage / 'manifest.json', manifest)
    atomic_json(output_root / 'latest-stage.json', {'stage': str(stage), 'version': version})
    return {'stage': str(stage), 'version': version, 'counts': manifest['counts']}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', default=os.getenv('UFC_DB_PATH'))
    parser.add_argument('--config', default='data/config/initial.json')
    parser.add_argument('--cache', default='work/media')
    parser.add_argument('--reviews', default='data/config/media-reviews.json')
    parser.add_argument('--output', default='work/exports')
    parser.add_argument('--as-of', required=True)
    args = parser.parse_args()
    if not args.db: parser.error('Set UFC_DB_PATH or provide --db')
    dt.date.fromisoformat(args.as_of)
    print(json.dumps(prepare(args.db, args.config, args.cache, args.reviews, args.output, args.as_of)))


if __name__ == '__main__': main()
