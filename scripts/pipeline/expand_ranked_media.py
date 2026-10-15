"""Collect private media candidates for ranked fighters outside published divisions."""
import argparse
import datetime as dt
import json
import re
import sqlite3
import sys
import time
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'research'))
from common import atomic_json, file_digest
from export_data import age, date_value, inches
from media import Network, PolicyUnavailable, RateLimited, cache_asset
from media_candidates import extract_candidates


class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []
        self.parts = []

    def text(self):
        return ' '.join(' '.join(self.parts).split())

    def find(self, class_name):
        return [node for node in self.walk() if class_name in node.attrs.get('class', '').split()]

    def walk(self):
        yield self
        for child in self.children:
            yield from child.walk()


class Tree(HTMLParser):
    def __init__(self, body):
        super().__init__()
        self.root = Node()
        self.current = self.root
        self.feed(body)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in ('img', 'meta', 'link', 'input', 'br', 'hr', 'source', 'wbr', 'area', 'embed'):
            self.current = node

    def handle_endtag(self, tag):
        node = self.current
        while node.parent:
            if node.tag == tag:
                self.current = node.parent
                return
            node = node.parent

    def handle_data(self, data):
        node = self.current
        while node:
            node.parts.append(data)
            node = node.parent


def norm(value):
    value = value.translate(str.maketrans({'ł': 'l', 'Ł': 'L'}))
    ascii_value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode()
    return re.sub('[^a-z0-9]', '', ascii_value.lower())


def ranking_candidates(body, excluded_labels):
    divisions = {}
    for group in Tree(body).root.find('view-grouping'):
        ancestor = group.parent
        primary = False
        while ancestor:
            primary |= 'view-display-id-block_1' in ancestor.attrs.get('class', '').split()
            ancestor = ancestor.parent
        if not primary:
            continue
        headings = group.find('view-grouping-header')
        if not headings:
            continue
        label = headings[0].text()
        if 'Pound-for-Pound' in label or label in excluded_labels:
            continue
        tables = [node for node in group.walk() if node.tag == 'table']
        if not tables:
            continue
        entries = []
        for node in tables[0].walk():
            if node.tag != 'a' or not node.attrs.get('href', '').startswith('/athlete/'):
                continue
            parent = node.parent
            champion = parent and parent.tag == 'h5'
            ranked = parent and 'views-field-title' in parent.attrs.get('class', '').split()
            if not (champion or ranked):
                continue
            url = urljoin('https://www.ufc.com', node.attrs['href'])
            if urlsplit(url).query or urlsplit(url).fragment:
                raise ValueError('Unexpected athlete ranking URL')
            if any(item['pageUrl'] == url for item in entries):
                raise ValueError('Duplicate athlete in one division')
            entries.append({'name': node.text(), 'pageUrl': url})
        if not entries:
            raise ValueError('Empty ranking division: ' + label)
        division = {'label': label, 'entries': entries}
        if label in divisions and divisions[label] != division:
            raise ValueError('Duplicate division layouts disagree: ' + label)
        divisions[label] = division
    if not divisions:
        raise ValueError('No additional weight divisions found')
    return list(divisions.values())


def observations(body):
    tree = Tree(body).root

    def text(class_name):
        nodes = tree.find(class_name)
        return nodes[0].text() if nodes else ''

    bio, stats = {}, {}
    for class_name, target, label, value in [
        ('c-bio__field', bio, 'c-bio__label', 'c-bio__text'),
        ('hero-profile__stat', stats, 'hero-profile__stat-text', 'hero-profile__stat-numb'),
    ]:
        for node in tree.find(class_name):
            labels, values = node.find(label), node.find(value)
            if labels and values:
                target[labels[0].text()] = values[0].text()
    return {
        'name': text('hero-profile__name'),
        'careerRecord': text('hero-profile__division-body').split(' ')[0],
        'bio': bio,
        'finishCounts': stats,
    }


