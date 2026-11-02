"""Summarize local M8 receipts. No source data or runtime state is changed."""
import hashlib
import json
import math
import tarfile
from pathlib import Path

ROOT = Path('work/m8')

def stats(values):
    values = sorted(values)
    return {'n': len(values), 'median': values[math.ceil(len(values) * .5) - 1],
            'p95': values[math.ceil(len(values) * .95) - 1]} if values else {'n': 0, 'median': None, 'p95': None}

def span(record, stage):
    return sum(s['end'] - s['start'] for s in record['spans']
               if s['stage'] == stage and s['end'] is not None)

def scene(record):
    if record['scene'] == 'dial':
        return 'dial-previous' if record['to']['fighter'] == 'e1248941344b3288' else 'dial-next'
    return 'rankings-return' if record['scene'] == 'history-return' else record['scene']

result = {'date': '2026-11-02', 'percentileMethod': 'nearest-rank', 'candidates': {},
          'limits': ['Sequential before/after runs; no randomized rebuild crossover',
                     'Headless local Chromium; not deployed INP or GPU FPS',
                     'Controlled delays are mechanism experiments, not production latency',
                     'Broad M7 measurement acceptance remains open']}
for label in ['before', 'after']:
    paths = {name: ROOT / f'{label}-{name}.json' for name in ['warm','feedback','first-bout']}
    data = {name: json.loads(path.read_text()) for name, path in paths.items()}
    warm = data['warm']
    records = [r for capture in warm['captures'] for r in capture['records'] if r['outcome'] == 'completed']
    groups = []
    for name in dict.fromkeys(row['scene'] for row in warm['rows']):
        external = [row for row in warm['rows'] if row['scene'] == name]
        measured = [r for r in records if scene(r) == name]
        groups.append({'scene': name, 'externalSettleMs': stats([r['probe']['duration'] for r in external]),
                       'frameIntervalMs': stats([f for r in external for f in r['probe']['frames']]),
                       'prepareMs': stats([span(r,'prepare') for r in measured]),
                       'commitMs': stats([span(r,'commit') for r in measured]),
                       'measuredSettleMs': stats([r['settleLatency'] for r in measured if r['settleLatency'] is not None]),
                       'decodeHits': sum(s['stage']=='decode' and s['cache']=='hit' for r in measured for s in r['spans'])})
    first = [r for c in data['first-bout']['samples'] for r in c['records'] if r['outcome']=='completed' and r['scene']=='bout-open']
    result['candidates'][label] = {
        'buildId': warm['buildId'], 'datasetVersion': warm['datasetVersion'], 'viewport': warm['viewport'],
        'warm': groups,
        'controlledFeedbackMs': stats([v['feedback']['delay'] for v in data['feedback']['samples']]),
        'controlledFirstBoutPrepareMs': stats([span(r,'prepare') for r in first]),
        'controlledFirstBoutSettleMs': stats([r['settleLatency'] for r in first]),
        'receipts': {name: {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for name,path in paths.items()}}
for label in ['before', 'after']:
    archive = ROOT / f'{label}-source.tar.gz'
    digest = hashlib.sha256()
    with tarfile.open(archive) as source:
        members = sorted((m for m in source.getmembers() if m.isfile() and m.name.startswith('src/')), key=lambda m: m.name)
        for member in members:
            digest.update(member.name.encode() + b'\0' + source.extractfile(member).read())
    result['candidates'][label]['sourceTreeSha256'] = digest.hexdigest()
    result[f'{label}SourceArchive'] = {'path': str(archive), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}
Path('docs/evidence/m8-comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
