# Getting started

This page will walk through the minimum workflow to install GMAT in CI once v0.1 ships.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - uses: astro-tools/setup-gmat@v1
        with:
          version: R2026a
      - run: python -c "import gmatpy"
```

Python on PATH is a prerequisite — setup-gmat invokes `BuildApiStartupFile.py` and does not bundle its own interpreter. Run `actions/setup-python` (or any other mechanism that puts a `python` binary on PATH) before `setup-gmat`.
