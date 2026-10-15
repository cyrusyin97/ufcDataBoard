# Data scripts

M1 implements the Python exporter and data checks in `pipeline/`.
Read the export contract in [the technical design](../docs/technical-design.md).
The M0 application uses a small ranking fixture.
Do not imply that the fixture refreshes from SQLite automatically.

## Media research

The offline candidate extractor is `research/media_candidates.py`.
It requires a saved athlete HTML file and its page URL.
It has no network access.
Run its six checks with `python3 -m unittest discover -s scripts/research -p 'test_*.py'`.
Read [the acquisition design](../docs/media-acquisition.md) before implementing network collection.
The production collector is `pipeline/media.py`.
Read [data operations](../docs/data-operations.md) for all commands.

## Additional ranked media

Use `npm run data:media:ranked` to collect media for the other ranked divisions.
Pass `--db` and `--as-of`.
Read [ranked media expansion](../docs/ranked-media-expansion.md) for scope and resume behavior.
The job does not approve anatomical roles or publish a release.

## Release commands

`data:restore` verifies and installs the pinned artifact without the source database.
`release:check` checks Node.js, source revision, data integrity, and media publication rights.
`release:http` checks a local server or an HTTPS preview.
Read [the deployment guide](../docs/deployment.md) for inputs and reports.
