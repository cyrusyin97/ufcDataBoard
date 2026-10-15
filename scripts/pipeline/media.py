import argparse
import io
import json
import re
import time
import warnings
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

from PIL import Image, ImageOps, ImageCms, features
from common import atomic_json, digest, file_digest, read_json

ACCEPT = 'image/webp,image/png;q=0.9,image/jpeg;q=0.8'
HEADERS = {'User-Agent': 'UFC-Rankings-Media/1.0', 'Accept': ACCEPT}
HOSTS = {'ufc.com', 'www.ufc.com'}
MAX_BYTES = 25 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 50_000_000
EXTENSIONS = {'PNG': 'png', 'JPEG': 'jpg', 'WEBP': 'webp', 'AVIF': 'avif'}
TRANSFORM_VERSION = 'webp-q85-lanczos-v2-headshot520'


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def check_url(url):
    try:
        p = urlsplit(url)
        if p.scheme != 'https' or p.hostname not in HOSTS or p.port not in (None, 443) or p.username or p.password:
            raise ValueError('Unapproved media URL')
    except ValueError:
        raise ValueError('Unapproved media URL') from None
    return url


def inspect(data):
    if len(data) > MAX_BYTES:
        raise ValueError('Image exceeds the byte limit')
    with warnings.catch_warnings():
        warnings.simplefilter('error', Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(data)) as im:
            if im.format not in EXTENSIONS or getattr(im, 'n_frames', 1) != 1:
                raise ValueError('Unsupported image encoding or animation')
            encoding = im.format
            im.verify()
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            if im.width * im.height > 50_000_000 or min(im.size) < 32:
                raise ValueError('Invalid image dimensions')
            alpha = im.convert('RGBA').getchannel('A') if 'A' in im.getbands() or 'transparency' in im.info else None
            return {'encoding': encoding, 'width': im.width, 'height': im.height,
                    'alphaRange': list(alpha.getextrema()) if alpha else None,
                    'alphaBounds': list(alpha.getbbox()) if alpha and alpha.getbbox() else None}


class RateLimited(ValueError):
    def __init__(self, seconds):
        self.seconds = seconds
        super().__init__('The site queue is paused by Retry-After')


class PolicyUnavailable(ValueError):
    pass


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections = 3
    max_repeats = 3
    def __init__(self, controller):
        self.controller = controller
        super().__init__()

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not self.controller.allowed(newurl):
            raise ValueError('Robots policy blocks the redirect')
        self.controller.wait()
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected and req.full_url != newurl:
            redirected.remove_header('If-none-match')
            redirected.remove_header('If-modified-since')
        return redirected


