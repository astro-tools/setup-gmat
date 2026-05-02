# Run pytest against gmatpy

Runnable copy: [`examples/pytest.yml`](https://github.com/astro-tools/setup-gmat/blob/v0/examples/pytest.yml)

A workflow that installs GMAT, then runs a `pytest` suite whose tests `import gmatpy`. The test step sets `PYTHONPATH=$GMAT_ROOT/bin` so `gmatpy` resolves on import — see [Getting started → Calling gmatpy from your own steps](../getting-started.md#calling-gmatpy-from-your-own-steps) for why this is necessary.

## Workflow

```yaml
name: tests

on: [push, pull_request]

jobs:
  pytest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - uses: astro-tools/setup-gmat@v0
        with:
          version: R2026a

      - name: Install test dependencies
        run: pip install pytest

      - name: Run pytest
        run: pytest tests/ -v
        env:
          PYTHONPATH: ${{ env.GMAT_ROOT }}/bin
```

`${{ env.GMAT_ROOT }}` resolves at step prep time, by which point `setup-gmat` has already exported the variable. Setting `PYTHONPATH` on a single step is the lightest-touch form — it doesn't leak into other steps, doesn't require touching `sys.path` in the test code, and works with both `pytest` and plain `python -m`.

## Example test

```python
# tests/test_propagation.py
import os

import gmatpy as gmat


def test_smoke():
    gmat.Setup(os.path.join(os.environ['GMAT_ROOT'], 'bin', 'api_startup_file.txt'))
    sample = os.path.join(os.environ['GMAT_ROOT'], 'samples', 'Ex_HighFidelitySRP.script')
    assert gmat.LoadScript(sample)
    assert gmat.RunScript() == 1  # GMAT returns 1 on success
```

Note the `gmat.Setup(...)` call — GMAT requires the API startup file to be loaded once before the rest of the API is usable. `setup-gmat` writes that file during install; tests point GMAT at it via `$GMAT_ROOT`.

For larger suites, lift `gmat.Setup(...)` into a session-scoped `pytest` fixture so it runs once per test process.

## Common failures

- `ModuleNotFoundError: No module named 'gmatpy'` — the test step is missing `PYTHONPATH=${{ env.GMAT_ROOT }}/bin`. The action does **not** modify `PYTHONPATH` by design; see [Inputs and outputs → Environment variables](../inputs-outputs.md#environment-variables).
- `python is not on PATH` raised by `setup-gmat` itself — `actions/setup-python` is missing or sequenced after `setup-gmat`. See [Troubleshooting → `python` is not on `PATH`](../troubleshooting.md#python-is-not-on-path).
