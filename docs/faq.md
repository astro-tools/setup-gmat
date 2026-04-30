# FAQ

## Why do I need `actions/setup-python` before `setup-gmat`?

`setup-gmat` shells out to Python twice: once to run `BuildApiStartupFile.py`, once for an internal smoke check that imports `gmatpy` and runs a stock sample. Both calls resolve `python` from `PATH` via [`@actions/io`'s `which`](https://github.com/actions/toolkit/tree/main/packages/io). The action does not bundle its own interpreter; it deliberately defers the Python version choice to the workflow.

If `python` isn't on `PATH`, the action fails with:

```
python is not on PATH (...). Add a 'uses: actions/setup-python@v5' step before setup-gmat.
```

Any mechanism that puts a `python` binary on `PATH` works — `actions/setup-python` is the standard one. GMAT R2026a's pre-built `gmatpy` modules support Python 3.9 through 3.14.

## When does the GMAT cache get invalidated?

The cache key is `setup-gmat-v0-${version}-${RUNNER_OS}-${RUNNER_ARCH}` — see [Inputs and outputs → Cache key](inputs-outputs.md#cache-key). The cache misses (and a fresh download runs) when:

- You change the `version` input.
- GitHub upgrades the runner image to a different `RUNNER_OS` or `RUNNER_ARCH` label.
- A breaking change to setup-gmat's cache layout bumps the `v0` prefix in a future major release.

The key is **not** sensitive to the action's minor or patch version, the upstream installer's checksum, or the `api_startup_file.txt` written per Python ABI. To force a fresh install in a single run without changing inputs, pass `cache: false`.

## Which GMAT versions are supported?

The action installs **R2022a, R2025a, or R2026a** on Linux and Windows runners. Any other value for `version` raises a validation error at parse time, before any download.

NASA never released R2023a or R2024a — there are no SourceForge artifacts for those versions, and they will not appear in any version matrix this action ships. macOS runner support is tracked under a future milestone.

## Why does `python -c "import gmatpy"` fail in a step after `setup-gmat`?

`gmatpy` lives at `$GMAT_ROOT/bin/gmatpy/`, which is not on Python's import path by default — `setup-gmat` does not modify `PYTHONPATH`. Set it on the step that needs it:

```yaml
- run: python -c "import gmatpy"
  env:
    PYTHONPATH: ${{ env.GMAT_ROOT }}/bin
```

See [Getting started → Calling gmatpy from your own steps](getting-started.md#calling-gmatpy-from-your-own-steps) for the recommended patterns. The action's own smoke check works because it uses `sys.path.insert` from inside an inlined Python script, not `PYTHONPATH`.

## Can I use setup-gmat outside CI, on my laptop?

The action is built around the `@actions/*` toolkit and assumes a runner-like environment (`RUNNER_TEMP`, `GITHUB_ENV`, `actions/cache`). It is not designed for direct local invocation.

For local use, install GMAT directly from [SourceForge](https://sourceforge.net/projects/gmat/) and run `BuildApiStartupFile.py` against it manually. A canonical Docker image on GHCR is planned for **v0.3** but is not yet published.

## Does setup-gmat verify the download?

It checks the archive size against a hardcoded per-version minimum (e.g. ≈380 MiB for R2026a) before extraction, which catches truncated downloads and SourceForge HTML-mirror responses. It does **not** verify a checksum or signature in v0.1 — supply-chain hardening (cosign-signed Docker image, attested provenance) is on the v0.3 roadmap.
