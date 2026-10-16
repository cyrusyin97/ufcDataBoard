"""Promote reviewed weight-class snapshots without network or database writes."""
import argparse
from pathlib import Path
from urllib.parse import urljoin

from common import atomic_json, file_digest, read_json
from expand_ranked_media import Tree


def extract_rankings(body):
    divisions = {}
    for group in Tree(body).root.find('view-grouping'):
        parent = group.parent
        primary = False
        while parent:
            primary |= 'view-display-id-block_1' in parent.attrs.get('class', '').split()
            parent = parent.parent
        headings = group.find('view-grouping-header')
        if not primary or not headings:
            continue
        label = headings[0].text()
        if 'Pound-for-Pound' in label:
            continue
        tables = [node for node in group.walk() if node.tag == 'table']
        if not tables:
            raise ValueError('Missing ranking table: ' + label)
        table = tables[0]
        champions = [a for h in table.walk() if h.tag == 'h5' for a in h.walk() if a.tag == 'a']
        if len(champions) != 1:
            raise ValueError('Expected one explicit champion: ' + label)
        champion = champions[0]
        entries = [{'sourcePageUrl': urljoin('https://www.ufc.com', champion.attrs['href']), 'rank': 0, 'isChampion': True}]
        for row in table.walk():
            if row.tag != 'tr':
                continue
            ranks = row.find('views-field-weight-class-rank')
            titles = row.find('views-field-title')
            if not ranks and not titles:
                continue
            links = [a for title in titles for a in title.walk() if a.tag == 'a']
            if len(ranks) != 1 or len(links) != 1 or not ranks[0].text().isdigit():
                raise ValueError('Invalid explicit rank: ' + label)
            rank = int(ranks[0].text())
            if rank < 1:
                raise ValueError('Invalid challenger rank: ' + label)
            entries.append({'sourcePageUrl': urljoin('https://www.ufc.com', links[0].attrs['href']), 'rank': rank, 'isChampion': False})
        if len({e['sourcePageUrl'] for e in entries}) != len(entries) or [e['rank'] for e in entries] != sorted(e['rank'] for e in entries):
            raise ValueError('Invalid ranking order or identity: ' + label)
        if label in divisions and divisions[label] != entries:
            raise ValueError('Duplicate layouts disagree: ' + label)
        divisions[label] = entries
    return divisions


def promote(html, snapshot_path, config_path, metadata_path):
    snapshot = read_json(snapshot_path)
    if file_digest(html) != snapshot['sourceHtmlSha256']:
        raise ValueError('Saved ranking HTML hash differs from reviewed snapshot')
    rankings = extract_rankings(Path(html).read_text())
    config = read_json(config_path)
    metadata = read_json(metadata_path)['divisions']
    if set(rankings) != {d['label'] for d in metadata}:
        raise ValueError('Weight-class coverage differs from registry metadata')
    mappings = {m['sourcePageUrl']: m for m in config['mappings'] if m['matchState'] == 'reviewed'}
    existing = {d['id']: d for d in config['divisions']}
    captured = {d['label']: d for d in snapshot['divisions']}
    divisions = []
    for meta in metadata:
        entries = [{k: v for k, v in e.items() if k != 'sourcePageUrl'} | {'fighterId': mappings[e['sourcePageUrl']]['fighterId']} for e in rankings[meta['label']]]
        if meta['id'] in existing:
            previous = existing[meta['id']]
            if entries != previous['entries']:
                raise ValueError('Existing snapshot differs: ' + meta['id'])
            divisions.append(previous)
            continue
        reviewed = captured[meta['label']]['entries']
        if [e['fighterId'] for e in entries] != [e['fighterId'] for e in reviewed]:
            raise ValueError('Membership differs from reviewed media snapshot')
        divisions.append(dict(meta, entries=entries, defaultFighterId=entries[0]['fighterId'], publicationState='published', sourceUrl=snapshot['sourceUrl'], snapshotAt=snapshot['capturedAt'][:10]))
    config['divisions'] = divisions
    atomic_json(config_path, config)
    return len(divisions)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--html', default='work/media-expansion/rankings.html')
    parser.add_argument('--snapshot', default='data/config/ranked-media-snapshot.json')
    parser.add_argument('--config', default='data/config/initial.json')
    parser.add_argument('--metadata', default='data/config/division-metadata.json')
    args = parser.parse_args()
    print('Published division configurations:', promote(args.html, args.snapshot, args.config, args.metadata))
