# Validate against every GMAT version on every OS

A workflow that exercises a consumer project against `{ubuntu-latest, windows-latest, macos-latest} × {R2022a, R2025a, R2026a}` — the full nine-combo matrix `setup-gmat` supports, minus one unsupported pair.

The matrix surfaces version- and platform-specific breakage early: a fix that works on Linux R2026a but regresses on Windows R2022a fails one cell instead of slipping through.

## Workflow

```yaml
name: gmat-compat

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        version: [R2022a, R2025a, R2026a]
        exclude:
          # macOS R2022a ships an x86_64-only DMG that Apple Silicon
          # runners cannot dlopen — see Inputs and outputs.
          - os: macos-latest
            version: R2022a
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - uses: astro-tools/setup-gmat@v0
        with:
          version: ${{ matrix.version }}

      - name: Run tests
        run: pytest tests/ -v
        env:
          PYTHONPATH: ${{ env.GMAT_ROOT }}/bin
```

`fail-fast: false` lets every cell run to completion even if one fails. With the default `fail-fast: true`, a single early failure cancels the rest of the matrix and you lose the signal you were trying to capture — a Windows R2022a regression cancels the macOS R2026a job before it has a chance to confirm whether the same change broke there too.

The `exclude` entry drops `macos-latest × R2022a` because that combo isn't supported: R2022a's macOS installer is x86_64-only and Apple Silicon runners cannot load it. Removing the exclude turns that cell into a hard failure rather than a useful signal.

## Skipping combos you don't care about

The same `exclude` mechanism trims combos that _are_ supported but you don't need to validate. If your project only ships against modern releases on Linux and macOS, drop the Windows cells for the older version:

```yaml
exclude:
  - os: macos-latest
    version: R2022a
  - os: windows-latest
    version: R2022a
```

Each excluded entry shaves one job — eight cells instead of nine in the example above. Keep the entries narrow (an `os` _and_ a `version`); excluding by `os` alone or `version` alone removes whole rows or columns and is usually too coarse.

## Python pinning across versions

The snippet above pins `python-version: '3.12'`, which works for R2025a and R2026a but not R2022a — each GMAT release ships `gmatpy` bindings for a different Python range. The `setup-gmat` README has a [Python ABI per GMAT release](https://github.com/astro-tools/setup-gmat#python-abi-per-gmat-release) table; if your matrix spans versions with non-overlapping Python support, parametrize `python-version` alongside `version` using `include`:

```yaml
matrix:
  include:
    - { os: ubuntu-latest, version: R2022a, python-version: '3.10' }
    - { os: ubuntu-latest, version: R2025a, python-version: '3.12' }
    - { os: ubuntu-latest, version: R2026a, python-version: '3.12' }
    # ... one entry per (os, version) combo you want to test
```

`include` enumerates the matrix explicitly instead of computing it from the cross product, which keeps the per-cell Python pin co-located with the GMAT version it pairs with.

## Common failures

- `ModuleNotFoundError: No module named 'gmatpy'` on the older-version cells — the Python on PATH is outside that release's `gmatpy` ABI window. Switch to the `include` form above and pin Python per cell. See the [Python ABI table](https://github.com/astro-tools/setup-gmat#python-abi-per-gmat-release).
- The `macos-latest × R2022a` cell fails with a dynamic-loader error — the `exclude` was removed or never added. Restore the exclude entry.
- One cell passes locally but fails in CI on a different OS — the `actions/checkout`, `actions/setup-python`, and `astro-tools/setup-gmat` steps all run identically across OSes; the divergence is almost always in the project's own test code (path separators, line endings, OS-conditional dependencies). Reproduce with `act` or by checking out the branch on the affected platform before debugging the matrix itself.
