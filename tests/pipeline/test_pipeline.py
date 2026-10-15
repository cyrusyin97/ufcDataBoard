import io
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
sys.path.insert(0, str(Path('scripts/pipeline').resolve()))
from common import atomic_json, file_digest, read_json
from export_data import prepare, validate_config, inches, date_value
from media import collect, inspect, Network, variants, check_url

A, B, C = 'a' * 16, 'b' * 16, 'c' * 16


def fixture(root):
    db = root / 'fixture.db'
    c = sqlite3.connect(db)
    c.executescript('''
      CREATE TABLE fighters(id TEXT PRIMARY KEY,name TEXT,url TEXT,nickname TEXT,wins INTEGER,losses INTEGER,draws INTEGER,no_contests INTEGER,height TEXT,reach TEXT,dob TEXT,stance TEXT,scraped_at TEXT);
      CREATE TABLE events(id INTEGER PRIMARY KEY,name TEXT,date TEXT,url TEXT,ufcstats_id TEXT,location TEXT);
      CREATE TABLE fights(id TEXT,fighter_id TEXT,event_id INTEGER,opponent TEXT,result TEXT,method TEXT,round INTEGER,time TEXT,fight_url TEXT);
      CREATE TABLE fight_details(id TEXT);
    ''')
    for fid, name in [(A, 'Same Name'), (B, 'Same Name'), (C, 'Unranked Fighter')]:
        c.execute('insert into fighters values(?,?,?,?,?,?,?,?,?,?,?,?,?)',
                  (fid, name, 'http://ufcstats.com/statistics/fighters/' + fid, None, 3, 1, 0, 0,
                   "5' 11\"" if fid == A else '--', '72"' if fid == A else None, 'Jan 01, 1990', '--', None))
    c.execute('insert into events values(1,?,?,?,?,?)', ('Fixture Event', 'Oct. 01, 2026', 'http://ufcstats.com/event-details/' + A, A, None))
    for fid, opponent, outcome in [(A, B, 'win'), (B, A, 'loss')]:
        c.execute('insert into fights values(?,?,?,?,?,?,?,?,?)', (A, fid, 1, 'Same Name', outcome, 'U-DEC', 3, '5:00', 'http://ufcstats.com/fight-details/' + A))
    c.execute('insert into fight_details values(?)', (A,))
    c.commit();c.close()
    divisions = []
    for key in ['featherweight', 'lightweight', 'womens-strawweight']:
        divisions.append({'id': key, 'label': key, 'weightLb': 115, 'publicationState': 'published', 'snapshotAt': '2026-10-14', 'sourceUrl': 'https://www.ufc.com/rankings', 'defaultFighterId': A,
                          'entries': [{'fighterId': A, 'rank': 0, 'isChampion': True}, {'fighterId': B, 'rank': 1, 'isChampion': False}]})
    config = {'schemaVersion': 1, 'defaultDivisionId': 'featherweight', 'divisions': divisions, 'mappings': [
        {'fighterId': A, 'ufcSlug': 'same-name', 'sourcePageUrl': 'https://www.ufc.com/athlete/same-name', 'matchState': 'reviewed', 'capturedAt': '2026-10-14', 'observations': {'careerRecord': '9-1-0', 'bio': {}, 'finishCounts': {}}}]}
    config_path = root / 'config.json';atomic_json(config_path, config)
    return db, config_path


def image_bytes():
    image = Image.new('RGBA', (80, 800), (0, 0, 0, 0))
    image.paste((255, 0, 0, 255), (10, 10, 70, 790))
    buffer = io.BytesIO();image.save(buffer, 'PNG');return buffer.getvalue()


