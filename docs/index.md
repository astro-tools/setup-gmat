# setup-gmat

A GitHub Action that installs [NASA GMAT](https://gmat.gsfc.nasa.gov/) and bootstraps `gmatpy` for use in CI workflows.

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
- uses: astro-tools/setup-gmat@v0.1
  with:
    version: R2026a
```

## Status

v0.1 is the first usable release: GMAT R2026a on Linux runners (`ubuntu-latest`), caching across runs, and a built-in smoke check that loads and runs a stock GMAT sample. Windows and macOS support and the R2022a–R2026a version matrix are scoped for v0.2; see the [README roadmap](https://github.com/astro-tools/setup-gmat#roadmap) for the full plan.

## Where to next

- [Getting started](getting-started.md) — minimum workflow, prerequisites, and how to call `gmatpy` from your own steps.
- [Inputs and outputs](inputs-outputs.md) — full reference for `action.yml`, including cache key shape and install layout.
- [FAQ](faq.md) — Python prerequisite, cache invalidation, supported versions.
- [Troubleshooting](troubleshooting.md) — known failure modes mapped to the action's error messages.
