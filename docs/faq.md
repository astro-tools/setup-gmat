# FAQ

## Why do I need `actions/setup-python` before `setup-gmat`?

`setup-gmat` shells out to Python twice: once to run `BuildApiStartupFile.py`, once for an internal smoke check that imports `gmatpy` and runs a stock sample. Both calls resolve `python` from `PATH` via [`@actions/io`'s `which`](https://github.com/actions/toolkit/tree/main/packages/io). The action does not bundle its own interpreter; it deliberately defers the Python version choice to the workflow.

If `python` isn't on `PATH`, the action fails with:

```
python is not on PATH (...). Add a 'uses: actions/setup-python@v5' step before setup-gmat.
```

Any mechanism that puts a `python` binary on `PATH` works — `actions/setup-python` is the standard one. The Python version you pin must match a `gmatpy` binding shipped by the GMAT release you're installing — R2022a covers 3.6–3.9 (Linux extends to 3.10), R2025a covers 3.9–3.12, R2026a covers 3.9–3.14. See the [Python ABI table](https://github.com/astro-tools/setup-gmat#python-abi-per-gmat-release) in the README for the cross-OS view.

## Are there OS-specific Python gotchas?

Mostly not — the action shells out to whatever `python` is on `PATH` on every OS. The differences worth knowing:

- **Linux**: standard. Pin a `python-version` inside the GMAT release's ABI window and you're done. No platform-specific quirks.
- **Windows**: pin a `python-version` that `actions/setup-python` actually publishes a Windows build for; an unpublished version installs nothing and the next step that needs `python` fails with the usual "not on PATH" error. On self-hosted Windows runners, the Windows Store launcher stub at `%LocalAppData%\Microsoft\WindowsApps\python.exe` can intercept `which python` even after `setup-python` runs successfully — see [Troubleshooting → `python` is not on `PATH`](troubleshooting.md#python-is-not-on-path) for the fix.
- **macOS**: `macos-latest` is Apple Silicon (arm64) since 2024. `actions/setup-python` installs an arm64 Python, which is the right choice for R2025a and R2026a (their DMGs ship arm64-compatible `gmatpy` bindings) but **not** for R2022a — its DMG is x86_64-only. Either pick a different GMAT version on `macos-latest` or move R2022a coverage to a non-macOS runner. See [Troubleshooting → macOS architecture mismatch](troubleshooting.md#macos-architecture-mismatch-r2022a-only).

## When does the GMAT cache get invalidated?

The cache key is `setup-gmat-v0-${version}-${RUNNER_OS}-${RUNNER_ARCH}` — see [Inputs and outputs → Cache key](inputs-outputs.md#cache-key). The cache misses (and a fresh download runs) when:

- You change the `version` input.
- GitHub upgrades the runner image to a different `RUNNER_OS` or `RUNNER_ARCH` label.
- A breaking change to setup-gmat's cache layout bumps the `v0` prefix in a future major release.

The key is **not** sensitive to the action's minor or patch version, the upstream installer's checksum, or the `api_startup_file.txt` written per Python ABI. To force a fresh install in a single run without changing inputs, pass `cache: false`.

## Which GMAT versions are supported?

The action installs **R2022a, R2025a, or R2026a** on Linux, Windows, and macOS runners — with one exception: R2022a is not supported on `macos-latest`. R2022a's macOS DMG ships x86_64-only `gmatpy` `.so` files (predates Apple Silicon entirely) and Apple Silicon Python cannot dlopen them. R2025a and R2026a ship arm64-compatible bindings and run natively on Apple Silicon. See the [supported-versions matrix](https://github.com/astro-tools/setup-gmat#supported-versions) in the README for the full table.

Any other value for `version` raises a validation error at parse time, before any download. NASA never released R2023a or R2024a — see [What about R2023a and R2024a?](#what-about-r2023a-and-r2024a) below.

## What about R2023a and R2024a?

NASA never released them. The gap between R2022a and R2025a is real, not a packaging oversight on this action's part — there are no SourceForge artifacts for `R2023a` or `R2024a`, and `setup-gmat` will not add them.

The version input is validated at parse time, so a workflow that asks for one of the missing releases fails fast before any download:

```
Unsupported GMAT version "R2023a". Supported versions: R2022a, R2025a, R2026a.
```

Don't add `R2023a` or `R2024a` to a matrix expecting them to be skipped — they're not on the to-do list and the validation error is intentional.

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

It checks the archive size against a hardcoded per-version minimum (e.g. ≈380 MiB for R2026a) before extraction, which catches truncated downloads and SourceForge HTML-mirror responses. It does **not** verify a checksum or signature — supply-chain hardening (cosign-signed Docker image, attested provenance) is on the v0.3 roadmap.
