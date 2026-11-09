import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/pipeline'))
from reuse_media import reuse_media


class ReuseMediaTests(unittest.TestCase):
    def test_verified_variant_reuse_and_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, target = root / 'source', root / 'target'
            (source / 'media').mkdir(parents=True)
            image = source / 'media/image.webp'
            image.write_bytes(b'verified-derivative')
            manifest = {'datasetVersion': 'old', 'files': {'media/image.webp': {
                'bytes': image.stat().st_size, 'sha256': hashlib.sha256(image.read_bytes()).hexdigest()}}}
            asset = {'role': 'headshot', 'sourceSha256': 'reviewed',
                     'variants': [{'url': '/data/v1/old/media/image.webp'}]}
            (source / 'manifest.json').write_text(json.dumps(manifest))
            (source / 'media.json').write_text(json.dumps({'datasetVersion': 'old',
                'fighters': {'fighter': {'headshot': asset}}}))
            reviews = {'fighter:headshot': {'state': 'approved', 'sha256': 'reviewed'}}
            args = (source, target, reviews, {'fighter'}, {'fighter'})
            result = reuse_media(*args)
            self.assertEqual((target / 'media/image.webp').read_bytes(), image.read_bytes())
            self.assertEqual(result['fighter']['headshot']['variants'][0]['path'], 'media/image.webp')
            reviews['fighter:headshot']['sha256'] = 'changed'
            with self.assertRaisesRegex(ValueError, 'reviewed identity'):
                reuse_media(*args)
            reviews['fighter:headshot']['sha256'] = 'reviewed'
            reviews['fighter:full_body'] = {'state': 'approved', 'sha256': 'missing'}
            with self.assertRaisesRegex(ValueError, 'cover all approved'):
                reuse_media(*args)
            del reviews['fighter:full_body']
            image.write_bytes(b'corrupted')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                reuse_media(*args)
