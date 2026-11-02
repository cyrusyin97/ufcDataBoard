"""Verify a baseline and validate an isolated candidate. Never collect or publish."""
import argparse
import hashlib
import json
import shutil
import sqlite3
from pathlib import Path

TABLES = ('fighters', 'events', 'fights', 'fight_details', 'fight_round_stats')

def inspect(path):
    path = Path(path).resolve(strict=True)
    with sqlite3.connect(path.as_uri() + '?mode=ro', uri=True) as conn:
        if conn.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
            raise ValueError('SQLite integrity check failed')
        if conn.execute('PRAGMA foreign_key_check').fetchone():
            raise ValueError('SQLite reference check failed')
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {'fighters', 'events', 'fights'} <= tables:
            raise ValueError('Required source tables are absent')
        present = [table for table in TABLES if table in tables]
        counts = {table: conn.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0] for table in present}
        if not counts['fighters'] or not counts['events'] or not counts['fights']:
            raise ValueError('Baseline database is empty')
        identity_columns = {'fighters':'id', 'events':'id', 'fights':'id, fighter_id', 'fight_details':'id', 'fight_round_stats':'fight_id, fighter_id, round'}
        ids = {table: {tuple(r) for r in conn.execute(f'SELECT {identity_columns[table]} FROM {table}')} for table in present}
    return {'sha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'counts':counts}, ids

def prepare(source, output, expected):
    if len(expected) != 64 or any(c not in '0123456789abcdef' for c in expected):
        raise ValueError('Supply a lowercase SHA-256 baseline checksum')
    receipt, _ = inspect(source)
    if receipt['sha256'] != expected:
        raise ValueError('Baseline checksum differs')
    output = Path(output)
    if output.exists():
        raise ValueError('Candidate path must not already exist')
    output.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source,output)
    return receipt

def validate(baseline, candidate):
    before, old_ids = inspect(baseline)
    after, new_ids = inspect(candidate)
    if any(not ids <= new_ids.get(table, set()) for table,ids in old_ids.items()):
        raise ValueError('Candidate removed existing source identities')
    if any(after['counts'].get(table,0) < count for table,count in before['counts'].items()):
        raise ValueError('Candidate source counts decreased')
    with sqlite3.connect(Path(candidate).resolve().as_uri() + '?mode=ro', uri=True) as conn:
        bad = conn.execute('SELECT id FROM fights GROUP BY id HAVING COUNT(*) != 2 OR COUNT(DISTINCT fighter_id) != 2 LIMIT 1').fetchone()
        if bad:
            raise ValueError('Candidate has incomplete fighter perspectives')
    return {'baseline':before, 'candidate':after, 'status':'candidate-only',
            'scope':'Integrity and append-only checks; not website promotion or freshness approval'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['prepare','validate'])
    parser.add_argument('--baseline',required=True)
    parser.add_argument('--candidate',required=True)
    parser.add_argument('--sha256')
    parser.add_argument('--receipt',required=True)
    args=parser.parse_args()
    result=prepare(args.baseline,args.candidate,args.sha256 or '') if args.mode=='prepare' else validate(args.baseline,args.candidate)
    target=Path(args.receipt);target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,indent=2)+'\n')

if __name__=='__main__':
    main()
