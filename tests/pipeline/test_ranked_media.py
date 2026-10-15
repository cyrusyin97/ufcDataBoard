import sys
import unittest
import io
import json
import sqlite3
import tempfile
import urllib.error
from pathlib import Path
from unittest.mock import patch
from PIL import Image
sys.path.insert(0, str(Path('scripts/pipeline').resolve()))
from expand_ranked_media import ranking_candidates, norm, identity_mapping, collect_ranked
from common import file_digest


def group(label, name, slug):
    return f'''<div class="view-grouping"><div class="view-grouping-header">{label}</div>
      <table><caption><h5><a href="/athlete/{slug}">{name}</a></h5></caption>
      <tr><td class="views-field-title"><a href="/athlete/other">Other Fighter</a></td></tr></table></div>'''


class RankedMediaTests(unittest.TestCase):
    def test_hidden_metadata_does_not_replace_visible_roster(self):
        body = '<div class="view-display-id-block_1">' + group('Flyweight', 'Current Champion', 'current') + '</div>'
        body += '<div class="view-display-id-meta_rankings">' + group('Flyweight', 'Old Champion', 'old') + '</div>'
        result = ranking_candidates(body, set())
        self.assertEqual(result[0]['entries'][0]['name'], 'Current Champion')
        self.assertEqual(len(result), 1)

    def test_excludes_pound_for_pound_and_existing_divisions(self):
        body = '<div class="view-display-id-block_1">'
        for label in ['Featherweight', 'Lightweight', "Men's Pound-for-Pound", "Women's Strawweight"]:
            body += group(label, 'Champion', 'champion')
        body += '</div>'
        result = ranking_candidates(body, {'Featherweight', 'Lightweight'})
        self.assertEqual([d['label'] for d in result], ["Women's Strawweight"])
        self.assertEqual(len(result[0]['entries']), 2)

    def test_conflicting_primary_groups_fail(self):
        body = '<div class="view-display-id-block_1">' + group('Flyweight', 'One', 'one') + group('Flyweight', 'Two', 'two') + '</div>'
        with self.assertRaisesRegex(ValueError, 'disagree'):
            ranking_candidates(body, set())

    def test_polish_and_punctuation_aliases(self):
        self.assertEqual(norm('Jan Błachowicz'), norm('Jan Blachowicz'))
        self.assertEqual(norm('Lone’er Kavanagh'), norm("Lone'er Kavanagh"))

    def test_identity_requires_more_than_one_matching_measurement(self):
        row = {'name': 'Example Fighter', 'pageUrl': 'https://www.ufc.com/athlete/example'}
        database = {'id': 'a' * 16, 'height': "5' 10\"", 'reach': None, 'dob': None,
                    'wins': 10, 'losses': 2, 'draws': 0}
        source = {'name': 'Example Fighter', 'bio': {'Height': '70.00'}, 'careerRecord': '11-2-0'}
        with self.assertRaisesRegex(ValueError, 'biography review'):
            identity_mapping(row, database, source, '2026-10-14')

    def test_identity_keeps_record_conflicts_after_biography_agrees(self):
        row = {'name': 'Example Fighter', 'pageUrl': 'https://www.ufc.com/athlete/example'}
        database = {'id': 'a' * 16, 'height': "5' 10\"", 'reach': '72\"', 'dob': 'Oct. 14, 1996',
                    'wins': 10, 'losses': 2, 'draws': 0}
        source = {'name': 'Example Fighter', 'bio': {'Height': '70.00', 'Reach': '72.00', 'Age': '30'},
                  'careerRecord': '11-2-0'}
        result = identity_mapping(row, database, source, '2026-10-14')
        self.assertEqual(result['fighterId'], database['id'])
        self.assertEqual(result['observations']['careerRecord'], '11-2-0')
        self.assertEqual(len(result['matchEvidence']), 4)

    def test_matching_measurements_do_not_override_wrong_profile_name(self):
        row = {'name': 'Example Fighter', 'pageUrl': 'https://www.ufc.com/athlete/example'}
        database = {'id': 'a' * 16, 'height': "5' 10\"", 'reach': '72\"', 'dob': None,
                    'wins': 10, 'losses': 2, 'draws': 0}
        source = {'name': 'Other Fighter', 'bio': {'Height': '70.00', 'Reach': '72.00'},
                  'careerRecord': '10-2-0'}
        with self.assertRaisesRegex(ValueError, 'name mismatch'):
            identity_mapping(row, database, source, '2026-10-14')

    def test_collection_resumes_one_failed_role_without_changing_database(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            database = root / 'source.db'
            with sqlite3.connect(database) as connection:
                connection.execute('CREATE TABLE fighters(id TEXT,name TEXT,height TEXT,reach TEXT,dob TEXT,wins INTEGER,losses INTEGER,draws INTEGER)')
                for fid, name in [('a' * 16, 'One'), ('b' * 16, 'Other Fighter')]:
                    connection.execute('INSERT INTO fighters VALUES(?,?,?,?,?,?,?,?)',
                                       (fid, name, "5' 10\"", '72\"', None, 10, 2, 0))
            config = root / 'config.json'
            config.write_text(json.dumps({'divisions': []}))
            hashes = (file_digest(database), file_digest(config))
            image = io.BytesIO()
            Image.new('RGBA', (100, 800), (255, 0, 0, 255)).save(image, format='PNG')
            fail_once, calls = [True], []

            def request(url, kind='image'):
                calls.append(url)
                if url.endswith('/rankings'):
                    body = '<div class="view-display-id-block_1">' + group('Flyweight', 'One', 'one') + '</div>'
                elif kind == 'document':
                    slug = url.rsplit('/', 1)[-1]
                    name = 'One' if slug == 'one' else 'Other Fighter'
                    body = f'''<h1 class="hero-profile__name">{name}</h1>
                      <div class="hero-profile__division-body">10-2-0 (W-L-D)</div>
                      <div class="c-bio__field"><div class="c-bio__label">Height</div><div class="c-bio__text">70.00</div></div>
                      <div class="c-bio__field"><div class="c-bio__label">Reach</div><div class="c-bio__text">72.00</div></div>
                      <img class="hero-profile__image" src="/images/styles/body/s3/{slug}.png?itok=sample">
                      <meta property="og:image" content="/images/{slug}-head.png">'''
                else:
                    if url.endswith('/images/one.png') and fail_once[0]:
                        fail_once[0] = False
                        raise urllib.error.HTTPError(url, 403, 'blocked', {}, None)
                    return image.getvalue(), {'status': 200, 'mime': 'image/png', 'finalUrl': url}
                return body.encode(), {'status': 200, 'mime': 'text/html', 'finalUrl': url}

            with patch('expand_ranked_media.Network') as network:
                network.return_value.get.side_effect = request
                first = collect_ranked(database, config, root / 'output', root / 'cache')
                self.assertIn('one:full_body', first['failures'])
                checkpoint = len(calls)
                second = collect_ranked(database, config, root / 'output', root / 'cache', retry_failures=True)
                self.assertEqual(second['failures'], {})
                self.assertEqual(calls[checkpoint:], ['https://www.ufc.com/images/one.png'])
            self.assertEqual((file_digest(database), file_digest(config)), hashes)
            receipt = json.loads((root / 'cache/receipt.json').read_text())
            self.assertEqual(len(receipt['assets']), 6)
            self.assertEqual(second['total'], 2)
            self.assertFalse((root / 'output/approvals.json').exists())
