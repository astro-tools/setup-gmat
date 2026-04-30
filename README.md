# setup-gmat

GitHub Action for installing [NASA GMAT](https://gmat.gsfc.nasa.gov/) (General Mission Analysis Tool) and bootstrapping `gmatpy` in CI.

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
- uses: astro-tools/setup-gmat@v0
  with:
    version: R2026a
    cache: true
- run: python -c "import gmatpy"
```

## Status

v0.1 is the first usable release. It installs GMAT R2026a on Linux runners, caches the install across runs, and exports `GMAT_ROOT` to the workflow environment. Additional runners (Windows, macOS) and the R2022a–R2025a version matrix are tracked under v0.2; see the [Roadmap](#roadmap) below.

## What it does

- Resolves the GMAT installer URL for the requested version and runner OS.
- Restores the install from cache, or downloads and extracts a fresh copy.
- Runs `BuildApiStartupFile.py` against the resolved `GMAT_ROOT`.
- Smoke-checks the install with a one-line propagation against a stock sample.
- Exports `GMAT_ROOT` to the workflow environment and writes outputs (`gmat-root`, `gmat-version`, `cache-hit`).

`actions/setup-python` (or any equivalent that puts `python` on PATH) is a prerequisite — setup-gmat does not bundle its own Python interpreter.

## Supported versions (v0.1)

| Runner          | GMAT version |
| --------------- | ------------ |
| `ubuntu-latest` | R2026a       |

The action pulls GMAT's generic Linux x86_64 build, so other Linux runners with a recent glibc should work — but `ubuntu-latest` is the only configuration exercised in CI for v0.1. Windows and macOS runners, and the R2022a / R2025a versions, are scoped for v0.2.

## Quick start

A complete workflow that installs GMAT, runs `gmatpy`, and is shaped as a matrix so it expands cleanly when v0.2 adds more versions:

```yaml
name: gmat-ci

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        gmat-version: [R2026a]
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - id: gmat
        uses: astro-tools/setup-gmat@v0
        with:
          version: ${{ matrix.gmat-version }}
          cache: true

      - name: Smoke check gmatpy
        run: python -c "import gmatpy; print(gmatpy.__file__)"

      - name: Show install metadata
        run: |
          echo "GMAT_ROOT=${{ steps.gmat.outputs.gmat-root }}"
          echo "version=${{ steps.gmat.outputs.gmat-version }}"
          echo "cache-hit=${{ steps.gmat.outputs.cache-hit }}"
```

## Documentation

Full documentation lives at **<https://astro-tools.github.io/setup-gmat/>** — getting started, inputs and outputs, recipes, FAQ, and troubleshooting.

## Roadmap

| Release      | Scope                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| v0.1 *(current)* | Linux + R2026a, basic caching, smoke check, gmat-run CI consumes the action. |
| v0.2         | Windows + macOS, R2022a–R2026a matrix, weekly self-CI cron.                  |
| v0.3         | Docker image on GHCR, semantic-release wired up, cosign image signing.       |
| v1.0         | Public API stability; at least two external consumers shipped on the action. |

## License

[MIT](LICENSE).