def identity_mapping(row, db, observed, captured_at):
    if norm(observed['name']) != norm(row['name']):
        raise ValueError('Profile name mismatch: ' + observed['name'])
    facts = []
    for field, label in [('height', 'Height'), ('reach', 'Reach')]:
        stored, source = inches(db[field]), inches(observed['bio'].get(label))
        if stored is not None and source is not None and abs(stored - source) <= 1:
            facts.append(field + ' agrees within one inch')
    stored_age = age(date_value(db['dob']), captured_at)
    source_age = observed['bio'].get('Age', '').strip()
    if stored_age is not None and source_age.isdigit() and abs(stored_age - int(source_age)) <= 1:
        facts.append('age agrees within one year')
    stored_record = f"{db['wins']}-{db['losses']}-{db['draws']}"
    if observed['careerRecord'] == stored_record:
        facts.append('career record agrees')
    if len(facts) < 2:
        raise ValueError('Identity needs biography review: ' + json.dumps(observed))
    return {
        'fighterId': db['id'],
        'ufcSlug': row['pageUrl'].rsplit('/', 1)[-1],
        'sourcePageUrl': row['pageUrl'],
        'matchState': 'reviewed',
        'matchEvidence': ['Unique normalized database name and matching official profile heading.'] + facts,
        'capturedAt': captured_at,
        'observations': observed,
    }


def role_sources(body, mapping):
    candidates = extract_candidates(body, mapping['sourcePageUrl'])
    sources, missing = [], []
    for role, methods in [
        ('half_body', ['hero_image']),
        ('full_body', ['derived_hero_path']),
        ('headshot', ['social_metadata', 'event_image']),
    ]:
        match = next((candidate for method in methods for candidate in candidates if candidate['method'] == method), None)
        if match:
            sources.append({
                'fighterId': mapping['fighterId'], 'role': role,
                'sourceUrl': match['url'], 'pageUrl': mapping['sourcePageUrl'], 'method': match['method'],
            })
        else:
            missing.append(role)
    return sources, missing


