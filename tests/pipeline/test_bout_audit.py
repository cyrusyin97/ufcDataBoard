import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path('scripts/pipeline').resolve()))
from audit_bout_stats import elapsed_seconds, round_schedule, division_key, date_value


class BoutAuditRules(unittest.TestCase):
    def test_normal_and_partial_duration(self):
        self.assertEqual(elapsed_seconds('5 Rnd (5-5-5-5-5)', 5, '5:00', 0), 1500)
        self.assertEqual(elapsed_seconds('3 Rnd (5-5-5)', 2, '1:07', 0), 367)
        self.assertEqual(elapsed_seconds('3 Rnd (5-5-5)', 2, '1:07', 1), 300)
        self.assertEqual(elapsed_seconds('3 Rnd (5-5-5)', 2, '1:07', 2), 67)

    def test_historical_schedules_and_overtime(self):
        self.assertEqual(elapsed_seconds('2 Rnd (10-5)', 2, '2:10', 0), 730)
        self.assertEqual(round_schedule('1 Rnd + 2OT (15-3-3)'), [900, 180, 180])
        self.assertEqual(elapsed_seconds('1 Rnd + OT (12-3)', 2, '1:00', 0), 780)

    def test_unknown_invalid_and_zero_durations_stay_null(self):
        for fmt, end, time, period in [('No Time Limit', 1, '1:00', 0), ('Unlimited Rnd (15)', 2, '1:00', 0), ('2 Rnd (5)', 1, '1:00', 0), ('3 Rnd (5-5-5)', 2, '6:00', 0), ('3 Rnd (5-5-5)', 2, '1:60', 0), ('3 Rnd (5-5-5)', 2, '1:00', 3), ('3 Rnd (5-5-5)', 1, '0:00', 0)]:
            self.assertIsNone(elapsed_seconds(fmt, end, time, period))

    def test_division_identity_never_falls_back_to_mens_or_shorter_label(self):
        divisions=[{'id':'heavyweight','label':'Heavyweight'}, {'id':'light-heavyweight','label':'Light Heavyweight'}, {'id':'featherweight','label':'Featherweight'}]
        self.assertEqual(division_key('UFC Light Heavyweight Title Bout', divisions), 'light-heavyweight')
        self.assertIsNone(division_key("Women's Featherweight Bout", divisions))
        self.assertIsNone(division_key('Catch Weight Bout', divisions))

    def test_source_date_variants(self):
        for value in ['Sep. 25, 2021','Sep 25, 2021','September 25, 2021','2021-09-25']:
            self.assertEqual(date_value(value), '2021-09-25')
        self.assertIsNone(date_value(None))
