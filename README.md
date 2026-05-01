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
```

## Status

setup-gmat installs GMAT (R2022a, R2025a, or R2026a) on Linux, Windows, and macOS runners, caches the install across runs, and exports `GMAT_ROOT` to the workflow environment. Every supported `(runner, version)` pair except `macos-latest × R2022a` is exercised in self-CI on every PR — see [Supported versions](#supported-versions) for the matrix and the macOS R2022a caveat.

## What it does

- Resolves the GMAT installer URL for the requested version and runner OS.
- Restores the install from cache, or downloads and extracts a fresh copy.
- Runs `BuildApiStartupFile.py` against the resolved `GMAT_ROOT`.
- Smoke-checks the install with a one-line propagation against a stock sample.
- Exports `GMAT_ROOT` to the workflow environment and writes outputs (`gmat-root`, `gmat-version`, `cache-hit`).

`actions/setup-python` (or any equivalent that puts `python` on PATH) is a prerequisite — setup-gmat does not bundle its own Python interpreter.

## Supported versions

| Runner           | R2022a               | R2025a | R2026a |
| ---------------- | -------------------- | ------ | ------ |
| `ubuntu-latest`  | ✅                   | ✅     | ✅     |
| `windows-latest` | ✅                   | ✅     | ✅     |
| `macos-latest`   | ❌ (x86_64-only DMG) | ✅     | ✅     |

Every cell in the table above is exercised on every PR and on `main` — see the `self-test` job in `.github/workflows/ci.yml`.

R2022a's macOS DMG ships x86_64-only `gmatpy` `.so` files and predates Apple Silicon support; `macos-latest` is now arm64, so the import fails with "incompatible architecture" at runtime. R2025a and R2026a ship arm64-compatible bindings and run natively on Apple Silicon. Linux uses GMAT's generic x86_64 build (other Linux runners with a recent glibc should work but are not exercised); Windows uses the x86_64 zip.

### Python ABI per GMAT release

The smoke check imports `gmatpy`, which is a per-Python-version compiled binding shipped inside the GMAT release. Pin Python to a version the release shipped:

| GMAT version | gmatpy bindings shipped (cross-OS minimum) |
| ------------ | ------------------------------------------ |
| R2022a       | 3.6, 3.7, 3.8, 3.9 (Linux also adds 3.10)  |
| R2025a       | 3.9 – 3.12                                 |
| R2026a       | 3.9 – 3.14                                 |

If you run `setup-gmat` against a Python version outside the matching column, `BuildApiStartupFile.py` or the smoke check fails with `ModuleNotFoundError: No module named '_pyXYZ'`. For a matrix that includes R2022a, pin Python 3.9 — that's the lowest common denominator across every supported OS.

## Quick start

A complete workflow that installs GMAT, runs `gmatpy`, and is shaped as a matrix so it scales to multiple versions cleanly:

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

      - name: Show install metadata
        run: |
          echo "GMAT_ROOT=${{ steps.gmat.outputs.gmat-root }}"
          echo "version=${{ steps.gmat.outputs.gmat-version }}"
          echo "cache-hit=${{ steps.gmat.outputs.cache-hit }}"
```

## Documentation

Full documentation lives at **<https://astro-tools.github.io/setup-gmat/>** — getting started, inputs and outputs, recipes, FAQ, and troubleshooting.

## Roadmap

| Release          | Scope                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| v0.1 _(current)_ | Linux + R2026a, basic caching, smoke check.                                  |
| v0.2             | Linux + Windows + macOS, R2022a/R2025a/R2026a; weekly self-CI cron next.     |
| v0.3             | Docker image on GHCR, semantic-release wired up, cosign image signing.       |
| v1.0             | Public API stability; at least two external consumers shipped on the action. |

## License

[MIT](LICENSE).
