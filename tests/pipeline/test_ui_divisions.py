import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path("scripts/pipeline").resolve()))
from expand_ui_divisions import extract_rankings


def group(display='block_1', champion=True):
    head = '<h5><a href="/athlete/champion">Champion</a></h5>' if champion else ''
    rows = ''.join(f'<tr><td class="views-field-weight-class-rank">6</td><td class="views-field-title"><a href="/athlete/fighter-{i}">Fighter</a></td></tr>' for i in range(2))
    return f'<div class="view-display-id-{display}"><div class="view-grouping"><div class="view-grouping-header">Women\'s Flyweight</div><table>{head}{rows}</table></div></div>'


class UiDivisionTests(unittest.TestCase):
    def test_explicit_tied_ranks_and_champion(self):
        result = extract_rankings(group() + group('meta_rankings', False))["Women's Flyweight"]
        self.assertEqual([e['rank'] for e in result], [0, 6, 6])
        self.assertEqual([e['isChampion'] for e in result], [True, False, False])

    def test_missing_champion_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'explicit champion'):
            extract_rankings(group(champion=False))

    def test_rank_is_not_inferred_from_position(self):
        with self.assertRaisesRegex(ValueError, 'explicit rank'):
            extract_rankings(group().replace('>6</td>', '>unknown</td>'))
