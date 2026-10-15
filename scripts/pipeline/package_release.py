import argparse
import json
import tarfile
from pathlib import Path
from common import read_json

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='public/data')
    parser.add_argument('--output', default='outputs/datasets')
    args = parser.parse_args()
    root = Path(args.root);version = read_json(root / 'current.json')['datasetVersion']
    release = root / 'v1' / version
    output = Path(args.output);output.mkdir(parents=True, exist_ok=True)
    artifact = output / ('ufc-data-' + version + '.tar.gz')
    pending = artifact.with_suffix('.pending')
    with tarfile.open(pending, 'w:gz') as archive:
        archive.add(root / 'current.json', arcname='data/current.json')
        archive.add(release, arcname='data/v1/' + version)
    pending.replace(artifact)
    print(json.dumps({'artifact': str(artifact), 'bytes': artifact.stat().st_size, 'version': version}))
