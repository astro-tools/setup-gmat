# Troubleshooting

When a `setup-gmat` step fails, the action emits a precise error pointing at one of the failure modes below. Match the error string in the workflow log to a section here.

## Installer download appears truncated

```
GMAT R2026a installer download appears truncated.
Observed 12.4 MiB (13002432 bytes), expected at least 380.0 MiB.
URL: https://sourceforge.net/projects/gmat/files/GMAT/GMAT-R2026a/gmat-ubuntu-x64-R2026a.tar.gz/download
```

Before extraction, the action sanity-checks the downloaded archive against a hardcoded minimum size. The most common causes:

- **SourceForge served an HTML mirror page instead of the archive.** Re-running the workflow usually clears it; the SourceForge mirror network occasionally hands back a redirect/landing page sized in kilobytes.
- **Network interruption mid-download.** The error fires fast, before extraction; safe to re-run.
- **Upstream pulled the release.** If retries don't help, the SourceForge URL may have changed or the tarball may have been replaced. Open an issue.

The threshold (≈380 MiB for R2026a) is hardcoded; a download below it is treated as failure regardless of whether extraction would have succeeded.

## `python` is not on `PATH`

```
python is not on PATH (...).
Add a 'uses: actions/setup-python@v5' step before setup-gmat.
```

`setup-gmat` shells out to Python twice — once for `BuildApiStartupFile.py`, once for the internal smoke check. Both call `which python` and fail loudly if no `python` binary is resolvable. Fix by ordering `actions/setup-python` (or any equivalent) before `setup-gmat`:

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'

- uses: astro-tools/setup-gmat@v0.1
```

The `python-version` input on `setup-gmat` itself is informational and does **not** select the interpreter — see [Inputs and outputs](inputs-outputs.md#inputs).

## `BuildApiStartupFile.py` failed

```
BuildApiStartupFile.py failed in /home/runner/work/_temp/gmat: <subprocess exit message>.
Without api/api_startup_file.txt, gmatpy import will fail at runtime.
```

`BuildApiStartupFile.py` writes `bin/api_startup_file.txt`, which `gmat.Setup()` reads on import. If it fails, the install is unusable even though the tarball extracted cleanly. Common causes:

- **Mismatched Python ABI.** GMAT R2026a ships pre-built `gmatpy` modules for Python 3.9 through 3.14. Running `BuildApiStartupFile.py` under a Python outside that range will fail. Pin a supported version via `actions/setup-python`.
- **Permissions on `$GMAT_ROOT/api/`.** The script writes inside the install tree; if the runner has restrictive umask or the path was made read-only by a previous step, the write fails. Default GitHub-hosted runners do not have this issue.
- **Corrupted cache.** A previous run may have saved a partial install. Pass `cache: false` once to force a fresh download.

The full subprocess output appears in the workflow log immediately above this error — read it for the underlying Python traceback.

## Smoke check failed

```
Smoke check failed: <subprocess exit message>.
Sample: /home/runner/work/_temp/gmat/samples/Ex_HighFidelitySRP.script.
GMAT_ROOT: /home/runner/work/_temp/gmat.
See the workflow log above for gmatpy's stderr.
```

After installing, the action loads and runs a stock sample (`Ex_HighFidelitySRP.script`) end-to-end as proof that `gmatpy` is callable. A failure here means the install is broken in a way `BuildApiStartupFile.py` did not catch — typically a missing shared library or an ABI/Python mismatch that only surfaces at first `gmat.Setup()`.

Read the stderr above the error for the underlying gmatpy / GMAT message. If you see a missing-shared-library error (e.g. `libGmatBase.so` failing to load), check whether a custom runner image is interfering with the cached install — passing `cache: false` and re-running is the fastest diagnostic.

## Archive layout drift

```
Expected GMAT/R2026a/api/BuildApiStartupFile.py inside the installer,
but /tmp/.../GMAT/R2026a/api/BuildApiStartupFile.py is missing.
Did the upstream archive layout change?
```

`setup-gmat` resolves `GMAT_ROOT` by an exact path inside the tarball (`GMAT/<version>/`). If NASA changes the layout in a future release, this error fires immediately rather than producing a half-installed tree. v0.1 is pinned to R2026a, whose layout is stable. If you see this error against R2026a, the tarball is either corrupt locally or has been replaced upstream — open an issue.

## Cache restore differs from a fresh install

This is not an error setup-gmat raises, but it can show up in workflows that snapshot `$GMAT_ROOT` and assert on its contents. The action's own self-test (`.github/workflows/ci.yml`, the `self-test` job) verifies bit-for-bit equivalence between a fresh download and a cache restore for everything _except_ `bin/api_startup_file.txt` and `__pycache__/` directories. Drift in those two paths is expected — they're regenerated per Python ABI when `BuildApiStartupFile.py` runs against the restored install.