def collect_ranked(db_path, config_path, output, cache, retry_failures=False, export_as_of=None):
    output, cache = Path(output), Path(cache)
    output.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    config = json.loads(Path(config_path).read_text())
    receipt_path = cache / 'receipt.json'
    receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else {'assets': {}, 'failures': {}}
    if receipt.get('blockedUntil', 0) > time.time():
        raise ValueError('Network queue remains paused')
    network = Network(output)
    network.load_policy()
    ranking_page = output / 'rankings.html'
    if not ranking_page.exists():
        payload, response = network.get('https://www.ufc.com/rankings', kind='document')
        if response['mime'] != 'text/html':
            raise ValueError('Rankings response is not HTML')
        ranking_page.write_bytes(payload)
    published_labels = {
        division['label'] for division in config['divisions'] if division['publicationState'] == 'published'
    }
    divisions = ranking_candidates(ranking_page.read_text(), published_labels)
    atomic_json(output / 'ranking-candidates.json', divisions)
    with sqlite3.connect(Path(db_path).resolve().as_uri() + '?mode=ro', uri=True) as connection:
        connection.row_factory = sqlite3.Row
        connection.execute('PRAGMA query_only = ON')
        database_rows = [dict(row) for row in connection.execute('SELECT * FROM fighters')]
    index = {}
    for row in database_rows:
        index.setdefault(norm(row['name']), []).append(row)
    unique = {row['pageUrl']: row for division in divisions for row in division['entries']}
    state_path = output / 'progress.json'
    state = json.loads(state_path.read_text()) if state_path.exists() else {
        'mappings': {}, 'failures': {}, 'sources': {}, 'completed': [],
    }
    state['total'] = len(unique)
    state['exportAsOf'] = export_as_of
    for number, row in enumerate(unique.values(), 1):
        url, slug = row['pageUrl'], row['pageUrl'].rsplit('/', 1)[-1]
        failed = any(key == slug or key.startswith(slug + ':') for key in state['failures'])
        if slug in state['completed'] and not (retry_failures and failed):
            continue
        page = output / 'pages' / (slug + '.html')
        try:
            matches = index.get(norm(row['name']), [])
            if len(matches) != 1:
                raise ValueError('Identity requires review: ' + row['name'])
            if not page.exists():
                body, response = network.get(url, kind='document')
                if response['mime'] != 'text/html' or response['finalUrl'].rstrip('/') != url:
                    raise ValueError('Mapped page identity changed')
                page.parent.mkdir(exist_ok=True)
                page.write_bytes(body)
            body = page.read_text()
            captured_at = dt.datetime.fromtimestamp(page.stat().st_mtime, dt.timezone.utc).date().isoformat()
            mapping = identity_mapping(row, matches[0], observations(body), captured_at)
            state['mappings'][mapping['fighterId']] = mapping
            sources, missing = role_sources(body, mapping)
            for role in missing:
                state['failures'][slug + ':' + role] = 'No observed candidate'
            for source in sources:
                key = source['fighterId'] + ':' + source['role']
                state['sources'][key] = source
                previous = receipt['assets'].get(key)
                valid = previous and previous['sourceUrl'] == source['sourceUrl'] and (cache / previous['file']).exists()
                if valid and file_digest(cache / previous['file']) == previous['sha256']:
                    continue
                try:
                    request_url = source['sourceUrl'].replace('https://ufc.com/', 'https://www.ufc.com/')
                    payload, response = network.get(request_url)
                    asset = cache_asset(cache, source, payload, response)
                    if source['role'] == 'full_body' and (asset['height'] < 700 or asset['height'] / asset['width'] < 1.2):
                        raise ValueError('Full-body geometry screen failed')
                    if previous and previous['sha256'] != asset['sha256']:
                        receipt.setdefault('history', {}).setdefault(key, []).append(previous)
                    receipt['assets'][key] = asset
                    receipt['failures'].pop(key, None)
                    state['failures'].pop(slug + ':' + source['role'], None)
                    print('COLLECTED', number, '/', len(unique), row['name'], source['role'], asset['width'], asset['height'], flush=True)
                except Exception as error:
                    receipt['failures'][key] = {
                        'sourceUrl': source['sourceUrl'], 'error': str(error),
                        'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                    }
                    state['failures'][slug + ':' + source['role']] = str(error)
                    if isinstance(error, RateLimited):
                        receipt['blockedUntil'] = time.time() + error.seconds
                    if isinstance(error, (RateLimited, PolicyUnavailable)):
                        atomic_json(receipt_path, receipt)
                        raise
                    print('ROLE FAILED', row['name'], source['role'], str(error), flush=True)
                atomic_json(receipt_path, receipt)
                atomic_json(state_path, state)
            if slug not in state['completed']:
                state['completed'].append(slug)
            state['failures'].pop(slug, None)
        except Exception as error:
            state['failures'][slug] = str(error)
            print('FIGHTER FAILED', row['name'], str(error), flush=True)
            if isinstance(error, (RateLimited, PolicyUnavailable)):
                atomic_json(state_path, state)
                raise
        atomic_json(state_path, state)
    atomic_json(state_path, state)
    print('DONE', len(state['completed']), len(unique), 'failures', len(state['failures']), flush=True)
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', required=True)
    parser.add_argument('--config', default='data/config/initial.json')
    parser.add_argument('--output', default='work/media-expansion')
    parser.add_argument('--cache', default='work/media')
    parser.add_argument('--as-of', required=True)
    parser.add_argument('--retry-failures', action='store_true')
    args = parser.parse_args()
    dt.date.fromisoformat(args.as_of)
    state = collect_ranked(args.db, args.config, args.output, args.cache, args.retry_failures, args.as_of)
    if state['failures']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
