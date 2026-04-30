# setup-gmat

A GitHub Action that installs [NASA GMAT](https://gmat.gsfc.nasa.gov/) and bootstraps `gmatpy` for use in CI workflows.

```yaml
- uses: astro-tools/setup-gmat@v1
  with:
    version: R2026a
- run: python -c "import gmatpy"
```

A canonical Docker image on GitHub Container Registry is published alongside the action for ad-hoc local use and for downstream container layering.

```bash
docker run --rm -it ghcr.io/astro-tools/gmat:R2026a python -c "import gmatpy"
```

## Status

setup-gmat is under active development. The action is not yet usable.
