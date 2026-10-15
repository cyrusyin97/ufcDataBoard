import argparse
import datetime as dt
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'research'))
from media_candidates import extract_candidates
from common import atomic_json, read_json
from media import Network
from urllib.parse import urlsplit


def prepare_candidates(config_path, output, refresh=False):
    output = Path(output);output.mkdir(parents=True, exist_ok=True)
    configuration = read_json(config_path)
    network = None
    sources = []
    failures = []
    for mapping in configuration['mappings']:
        if mapping['matchState'] != 'reviewed': continue
        page = output / 'pages' / (mapping['fighterId'] + '.html')
        try:
            if refresh or not page.exists():
                if network is None:
                    candidate = Network(output);candidate.load_policy();network = candidate
                payload, response = network.get(mapping['sourcePageUrl'], kind='document')
                if response['mime'] != 'text/html' or urlsplit(response['finalUrl']).path.rstrip('/') != urlsplit(mapping['sourcePageUrl']).path.rstrip('/'):
                    raise ValueError('The mapped athlete page changed identity or content type')
                page.parent.mkdir(parents=True, exist_ok=True);page.write_bytes(payload)
            candidates = extract_candidates(page.read_text(), mapping['sourcePageUrl'])
            methods = {'half_body': ('hero_image',), 'full_body': ('derived_hero_path',), 'headshot': ('social_metadata', 'event_image')}
            for role, accepted in methods.items():
                match = next((c for method in accepted for c in candidates if c['method'] == method), None)
                if match:
                    sources.append({'fighterId': mapping['fighterId'], 'role': role, 'sourceUrl': match['url'], 'pageUrl': mapping['sourcePageUrl'], 'method': match['method']})
        except Exception as error:
            failures.append({'fighterId': mapping['fighterId'], 'error': str(error)})
    manifest = {'schemaVersion': 1, 'sources': sources}
    atomic_json(output / 'media-sources.json', manifest)
    atomic_json(output / 'candidate-report.json', {'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'sources': len(sources), 'failures': failures})
    if failures: raise ValueError('Candidate discovery failed for one or more mapped pages')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default='data/config/initial.json')
    parser.add_argument('--output', default='work/media-candidates')
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    print({'sources': len(prepare_candidates(args.config, args.output, args.refresh)['sources'])})
