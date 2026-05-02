# Run a mission script and upload its report

Runnable copy: [`examples/run-mission-script.yml`](https://github.com/astro-tools/setup-gmat/blob/v0/examples/run-mission-script.yml)

A workflow that installs GMAT, runs a `.script` mission file via `gmatpy.LoadScript` / `RunScript` from a small Python driver, then uploads the resulting report directory as a build artifact.

The example uses the stock `samples/Ex_HighFidelitySRP.script` shipped inside the GMAT install, so the recipe runs as-is without any user-supplied script. Substitute your own `.script` path for real mission analysis.

## Workflow

```yaml
name: run-mission

on: [push, pull_request]

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - uses: astro-tools/setup-gmat@v0
        with:
          version: R2026a

      - name: Run mission script
        run: python run_mission.py

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mission-reports
          path: reports/
          if-no-files-found: error
```

`if: always()` on the upload step keeps the report artifact available even when the mission run fails — the partial output is usually what you want to inspect. `if-no-files-found: error` turns a silently-empty `reports/` into a hard failure, which catches cases where the driver wrote to the wrong directory.

## Driver script

```python
# run_mission.py
import os
import sys
from pathlib import Path

GMAT_ROOT = Path(os.environ['GMAT_ROOT'])
sys.path.insert(0, str(GMAT_ROOT / 'bin'))

import gmatpy as gmat

REPORTS = Path('reports')
REPORTS.mkdir(exist_ok=True)

gmat.Setup(str(GMAT_ROOT / 'bin' / 'api_startup_file.txt'))

script = GMAT_ROOT / 'samples' / 'Ex_HighFidelitySRP.script'
if not gmat.LoadScript(str(script)):
    sys.exit(f'gmat.LoadScript failed for {script}')
if gmat.RunScript() != 1:
    sys.exit(f'gmat.RunScript did not return 1 for {script}')

# After RunScript, the propagated spacecraft holds its final state.
sc = gmat.GetObject('aSpacecraft')
fields = ['Epoch', 'X', 'Y', 'Z', 'VX', 'VY', 'VZ']
with (REPORTS / 'final_state.csv').open('w') as out:
    out.write(','.join(fields) + '\n')
    out.write(','.join(str(sc.GetField(name)) for name in fields) + '\n')

print(f'wrote {REPORTS / "final_state.csv"}')
```

The `sys.path.insert` pattern (Pattern 2 in [Getting started](../getting-started.md#calling-gmatpy-from-your-own-steps)) is the right choice for a self-contained driver — the import path travels with the script, so it works the same whether invoked by CI, by `python run_mission.py` locally, or by an IDE.

If your `.script` file uses `Create ReportFile` resources to write its own outputs, change directory to `reports/` before `LoadScript` so GMAT's relative report paths land alongside the Python-written files:

```python
os.chdir(REPORTS)
```

The samples shipped in `$GMAT_ROOT/samples/` are documented in the GMAT user guide. Stock filenames are mostly stable across releases but not guaranteed — R2026a, for example, renamed `Ex_R2014a_HighFidelitySRP.script` to `Ex_HighFidelitySRP.script`. See [Inputs and outputs → Install path and layout](../inputs-outputs.md#install-path-and-layout) for the full directory map.

## Common failures

- `gmat.LoadScript failed for <path>` — the script path is wrong, or the script references files (e.g. `SPADSRPFile`) that resolve to paths outside the install. Verify the path; for stock samples, use `$GMAT_ROOT/samples/<name>.script`.
- `gmat.RunScript did not return 1` — GMAT returns `1` on success and other values on failure (a confusing convention inherited from the engine). The full GMAT engine log appears above this line in the workflow output; read it for the underlying cause.
- Empty `reports/` artifact — the driver ran but did not write anything under `reports/`. Check that `REPORTS.mkdir(exist_ok=True)` ran before any output and that the driver's working directory is what you expect.
