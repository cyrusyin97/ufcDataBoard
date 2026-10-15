import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from common import atomic_json, read_json
from media import Network

NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'


def sitemap_urls(payload):
    root = ET.fromstring(payload)
    return root.tag.split('}')[-1], [element.text for element in root.findall('.//' + NS + 'loc') if element.text]


def discover(output, max_pages):
    output = Path(output);output.mkdir(parents=True, exist_ok=True)
    checkpoint = output / 'discovery.json'
    state = read_json(checkpoint) if checkpoint.exists() else {'visited': [], 'athleteUrls': []}
    network = Network(output);network.load_policy()
    body, response = network.get('https://www.ufc.com/sitemap.xml', kind='document')
    kind, queue = sitemap_urls(body)
    if kind != 'sitemapindex': raise ValueError('Expected sitemap index')
    pending = [url for url in queue if url not in state['visited']]
    for url in pending[:max_pages]:
        payload, _ = network.get(url, kind='document')
        page_kind, urls = sitemap_urls(payload)
        if page_kind != 'urlset': raise ValueError('Expected child sitemap')
        for candidate in urls:
            parsed = urlsplit(candidate)
            if parsed.hostname in {'ufc.com', 'www.ufc.com'} and parsed.path.startswith('/athlete/'):
                state['athleteUrls'].append(urlunsplit(('https', 'www.ufc.com', parsed.path.rstrip('/'), '', '')))
        state['athleteUrls'] = sorted(set(state['athleteUrls']))
        state['visited'].append(url)
        state['remainingPages'] = len(queue) - len(state['visited'])
        atomic_json(checkpoint, state)
    return state


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='work/media-discovery')
    parser.add_argument('--max-pages', type=int, default=1)
    args = parser.parse_args()
    if args.max_pages < 1: parser.error('max-pages must be positive')
    state = discover(args.output, args.max_pages)
    print({'athletes': len(state['athleteUrls']), 'visited': len(state['visited']), 'remaining': state.get('remainingPages')})
