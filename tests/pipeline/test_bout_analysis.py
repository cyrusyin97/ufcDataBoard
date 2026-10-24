import copy
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path('scripts/pipeline').resolve()))
from bout_analysis import make_reference, bounds, window_start, normalized_stats, prepare_bouts
from audit_bout_stats import METRICS
from common import file_digest, read_json
from export_data import prepare
from test_pipeline import fixture, A, B

POLICY = read_json('data/config/bout-policy.json')


def candidate(date):
    values = {k: 1 for k in METRICS}
    values['sig_landed'] = 3
    return {'eventDate': date, 'periods': [
        {'round': n, 'elapsedSeconds': 300, 'participants': [{'stats': values}, {'stats': values}]}
        for n in (0, 1)]}


class ReferenceRules(unittest.TestCase):
    def test_window_excludes_current_and_future_dates(self):
        cohort = [candidate('2020-01-01') for _ in range(50)] + [candidate('2021-09-25'), candidate('2026-01-01'), candidate('2016-09-24')]
        reference = make_reference(cohort, 'featherweight', '2021-09-25', 'a'*64, POLICY)
        self.assertEqual(reference['distinctBoutCount'], 50)
        self.assertEqual(reference['status'], 'available')
        self.assertEqual(reference['periods']['bout']['observationCount'], 100)
        self.assertEqual(reference['periods']['round']['observationCount'], 100)
        self.assertEqual(reference, make_reference(cohort, 'featherweight', '2021-09-25', 'a'*64, POLICY))

    def test_minimum_uses_bouts_not_perspectives(self):
        reference = make_reference([candidate('2020-01-01') for _ in range(49)], 'featherweight', '2021-09-25', 'a'*64, POLICY)
        self.assertEqual(reference['status'], 'insufficient-cohort')
        self.assertEqual(reference['periods']['bout']['observationCount'], 98)

    def test_bound_fallbacks_and_empty(self):
        self.assertEqual(bounds([]), {'upper': None, 'method': None})
        self.assertEqual(bounds([0]*100), {'upper': None, 'method': None})
        self.assertEqual(bounds([0]*97+[1]*3)['method'], 'P99')
        self.assertEqual(bounds([0]*999+[1])['method'], 'MAX')
        self.assertEqual(bounds([1]*100), {'upper': 1.0, 'method': 'P95'})

    def test_leap_window_and_null_control(self):
        self.assertEqual(window_start('2024-02-29', 5), '2019-02-28')
        value, invalid = normalized_stats({k: None for k in METRICS}, 300)
        self.assertFalse(invalid);self.assertIsNone(value['ctrl_seconds'])
        bad = {k: 0 for k in METRICS};bad['ctrl_seconds'] = 301
        self.assertEqual(normalized_stats(bad, 300), (None, True))

    def test_export_extension_checked_without_changing_source(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);db, config = fixture(root)
            c = sqlite3.connect(db)
            for name, kind in [('url','TEXT'),('bout_type','TEXT'),('event','TEXT'),('method','TEXT'),('end_round','INTEGER'),('end_time','TEXT'),('time_format','TEXT'),('scraped_at','TEXT')]:
                c.execute(f'ALTER TABLE fight_details ADD COLUMN {name} {kind}')
            c.execute("UPDATE fight_details SET bout_type='Featherweight Bout',end_round=1,end_time='0:45',time_format='3 Rnd (5-5-5)'")
            c.execute('CREATE TABLE fight_round_stats(fight_id TEXT,fighter_id TEXT,round INTEGER,'+','.join(k+' INTEGER' for k in METRICS)+')')
            for fid in (A,B):
                for n in (0,1):
                    c.execute('INSERT INTO fight_round_stats VALUES('+','.join('?' for _ in range(3+len(METRICS)))+')',[A,fid,n]+[0]*len(METRICS))
            c.commit();c.close();before=file_digest(db)
            result=prepare(db,config,root/'cache',root/'reviews.json',root/'exports','2026-10-23','data/config/bout-policy.json')
            stage=Path(result['stage'])
            manifest=read_json(stage/'manifest.json')
            self.assertEqual(manifest['boutAnalysis']['boutCount'],1)
            bout=read_json(stage/'bouts'/f'{A}.json')
            self.assertEqual(bout['periods'][0]['elapsedSeconds'],45)
            reference=read_json(stage/'bout-references'/f"{bout['referenceId']}.json")
            self.assertEqual(reference['status'],'insufficient-cohort')
            check=subprocess.run([os.environ.get('UFC_NODE','node'),'scripts/check-data.ts',str(stage)],capture_output=True,text=True)
            self.assertEqual(check.returncode,0,check.stderr)
            self.assertEqual(before,file_digest(db))