class Network:
    def __init__(self, cache_root):
        self.root = Path(cache_root)
        self.opener = urllib.request.build_opener(SafeRedirect(self))
        self.last = 0
        self.delay = 15
        self.rules = []
        self.parser = None

    def wait(self):
        time.sleep(max(0, self.delay - (time.monotonic() - self.last)))
        self.last = time.monotonic()

    def load_policy(self):
        self.wait()
        try:
            with self.opener.open(urllib.request.Request('https://www.ufc.com/robots.txt', headers=HEADERS), timeout=30) as response:
                body = response.read(65537)
                if len(body) > 65536 or body.lstrip().startswith(b'<'):
                    raise ValueError('Invalid robots response')
        except Exception as error:
            raise PolicyUnavailable('Robots policy could not be checked') from error
        lines = body.decode().splitlines()
        groups = []
        group = {'agents': [], 'rules': [], 'delays': []}
        for line in lines:
            line = line.split('#')[0].strip()
            if ':' not in line: continue
            key, value = [part.strip() for part in line.split(':', 1)]
            key = key.lower()
            if key == 'user-agent':
                if group['rules'] or group['delays']:
                    groups.append(group);group = {'agents': [], 'rules': [], 'delays': []}
                group['agents'].append(value.lower())
            elif key in ('allow', 'disallow') and value:
                group['rules'].append((value, key == 'allow'))
            elif key == 'crawl-delay':
                try: group['delays'].append(float(value))
                except ValueError: pass
        groups.append(group)
        agent = HEADERS['User-Agent'].lower()
        matching = []
        for group in groups:
            scores = [0 if value == '*' else len(value) for value in group['agents'] if value == '*' or agent.startswith(value)]
            if scores: matching.append((max(scores), group))
        specificity = max([score for score, _ in matching], default=-1)
        self.rules = []
        for score, group in matching:
            if score != specificity: continue
            self.delay = max([self.delay] + group['delays'])
            for value, allowed in group['rules']:
                pattern = '^' + re.escape(value).replace(r'\*', '.*').replace(r'\$', '$')
                self.rules.append((value, re.compile(pattern), allowed))
        self.root.mkdir(parents=True, exist_ok=True)
        (self.root / 'robots.txt').write_bytes(body)

    def allowed(self, url):
        check_url(url)
        p = urlsplit(url)
        target = p.path + ('?' + p.query if p.query else '')
        matches = [r for r in self.rules if r[1].search(target)]
        return max(matches, key=lambda r: (len(r[0]), r[2]))[2] if matches else True

    def get(self, url, validators=None, kind="image"):
        if not self.allowed(url):
            raise ValueError('Robots policy blocks this URL')
        headers = dict(HEADERS)
        if kind == "document": headers["Accept"] = "application/xml,text/xml,text/html,application/json;q=0.9"
        headers.update(validators or {})
        for attempt in range(3):
            self.wait()
            try:
                with self.opener.open(urllib.request.Request(url, headers=headers), timeout=30) as response:
                    check_url(response.url)
                    mime = response.headers.get_content_type()
                    if kind == 'image' and not mime.startswith('image/'):
                        raise ValueError('The response is not an image')
                    chunks, size = [], 0
                    while True:
                        chunk = response.read(min(65536, MAX_BYTES + 1 - size))
                        if not chunk:
                            break
                        size += len(chunk)
                        if size > MAX_BYTES:
                            raise ValueError('Image exceeds the byte limit')
                        chunks.append(chunk)
                    return b''.join(chunks), {'status': 200, 'mime': mime, 'finalUrl': response.url,
                        'etag': response.headers.get('ETag'), 'lastModified': response.headers.get('Last-Modified'),
                        'vary': response.headers.get('Vary')}
            except urllib.error.HTTPError as error:
                if error.code == 304:
                    return None, {'status': 304}
                if error.code == 429:
                    retry = error.headers.get('Retry-After', '60')
                    try: pause = float(retry)
                    except ValueError:
                        from email.utils import parsedate_to_datetime
                        try: pause = max(0, parsedate_to_datetime(retry).timestamp() - time.time())
                        except (ValueError, TypeError): pause = 60
                    if pause > 300 or attempt == 2:
                        raise RateLimited(max(pause, self.delay))
                    time.sleep(max(pause, self.delay))
                elif error.code not in (500, 502, 503, 504):
                    raise
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
            except (TimeoutError, urllib.error.URLError):
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        raise ValueError('No media response')


def cache_asset(root, source, data, response=None):
    root = Path(root)
    info = inspect(data)
    expected_mime = {'PNG': 'image/png', 'JPEG': 'image/jpeg', 'WEBP': 'image/webp', 'AVIF': 'image/avif'}[info['encoding']]
    if response and response.get('mime') != expected_mime:
        raise ValueError('MIME disagrees with decoded encoding')
    hash_value = digest(data)
    path = root / 'objects' / (hash_value + '.' + EXTENSIONS[info['encoding']])
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or file_digest(path) != hash_value:
        temp = path.with_suffix('.pending')
        temp.write_bytes(data)
        temp.replace(path)
    return dict(source, **info, sha256=hash_value, bytes=len(data), file=str(path.relative_to(root)),
                accept=ACCEPT if response else None, checkedAt=timestamp(), **(response or {'status': 200, 'origin': 'local_seed'}))


