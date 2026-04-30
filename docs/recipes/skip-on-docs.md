# Skip the GMAT install on docs-only changes

Installing GMAT R2026a is a multi-hundred-megabyte download and a few minutes of CI time. Skipping the install on docs-only changes (READMEs, MkDocs pages, design notes) keeps PRs cheap when no code is touched.

The fix is GitHub's built-in `paths-ignore` filter on the workflow trigger.

## Skip the heavy install on docs-only changes

```yaml
name: gmat-ci

on:
  pull_request:
    paths-ignore:
      - '**.md'
      - 'docs/**'
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - uses: astro-tools/setup-gmat@v0.1
        with:
          version: R2026a
      # ... your test / propagation steps
```

A PR that only touches `**.md` or anything under `docs/**` is now skipped entirely — no install, no cache restore, no smoke check.

## The inverse — docs-only jobs

For a separate workflow that builds docs and should _only_ run on docs changes, use `paths` (the inverse of `paths-ignore`):

```yaml
name: docs

on:
  pull_request:
    paths:
      - 'docs/**'
      - 'mkdocs.yml'
      - '.github/workflows/docs.yml'
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install mkdocs-material
      - run: mkdocs build --strict
```

This pattern keeps the docs build off the critical path of every code PR while still gating docs changes on a successful build.

## Required-status-check gotcha

If branch protection requires the GMAT-install workflow as a status check, a `paths-ignore`-skipped run produces _no_ status — not a passing one — which can block PRs from merging. Two common fixes:

- **Drop the requirement** for that workflow if the docs paths are genuinely safe to merge without it.
- **Add a thin always-runs job** in the same workflow file that produces the required status. The skip filter applies per-workflow, not per-job, but you can split the heavy work into a separate workflow that's `paths-ignore`-filtered while a lightweight workflow with the same required status name runs unconditionally.

GitHub's documentation calls this the "required check that never runs" problem; the workaround you choose depends on how strict your branch protection needs to be.
