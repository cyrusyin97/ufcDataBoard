# Data scripts

The Python exporter and data checks are in `pipeline/`.
Read [data contracts and scoring](../docs/spec/data-and-scoring.md) for current artifact meaning.
The application reads a checked immutable dataset. Test fixtures do not refresh from SQLite automatically.

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

## All-division UI registry

Run `.venv/bin/python scripts/pipeline/expand_ui_divisions.py` from the project root.
The command checks the saved ranking HTML against the reviewed membership snapshot.
It promotes explicit ranks and champion headings through configurable division metadata.
It performs no network requests or database writes.
Read [the UI expansion report](../docs/all-divisions-report.md).
