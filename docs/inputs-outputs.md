# Inputs and outputs

## Inputs

| Name             | Required | Default  | Description                                                                                                                                                                                       |
| ---------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`        | no       | `R2026a` | GMAT release to install. Supported values: `R2022a`, `R2025a`, `R2026a`. Any other value raises a validation error before the download starts.                                                    |
| `cache`          | no       | `true`   | Cache the resolved install across runs via `actions/cache`. Pass `'false'` to force a fresh download every run.                                                                                   |
| `python-version` | no       | `''`     | Informational only — the value is logged but does **not** select the interpreter. To pin Python, configure [`actions/setup-python`](https://github.com/actions/setup-python) before `setup-gmat`. |

## Outputs

| Name           | Description                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------- |
| `gmat-root`    | Absolute path to the resolved GMAT install root. Equal to `$RUNNER_TEMP/gmat` in v0.1.        |
| `gmat-version` | GMAT release that was installed. Echoes the validated `version` input.                        |
| `cache-hit`    | `'true'` if the install was restored from cache, `'false'` if downloaded and extracted fresh. |

## Environment variables

`setup-gmat` exports `GMAT_ROOT` into the workflow environment, so subsequent steps can reference `$GMAT_ROOT` (or `${{ env.GMAT_ROOT }}` in expressions) without reading the action output.

`PYTHONPATH` is **not** modified. To `import gmatpy` from your own steps, set `PYTHONPATH=${{ env.GMAT_ROOT }}/bin` per-step or `sys.path.insert` from inside Python — see [Getting started → Calling gmatpy from your own steps](getting-started.md#calling-gmatpy-from-your-own-steps).

## Install path and layout

GMAT is extracted to `$RUNNER_TEMP/gmat` (the same path is reported as `gmat-root`). The action overwrites this directory if it already exists.

Notable paths under `$GMAT_ROOT`:

| Path                         | What's there                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `bin/`                       | GMAT shared libraries, `GmatConsole`, and the `gmatpy` package.                                                                 |
| `bin/gmatpy/`                | The Python package. Add `bin/` to `PYTHONPATH` or `sys.path` to import it.                                                      |
| `bin/api_startup_file.txt`   | Written by `BuildApiStartupFile.py`; passed to `gmat.Setup(...)` before the API is usable.                                      |
| `api/BuildApiStartupFile.py` | The bootstrap script `setup-gmat` runs after extraction.                                                                        |
| `samples/`                   | Stock GMAT mission scripts. The action's smoke check uses the stock high-fidelity SRP sample (filename varies by GMAT release). |

## Cache key

When `cache: true`, the install is keyed as:

```
setup-gmat-v0-${version}-${RUNNER_OS}-${RUNNER_ARCH}
```

For example: `setup-gmat-v0-R2026a-Linux-X64`. The key changes when:

- The `version` input changes.
- GitHub upgrades the runner image to a different `RUNNER_OS` / `RUNNER_ARCH` label.
- A breaking change to the action's cache layout bumps the `v0` prefix in a future major release of setup-gmat.

The key is **not** sensitive to the action's minor or patch version, the upstream installer's checksum, or the contents of `BuildApiStartupFile.py`. To force a fresh install in a single run without changing inputs, pass `cache: false`.

See [GitHub's cache scope rules](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows#restrictions-for-accessing-a-cache) for cross-branch and cross-PR behavior.

## Download integrity

Before extraction, the action verifies the downloaded archive against a hardcoded per-version minimum size (e.g. ≈380 MiB for R2026a). A truncated, redirected, or HTML-mirror response fails fast with an explicit error rather than producing a confusing extraction failure later. See [Troubleshooting → Installer download appears truncated](troubleshooting.md#installer-download-appears-truncated).
