# Getting started

This page walks through the minimum CI workflow that installs GMAT R2026a and runs your own `gmatpy` code on top of it.

## Prerequisites

- A Linux runner. v0.1 is exercised on `ubuntu-latest`; other Linux runners with a recent glibc should work but are not covered by setup-gmat's CI.
- `python` on `PATH` _before_ `setup-gmat` runs. The action shells out to `BuildApiStartupFile.py` and runs an internal smoke check; both invoke whatever Python `which python` resolves. The action does **not** bundle its own interpreter. Use [`actions/setup-python`](https://github.com/actions/setup-python) (or any equivalent) to put one on PATH.

## Minimum workflow

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - uses: astro-tools/setup-gmat@v0
        with:
          version: R2026a
```

When this step finishes, the job has:

- GMAT installed under `$GMAT_ROOT` (`$RUNNER_TEMP/gmat`), exported into the workflow environment.
- `gmatpy` available at `$GMAT_ROOT/bin/gmatpy/` and registered against the active Python ABI by `BuildApiStartupFile.py`.
- An action-internal smoke check that has already loaded and run a stock GMAT sample (`samples/Ex_HighFidelitySRP.script`), so a successful step is positive proof the install is callable.

## Calling gmatpy from your own steps

`gmatpy` lives at `$GMAT_ROOT/bin/gmatpy/`, which is **not** on Python's import path by default — `setup-gmat` does not modify `PYTHONPATH`. Two patterns work; pick whichever fits how your code is invoked.

### Pattern 1 — set `PYTHONPATH` on the step

```yaml
- name: Run mission script
  run: python my_mission.py
  env:
    PYTHONPATH: ${{ env.GMAT_ROOT }}/bin
```

`${{ env.GMAT_ROOT }}` resolves at step prep time, by which point `setup-gmat` has already exported the variable. This is the simplest form for one-off scripts and `pytest` invocations.

### Pattern 2 — `sys.path.insert` from inside Python

```python
import os, sys
sys.path.insert(0, os.path.join(os.environ['GMAT_ROOT'], 'bin'))
import gmatpy as gmat

gmat.Setup(os.path.join(os.environ['GMAT_ROOT'], 'bin', 'api_startup_file.txt'))
# ... use gmat.LoadScript, gmat.RunScript, etc.
```

Note the `gmat.Setup(...)` call — GMAT requires the API startup file to be loaded once before the rest of the API is usable. `BuildApiStartupFile.py` writes that file during `setup-gmat`; your code points GMAT at it.

This pattern is more portable than `PYTHONPATH` because it travels with the script, regardless of how Python is invoked.

## Reading outputs

`setup-gmat` exposes three outputs and one environment variable. See [Inputs and outputs](inputs-outputs.md) for the full reference. A typical use:

```yaml
- id: gmat
  uses: astro-tools/setup-gmat@v0
  with:
    version: R2026a

- name: Show install metadata
  run: |
    echo "version=${{ steps.gmat.outputs.gmat-version }}"
    echo "root=${{ steps.gmat.outputs.gmat-root }}"
    echo "cache-hit=${{ steps.gmat.outputs.cache-hit }}"
```

## Next steps

- Caching, the install layout, and the cache key's exact shape are documented in [Inputs and outputs](inputs-outputs.md#cache-key).
- Common failures and their precise error strings are in [Troubleshooting](troubleshooting.md).
