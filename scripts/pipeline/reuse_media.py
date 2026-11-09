"""Reuse reviewed derivatives from a previously verified website release."""
import copy
import shutil
from pathlib import Path
from common import file_digest, read_json


def reuse_media(source, destination, reviews, fighter_ids, mappings):
    source = Path(source)
    manifest = read_json(source / 'manifest.json')
    media = read_json(source / 'media.json')
    if media['datasetVersion'] != manifest['datasetVersion']:
        raise ValueError('Media seed version mismatch')
    prefix = '/data/v1/' + manifest['datasetVersion'] + '/'
    result = {}
    for fighter_id, roles in media['fighters'].items():
        for role, original in roles.items():
            if original is None:
                continue
            review = reviews.get(fighter_id + ':' + role, {})
            if (fighter_id not in fighter_ids or fighter_id not in mappings or
                    role not in ('headshot', 'half_body', 'full_body') or
                    original['role'] != role or review.get('state') != 'approved' or
                    review.get('sha256') != original['sourceSha256']):
                raise ValueError('Media seed no longer matches reviewed identity and role')
            asset = copy.deepcopy(original)
            for variant in asset['variants']:
                url = variant.pop('url')
                if not url.startswith(prefix):
                    raise ValueError('Media seed URL differs from release')
                relative = url[len(prefix):]
                path = Path(relative)
                if len(path.parts) != 2 or path.parts[0] != 'media' or path.suffix != '.webp':
                    raise ValueError('Invalid media seed path')
                file = source / path
                expected = manifest['files'][relative]
                if (file.is_symlink() or file.stat().st_size != expected['bytes'] or
                        file_digest(file) != expected['sha256']):
                    raise ValueError('Media seed file checksum differs')
                target = Path(destination) / path
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(file, target)
                variant['path'] = relative
            result.setdefault(fighter_id, {})[role] = asset
    expected_roles = {key for key, review in reviews.items()
                      if review['state'] == 'approved' and key.split(':')[0] in mappings}
    actual_roles = {fighter + ':' + role for fighter, roles in result.items() for role in roles}
    if expected_roles != actual_roles:
        raise ValueError('Media seed does not cover all approved roles')
    return result
