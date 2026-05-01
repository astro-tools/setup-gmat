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

The per-version threshold (e.g. ≈380 MiB for R2026a) is hardcoded; a download below it is treated as failure regardless of whether extraction would have succeeded.

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

- uses: astro-tools/setup-gmat@v0
```

The `python-version` input on `setup-gmat` itself is informational and does **not** select the interpreter — see [Inputs and outputs](inputs-outputs.md#inputs).

## `BuildApiStartupFile.py` failed

```
BuildApiStartupFile.py failed in /home/runner/work/_temp/gmat: <subprocess exit message>.
Without api/api_startup_file.txt, gmatpy import will fail at runtime.
```

`BuildApiStartupFile.py` writes `bin/api_startup_file.txt`, which `gmat.Setup()` reads on import. If it fails, the install is unusable even though the tarball extracted cleanly. Common causes:

- **Mismatched Python ABI.** Each GMAT release ships pre-built `gmatpy` bindings for a different Python range — R2022a covers 3.6–3.9 (Linux extends to 3.10), R2025a covers 3.9–3.12, R2026a covers 3.9–3.14. Running `BuildApiStartupFile.py` under a Python outside the matching range fails. Pin a supported version via `actions/setup-python`; see the [Python ABI table](https://github.com/astro-tools/setup-gmat#python-abi-per-gmat-release) in the README for the cross-OS view.
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

After installing, the action loads and runs a stock high-fidelity SRP sample end-to-end as proof that `gmatpy` is callable. A failure here means the install is broken in a way `BuildApiStartupFile.py` did not catch — typically a missing shared library or an ABI/Python mismatch that only surfaces at first `gmat.Setup()`.

Read the stderr above the error for the underlying gmatpy / GMAT message. If you see a missing-shared-library error (e.g. `libGmatBase.so` failing to load), check whether a custom runner image is interfering with the cached install — passing `cache: false` and re-running is the fastest diagnostic.

## Archive layout drift

On Linux and macOS the action expects a known wrapper path inside the archive:

```
Expected api/BuildApiStartupFile.py inside the installer at /tmp/.../GMAT/R2026a,
but /tmp/.../GMAT/R2026a/api/BuildApiStartupFile.py is missing.
Did the upstream archive layout change?
```

On Windows the layout varies across releases (R2026a is wrapper-less, older releases wrap in `GMAT/<version>/`), so the action probes for `api/BuildApiStartupFile.py` instead and reports:

```
Could not locate api/BuildApiStartupFile.py anywhere under D:\a\_temp\<staging>.
Did the upstream archive layout change?
```

If you hit either error against a supported `version`, the archive is either corrupt locally or has been replaced upstream — open an issue.

## macOS architecture mismatch (R2022a only)

```
ImportError: dlopen(.../bin/gmatpy/_py39/_gmat_py.so, ...):
tried '...': mach-o file, but is an incompatible architecture
(have 'x86_64', need 'arm64e' or 'arm64')
```

R2022a's macOS DMG ships x86_64-only `gmatpy` bindings — it predates Apple Silicon support entirely. `macos-latest` is now arm64, so any Python loaded from `actions/setup-python` is arm64 and cannot dlopen R2022a's `.so`. R2025a and R2026a ship arm64-compatible bindings and are unaffected. There is no in-action workaround; pick a different GMAT version on `macos-latest`, or move R2022a coverage to a non-macOS runner. See the [supported-versions matrix](https://github.com/astro-tools/setup-gmat#supported-versions) in the README.

## Cache restore differs from a fresh install

This is not an error setup-gmat raises, but it can show up in workflows that snapshot `$GMAT_ROOT` and assert on its contents. The action's own self-test (`.github/workflows/ci.yml`, the `self-test` job) verifies bit-for-bit equivalence between a fresh download and a cache restore for everything _except_ `bin/api_startup_file.txt` and `__pycache__/` directories. Drift in those two paths is expected — they're regenerated per Python ABI when `BuildApiStartupFile.py` runs against the restored install.