class ExportContract(unittest.TestCase):
    def test_full_archive_third_division_short_ranking_and_missing_media(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);db, config = fixture(root);before = file_digest(db)
            result = prepare(db, config, root / 'cache', root / 'reviews.json', root / 'exports', '2026-10-14')
            stage = Path(result['stage']);profile = read_json(stage / 'fighters' / (C + '.json'))
            self.assertEqual(result['counts']['fighters'], 3)
            self.assertEqual(result['counts']['records'], 2)
            self.assertEqual(result['counts']['divisions'], 3)
            self.assertEqual(profile['records'], [])
            self.assertIsNone(profile['profile']['heightCm'])
            self.assertIsNone(profile['profile']['ufcSlug'])
            self.assertEqual(read_json(stage / 'media.json')['fighters'][C], {'headshot': None, 'half_body': None, 'full_body': None})
            self.assertEqual(before, file_digest(db))
            self.assertEqual(read_json(stage / 'conflicts.json')['observations'][0]['field'], 'careerRecord')
            a = read_json(stage / 'fighters' / (A + '.json'))
            self.assertEqual(a['profile']['careerRecord']['wins'], 3)
            self.assertEqual(a['records'][0]['opponentId'], B)
            self.assertAlmostEqual(a['profile']['heightCm'], 180.34)

    def test_invalid_mapping_fails_before_publication(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);db, config = fixture(root)
            bad = read_json(config);bad['divisions'][0]['entries'][0]['fighterId'] = 'f' * 16;atomic_json(config, bad)
            with self.assertRaises(ValueError): prepare(db, config, root / 'cache', root / 'reviews.json', root / 'exports', '2026-10-14')
            self.assertFalse((root / 'exports' / 'latest-stage.json').exists())

    def test_publication_failure_and_repeat_preserve_current_release(self):
        import os, subprocess
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);db, config = fixture(root)
            command = [os.environ.get('UFC_NODE', 'node'), 'scripts/run-data.ts', 'export', '--db', str(db), '--config', str(config), '--reviews', str(root / 'absent.json'), '--cache', str(root / 'cache'), '--output', str(root / 'stages'), '--as-of', '2026-10-14', '--publish-root', str(root / 'public')]
            env = dict(os.environ, UFC_PYTHON=sys.executable)
            first = subprocess.run(command, capture_output=True, text=True, env=env)
            self.assertEqual(first.returncode, 0, first.stderr)
            pointer = (root / 'public' / 'current.json').read_bytes()
            second = subprocess.run(command, capture_output=True, text=True, env=env)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertEqual(pointer, (root / 'public' / 'current.json').read_bytes())
            version = json.loads(pointer)['datasetVersion']
            private_file = root / 'public' / 'v1' / version / 'source.db'
            private_file.write_bytes(b'forbidden source')
            privacy = subprocess.run([os.environ.get('UFC_NODE', 'node'), 'scripts/check-data.ts', str(private_file.parent)], capture_output=True, text=True)
            self.assertNotEqual(privacy.returncode, 0)
            private_file.unlink()
            damaged = read_json(config);damaged['mappings'][0]['fighterId'] = 'f' * 16;atomic_json(config, damaged)
            failure = subprocess.run(command, capture_output=True, text=True, env=env)
            self.assertNotEqual(failure.returncode, 0)
            self.assertEqual(pointer, (root / 'public' / 'current.json').read_bytes())
            self.assertFalse((root / 'public' / '.publish-lock').exists())

    def test_export_does_not_sum_career_totals_from_bouts(self):
        self.assertEqual(inches('--'), None)
        self.assertEqual(inches("5' 11\""), 71)
        self.assertEqual(date_value('Oct. 14, 2026'), '2026-10-14')
        self.assertIsNone(date_value('--'))