def collect(config_path, cache_root, refresh=False):
    sources = read_json(config_path)['sources']
    root = Path(cache_root)
    receipt_path = root / 'receipt.json'
    receipt = read_json(receipt_path) if receipt_path.exists() else {'assets': {}, 'failures': {}}
    network = None
    if receipt.get('blockedUntil', 0) > time.time():
        print('The site queue remains paused by Retry-After', flush=True)
        return receipt
    receipt.pop('blockedUntil', None)
    for source in sources:
        key = source['fighterId'] + ':' + source['role']
        previous = receipt['assets'].get(key)
        valid = previous and previous.get('sourceUrl') == source['sourceUrl'] and (root / previous['file']).exists() and file_digest(root / previous['file']) == previous['sha256']
        if valid and not refresh:
            continue
        try:
            if source.get('seedFile') and Path(source['seedFile']).exists() and not refresh:
                asset = cache_asset(root, {k: v for k, v in source.items() if k != 'seedFile'}, Path(source['seedFile']).read_bytes())
            else:
                if network is None:
                    candidate_network = Network(root)
                    candidate_network.load_policy()
                    network = candidate_network
                validators = {}
                if valid and previous.get('accept') == ACCEPT:
                    if previous.get('etag'): validators['If-None-Match'] = previous['etag']
                    elif previous.get('lastModified'): validators['If-Modified-Since'] = previous['lastModified']
                payload, response = network.get(source['sourceUrl'], validators)
                if response['status'] == 304 and valid:
                    asset = dict(previous, checkedAt=timestamp(), status=304)
                else:
                    if payload is None:
                        payload, response = network.get(source['sourceUrl'])
                    asset = cache_asset(root, {k: v for k, v in source.items() if k != 'seedFile'}, payload, response)
            if source['role'] == 'full_body' and (asset['height'] < 700 or asset['height'] / asset['width'] < 1.2):
                raise ValueError('Full-body candidate failed geometry screening')
            if previous and previous['sha256'] != asset['sha256']:
                receipt.setdefault('history', {}).setdefault(key, []).append(previous)
            receipt['assets'][key] = asset
            receipt['failures'].pop(key, None)
            print('COLLECTED', key, asset['encoding'], asset['width'], asset['height'], flush=True)
        except Exception as error:
            receipt['failures'][key] = {'sourceUrl': source['sourceUrl'], 'error': str(error), 'checkedAt': timestamp()}
            print('FAILED', key, str(error), flush=True)
            if isinstance(error, RateLimited):
                receipt['blockedUntil'] = time.time() + error.seconds
            if isinstance(error, (PolicyUnavailable, RateLimited)):
                atomic_json(receipt_path, receipt)
                break
        atomic_json(receipt_path, receipt)
    return receipt


def variants(data, role, output):
    outputs = []
    bounds = {'headshot': [(160, 100), (320, 200), (520, 325)], 'half_body': [(320, 10000), (460, 10000)], 'full_body': [(10000, 900), (10000, 1800)]}[role]
    with Image.open(io.BytesIO(data)) as source:
        source.load()
        image = ImageOps.exif_transpose(source)
        has_alpha = 'A' in source.getbands() or 'transparency' in source.info
        if has_alpha: image = image.convert('RGBA')
        if source.info.get('icc_profile'):
            profile = ImageCms.ImageCmsProfile(io.BytesIO(source.info['icc_profile']))
            image = ImageCms.profileToProfile(image, profile, ImageCms.createProfile('sRGB'), outputMode='RGBA' if 'A' in image.getbands() else 'RGB')
        image = image.convert('RGBA' if has_alpha else 'RGB')
        seen = set()
        for bound in bounds:
            variant = image.copy()
            variant.thumbnail(bound, Image.Resampling.LANCZOS)
            if variant.size in seen:
                continue
            seen.add(variant.size)
            buffer = io.BytesIO()
            variant.save(buffer, format='WEBP', quality=85, method=6)
            payload = buffer.getvalue()
            hash_value = digest(payload)
            path = Path(output) / (hash_value + '.webp')
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
            outputs.append({'file': path.name, 'width': variant.width, 'height': variant.height,
                'bytes': len(payload), 'sha256': hash_value, 'mime': 'image/webp'})
    return outputs


def cached_variants(data, role, cache_root, output):
    import shutil
    cache_version = TRANSFORM_VERSION if role == 'headshot' else 'webp-q85-lanczos-v1'
    cache = Path(cache_root) / 'variants' / (digest(data) + '-' + role + '-' + cache_version)
    receipt = cache / 'variants.json'
    cached = read_json(receipt) if receipt.exists() else []
    if not cached or any(not (cache / item['file']).exists() or file_digest(cache / item['file']) != item['sha256'] for item in cached):
        cache.mkdir(parents=True, exist_ok=True)
        cached = variants(data, role, cache)
        atomic_json(receipt, cached)
    Path(output).mkdir(parents=True, exist_ok=True)
    for item in cached:
        shutil.copyfile(cache / item['file'], Path(output) / item['file'])
    return cached


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default='data/config/media-sources.json')
    parser.add_argument('--cache', default='work/media')
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    if not features.check('webp') or not features.check('avif'):
        parser.error('The media environment needs WebP and AVIF decoding')
    receipt = collect(args.config, args.cache, args.refresh)
    print(json.dumps({'assets': len(receipt['assets']), 'failures': len(receipt['failures'])}))
    if receipt['failures']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
