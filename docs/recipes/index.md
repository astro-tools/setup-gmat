# Recipes

Worked-example workflows for common shapes. Each recipe runs as-is on `ubuntu-latest` against `astro-tools/setup-gmat@v0.1` — no external dependencies, no secret-gated steps. Copy, adapt, ship.

- [Run pytest against gmatpy](pytest.md) — install GMAT and run a `pytest` suite whose tests `import gmatpy`. Sets `PYTHONPATH` on the test step.
- [Run a mission script and upload its report](run-mission-script.md) — drive a `.script` file via `gmatpy.LoadScript` / `RunScript` from Python, write a report, and upload it as a build artifact.
- [Skip the GMAT install on docs-only changes](skip-on-docs.md) — use `paths-ignore` to keep the heavy install off PRs that only touch READMEs or `docs/`. Includes the inverse `paths` filter for docs-only jobs.

For the underlying mechanics each recipe builds on, see [Getting started](../getting-started.md), [Inputs and outputs](../inputs-outputs.md), and [Troubleshooting](../troubleshooting.md).
