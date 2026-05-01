# setup-gmat

A GitHub Action that installs [NASA GMAT](https://gmat.gsfc.nasa.gov/) and bootstraps `gmatpy` for use in CI workflows.

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
- uses: astro-tools/setup-gmat@v0
  with:
    version: R2026a
```

## Status

setup-gmat installs GMAT (R2022a, R2025a, or R2026a) on Linux runners (`ubuntu-latest`), Windows runners (`windows-latest`), and macOS runners (`macos-latest`), caches across runs, and runs a built-in smoke check that loads and runs a stock GMAT sample. R2022a × `macos-latest` is the one combo not supported — R2022a's macOS DMG is x86_64-only and Apple Silicon runners cannot dlopen it. R2025a and R2026a run natively on Apple Silicon.

## Where to next

- [Getting started](getting-started.md) — minimum workflow, prerequisites, and how to call `gmatpy` from your own steps.
- [Inputs and outputs](inputs-outputs.md) — full reference for `action.yml`, including cache key shape and install layout.
- [FAQ](faq.md) — Python prerequisite, cache invalidation, supported versions.
- [Troubleshooting](troubleshooting.md) — known failure modes mapped to the action's error messages.
