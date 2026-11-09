"""Package metadata and guarded publication for the weekly data workflow."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path('work/weekly')
REPO = os.environ.get('GITHUB_REPOSITORY', 'cyrusyin97/ufcDataBoard')


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + '\n')


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def prepare():
    version = read('public/data/current.json')['datasetVersion']
    previous = read('data/release.json')['datasetVersion']
    old = ROOT / 'previous/v1' / previous
    new = Path('public/data/v1') / version
    if read(old / 'divisions.json')['divisions'] != read(new / 'divisions.json')['divisions']:
        raise ValueError('Automatic data updates must retain reviewed ranking snapshots')
    old_media = read(old / 'media.json')['fighters']
    new_media = read(new / 'media.json')['fighters']
    # New fighters can have empty role entries. Every populated role must match.
    def populated(media, dataset):
        return {fighter: json.loads(json.dumps(roles).replace('/' + dataset + '/', '/VERSION/'))
                for fighter, roles in media.items() if any(roles.values())}
    if populated(old_media, previous) != populated(new_media, version):
        raise ValueError('Reviewed media differs from the previous release')
    if read(new / 'manifest.json')['sourceDatabaseSha256'] != sha(ROOT / 'candidate/ufc.db'):
        raise ValueError('Website and source snapshot differ')
    suffix = os.environ['GITHUB_RUN_ID'] + '-' + os.environ['GITHUB_RUN_ATTEMPT']
    tag = 'website-data-' + suffix
    archive = ROOT / 'packages' / ('ufc-data-' + version + '.tar.gz')
    descriptor = {'datasetVersion': version, 'sha256': sha(archive),
                  'artifactUrl': f'https://github.com/{REPO}/releases/download/{tag}/{archive.name}'}
    write(ROOT / 'packages/release.json', descriptor)
    Path(str(archive) + '.sha256').write_text(descriptor['sha256'] + '  ' + archive.name + '\n')
    write(ROOT / 'release-state.json', {'archive': str(archive), 'websiteTag': tag,
                                      'databaseTag': 'db-snapshot-' + suffix})


def publish_release(tag, files, notes):
    # A failed upload leaves a draft. A fresh attempt uses a new tag.
    command('gh', 'release', 'create', tag, '--repo', REPO, '--draft', '--latest=false',
            '--target', os.environ['GITHUB_SHA'], '--title', tag, '--notes', notes)
    command('gh', 'release', 'upload', tag, *map(str, files), '--repo', REPO)
    uploaded = json.loads(command('gh', 'release', 'view', tag, '--repo', REPO, '--json', 'assets'))
    actual = {asset['name']: asset for asset in uploaded['assets']}
    if set(actual) != {file.name for file in files}:
        raise ValueError('Release asset set differs')
    for file in files:
        if actual[file.name]['digest'] != 'sha256:' + sha(file):
            raise ValueError('Uploaded asset checksum differs')
    command('gh', 'release', 'edit', tag, '--repo', REPO, '--draft=false', '--latest=false')


def check_head():
    command('git', 'fetch', 'origin', 'main')
    if command('git', 'rev-parse', 'origin/main') != os.environ['GITHUB_SHA']:
        raise ValueError('Main advanced during collection. Rerun on the latest main commit.')


def publish():
    check_head()
    state = read(ROOT / 'release-state.json')
    database = ROOT / 'candidate'
    publish_release(state['databaseTag'], [database / name for name in
                    ('ufc.db', 'ufc.db.sha256', 'baseline.json', 'snapshot.json')],
                    'Validated source snapshot for the weekly website dataset.')
    archive = Path(state['archive'])
    publish_release(state['websiteTag'], [archive, Path(str(archive) + '.sha256'),
                    ROOT / 'packages/release.json'],
                    'Validated website dataset. Ranking lists and their snapshot dates retain the previous reviewed values.')
    check_head()
    write('data/release.json', read(ROOT / 'packages/release.json'))
    write('data/collector.json', {'tag': state['databaseTag'], 'sha256': sha(database / 'ufc.db')})
    command('git', 'config', 'user.name', 'github-actions[bot]')
    command('git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    command('git', 'add', 'data/release.json', 'data/collector.json')
    command('git', 'commit', '-m', 'data: publish ' + read('data/release.json')['datasetVersion'])
    command('git', 'push', 'origin', 'HEAD:main')


if __name__ == '__main__':
    {'prepare': prepare, 'publish': publish}[sys.argv[1]]()