class MediaContract(unittest.TestCase):
    def test_decode_uses_content_and_rejects_truncated_images(self):
        payload = image_bytes();self.assertEqual(inspect(payload)['encoding'], 'PNG')
        with self.assertRaises(Exception): inspect(payload[:40])
        with self.assertRaises(Exception): inspect(b'<html>Forbidden</html>')

    def test_headshot_variants_retain_native_resolution(self):
        image = Image.new('RGB', (520, 325), 'gray')
        data = io.BytesIO();image.save(data, 'PNG')
        with tempfile.TemporaryDirectory() as folder:
            outputs = variants(data.getvalue(), 'headshot', folder)
            self.assertEqual([(item['width'], item['height']) for item in outputs], [(160, 100), (320, 200), (520, 325)])

    def test_variant_preserves_alpha_aspect_and_does_not_enlarge(self):
        with tempfile.TemporaryDirectory() as folder:
            outputs = variants(image_bytes(), 'full_body', folder)
            self.assertEqual(len(outputs), 1)
            with Image.open(Path(folder) / outputs[0]['file']) as image:
                self.assertEqual(image.size, (80, 800));self.assertEqual(image.getchannel('A').getextrema(), (0, 255))

    def test_resume_304_missing_cache_and_failure_preserve_previous_asset(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);seed = root / 'seed.png';seed.write_bytes(image_bytes())
            config = root / 'source.json';atomic_json(config, {'sources': [{'fighterId': A, 'role': 'full_body', 'sourceUrl': 'https://ufc.com/images/test.png', 'seedFile': str(seed)}]})
            cache = root / 'cache';initial = collect(config, cache)
            with patch('media.Network') as network:
                collect(config, cache);network.assert_not_called()
            class Fake:
                def __init__(self, root): self.calls = []
                def load_policy(self): pass
                def get(self, url, validators=None): return (None, {'status': 304}) if validators else (image_bytes(), {'status': 200, 'mime': 'image/png'})
            initial['assets'][A + ':full_body']['accept'] = 'image/webp,image/png;q=0.9,image/jpeg;q=0.8'
            initial['assets'][A + ':full_body']['etag'] = 'known';atomic_json(cache / 'receipt.json', initial)
            with patch('media.Network', Fake):
                updated = collect(config, cache, True);self.assertEqual(updated['assets'][A + ':full_body']['status'], 304)
                (cache / updated['assets'][A + ':full_body']['file']).unlink()
                recovered = collect(config, cache, True);self.assertEqual(recovered['assets'][A + ':full_body']['status'], 200)
                cached_file = cache / recovered['assets'][A + ':full_body']['file']
                cached_file.write_bytes(b'corrupt cached image')
                recovered = collect(config, cache, True)
                self.assertEqual(file_digest(cached_file), recovered['assets'][A + ':full_body']['sha256'])
                self.assertEqual(recovered['assets'][A + ':full_body']['bytes'], len(image_bytes()))
            class Failed(Fake):
                def get(self, url, validators=None): raise ValueError('HTTP 403')
            with patch('media.Network', Failed):
                failed = collect(config, cache, True)
                self.assertEqual(failed['assets'][A + ':full_body']['sha256'], recovered['assets'][A + ':full_body']['sha256'])
                self.assertIn(A + ':full_body', failed['failures'])

    def test_roles_require_geometry_and_hash_matched_reviews(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);seed = root / 'head.png';image = Image.new('RGB', (520, 325));image.save(seed)
            config = root / 'source.json';atomic_json(config, {'sources': [{'fighterId': A, 'role': 'full_body', 'sourceUrl': 'https://ufc.com/images/test.png', 'seedFile': str(seed)}]})
            receipt = collect(config, root / 'cache')
            self.assertEqual(receipt['assets'], {});self.assertTrue(receipt['failures'])

    def test_indexed_png_transparency_survives_variants(self):
        with tempfile.TemporaryDirectory() as folder:
            image = Image.new('P', (80, 100), 0)
            image.putpalette([0, 0, 0, 255, 0, 0] + [0] * (768 - 6));image.paste(1, (10, 10, 70, 90))
            buffer = io.BytesIO();image.save(buffer, 'PNG', transparency=0)
            data = buffer.getvalue();self.assertEqual(inspect(data)['alphaRange'], [0, 255])
            output = variants(data, 'headshot', folder)[0]
            with Image.open(Path(folder) / output['file']) as decoded:
                self.assertEqual(decoded.getchannel('A').getextrema(), (0, 255))

    def test_robots_failure_stops_the_network_queue(self):
        from media import PolicyUnavailable
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);config = root / 'source.json'
            atomic_json(config, {'sources': [{'fighterId': fid, 'role': 'full_body', 'sourceUrl': 'https://ufc.com/images/test.png'} for fid in [A, B]]})
            with patch('media.Network') as network:
                network.return_value.load_policy.side_effect = PolicyUnavailable('Unavailable')
                receipt = collect(config, root / 'cache')
                network.assert_called_once();network.return_value.get.assert_not_called()
                self.assertEqual(len(receipt['failures']), 1)

    def test_changed_source_retains_reviewed_history_and_uses_actual_webp_extension(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);seed = root / 'wrong.png'
            image = Image.new('RGBA', (80, 800), (0, 255, 0, 128))
            image.save(seed, format='WEBP')
            config = root / 'source.json';atomic_json(config, {'sources': [{'fighterId': A, 'role': 'full_body', 'sourceUrl': 'https://ufc.com/images/first.png', 'seedFile': str(seed)}]})
            first = collect(config, root / 'cache');asset = first['assets'][A + ':full_body']
            self.assertEqual(asset['encoding'], 'WEBP');self.assertTrue(asset['file'].endswith('.webp'))
            settings = read_json(config);settings['sources'][0]['sourceUrl'] = 'https://ufc.com/images/second.png';atomic_json(config, settings)
            seed.write_bytes(image_bytes())
            second = collect(config, root / 'cache')
            self.assertEqual(second['history'][A + ':full_body'][0]['sha256'], asset['sha256'])
            self.assertNotEqual(second['assets'][A + ':full_body']['sha256'], asset['sha256'])

    def test_retry_after_and_non_image_responses(self):
        import urllib.error
        from email.message import Message
        class Response:
            url = 'https://ufc.com/images/test.png'
            def __init__(self, mime):
                self.headers = Message();self.headers['Content-Type'] = mime;self.buffer = io.BytesIO(image_bytes())
            def read(self, size): return self.buffer.read(size)
            def __enter__(self): return self
            def __exit__(self, *args): pass
        class Opener:
            def __init__(self): self.count = 0
            def open(self, request, timeout):
                self.count += 1
                if self.count == 1:
                    headers = Message();headers['Retry-After'] = '17'
                    raise urllib.error.HTTPError(request.full_url, 429, 'Limited', headers, None)
                return Response('image/png')
        network = Network('unused');network.opener = Opener();network.wait = lambda: None
        with patch('media.time.sleep') as sleep:
            data, response = network.get('https://ufc.com/images/test.png')
            self.assertEqual(response['status'], 200);sleep.assert_any_call(17)
        network.opener.open = lambda *args, **kwargs: Response('text/html')
        with self.assertRaises(ValueError): network.get('https://ufc.com/images/test.png')

    def test_long_retry_after_stops_without_an_early_retry(self):
        import urllib.error
        from email.message import Message
        from media import RateLimited
        class Opener:
            def open(self, request, timeout):
                headers = Message();headers['Retry-After'] = '600'
                raise urllib.error.HTTPError(request.full_url, 429, 'Limited', headers, None)
        network = Network('unused');network.opener = Opener();network.wait = lambda: None
        with patch('media.time.sleep') as sleep:
            with self.assertRaises(RateLimited) as raised: network.get('https://ufc.com/images/test.png')
            self.assertEqual(raised.exception.seconds, 600);sleep.assert_not_called()

    def test_robot_agent_groups_use_the_specific_rules(self):
        class Response:
            def read(self, size): return b'User-agent: *\nDisallow: /general\nCrawl-delay: 15\n\nUser-agent: UFC-Rankings-Media\nDisallow: /images/blocked*\nCrawl-delay: 23\n'
            def __enter__(self): return self
            def __exit__(self, *args): pass
        class Opener:
            def open(self, request, timeout): return Response()
        with tempfile.TemporaryDirectory() as folder:
            network = Network(folder);network.opener = Opener();network.wait = lambda: None;network.load_policy()
            self.assertEqual(network.delay, 23)
            self.assertFalse(network.allowed('https://ufc.com/images/blocked.png'))
            self.assertTrue(network.allowed('https://ufc.com/general'))

    def test_sitemap_parsing_does_not_depend_on_directory_queries(self):
        from discover import sitemap_urls
        kind, urls = sitemap_urls(b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.ufc.com/athlete/example</loc></url></urlset>')
        self.assertEqual(kind, 'urlset');self.assertEqual(len(urls), 1)

    def test_unapproved_redirect_target_and_robots_wildcards(self):
        with self.assertRaises(ValueError): check_url('https://ufc.com@127.0.0.1/image.png')
        import re
        network = Network('unused');network.rules = [('/athletes/all?*', re.compile(r'^/athletes/all\?.*'), False)]
        self.assertFalse(network.allowed('https://www.ufc.com/athletes/all?page=1'))
        self.assertTrue(network.allowed('https://www.ufc.com/sitemap.xml?page=1'))


if __name__ == '__main__': unittest.main()
