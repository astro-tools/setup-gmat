# Run jobs in the GMAT container image

Runnable copy: [`examples/docker-mode.yml`](https://github.com/astro-tools/setup-gmat/blob/v0/examples/docker-mode.yml)

A workflow that runs its job inside `ghcr.io/astro-tools/gmat:R2026a` instead of installing GMAT on a fresh runner. The image ships GMAT pre-installed with `gmatpy` already importable, so the job skips the `setup-gmat` step entirely.

Reach for this shape over the action when you want any of:

- **No cold cache** on the first run of a new branch — the image already contains the install, where the action has to download GMAT (or restore the cache) before the test step starts.
- **A fixed Python set** that does not depend on `actions/setup-python` resolving the same minor across runs. The image ships pyenv-managed 3.10, 3.11, and 3.12.
- **A more controlled environment** than a stock GitHub-hosted runner — same OS image, same toolchain, every run.

The action remains the right choice when you need cross-OS coverage (`windows-latest`, `macos-latest`), a Python minor outside the image's set, or any tooling layered via other GitHub-hosted-runner conveniences.

## Workflow

```yaml
name: tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/astro-tools/gmat:R2026a
    steps:
      - uses: actions/checkout@v5

      - name: Install test dependencies
        run: pip install pytest

      - name: Run integration tests
        run: pytest -m integration
```

There is no `setup-gmat` step and no `actions/setup-python` step. Inside the container, `GMAT_ROOT=/opt/gmat` and `PYTHONPATH=/opt/gmat/bin` are already set as image-level `ENV`s, and `python` resolves to the image's default interpreter (3.12). `import gmatpy` works on the first try.

`pytest -m integration` is illustrative — substitute whatever invocation the consumer project uses. The point is that the test step does not need to know about `GMAT_ROOT` or `PYTHONPATH`; both are inherited from the container.

## Picking a Python minor

The image installs 3.10, 3.11, and 3.12 via pyenv, in that order. The first listed minor (3.12) is `pyenv global`, so plain `python` and `python3` resolve to it. To run against a different minor, call it explicitly:

```yaml
- name: Run integration tests on Python 3.10
  run: python3.10 -m pytest -m integration
```

`python3.10`, `python3.11`, and `python3.12` are all on `PATH` and all have `gmatpy` registered against their respective ABIs by `BuildApiStartupFile.py` at image-build time.

## Trade-offs vs the action

- **No `actions/setup-python`.** The image's Python set is fixed (3.10 / 3.11 / 3.12 from pyenv). Layering `actions/setup-python` on top would install a separate interpreter that has no `gmatpy` bindings and would shadow the pyenv shims on `PATH`. If the project needs a Python minor outside `{3.10, 3.11, 3.12}`, use the action with `actions/setup-python` instead — see the [pytest recipe](pytest.md) for that shape.
- **Linux only.** The image is a Linux container; `runs-on: ubuntu-latest` is the only supported runner. Cross-OS coverage (`windows-latest`, `macos-latest`) requires the action — see [Validate against every GMAT version on every OS](multi-version.md).
- **One GMAT version per job.** The container's GMAT is baked at image-build time. To exercise multiple versions, parametrize the image tag in the matrix:

  ```yaml
  strategy:
    matrix:
      version: [R2022a, R2025a, R2026a]
  container:
    image: ghcr.io/astro-tools/gmat:${{ matrix.version }}
  ```

  `R2022a`'s image only ships gmatpy bindings for Python 3.10, so a multi-version matrix needs `python3.10` on the test step for that cell — see the [Python ABI table](https://github.com/astro-tools/setup-gmat#python-abi-per-gmat-release) in the README.

## Verifying the image

Every published image is signed with cosign keyless OIDC. Verify provenance before relying on a tag — see [Verifying images](https://github.com/astro-tools/setup-gmat#verifying-images) in the README for the one-liner. The signature is bound to the manifest digest, so verifying a tag pins you to the exact bytes that were signed.

Verification is most useful on workstations and self-hosted runners; GitHub-hosted runners pull from GHCR over HTTPS against the same registry that issued the signature, so the trust chain is already short.

## Common failures

- `ModuleNotFoundError: No module named 'gmatpy'` — the test step is calling a Python interpreter that is not one of the image's pyenv-managed ones. The image's `gmatpy` registration is per-interpreter; a manually-installed Python (e.g. via `apt-get install python3.13` inside a step) has no bindings. Use `python`, `python3.10`, `python3.11`, or `python3.12`.
- `Unable to find image 'ghcr.io/astro-tools/gmat:Rxxxxa' locally` followed by `denied` from the registry — the requested tag does not exist. Check the [supported version set](https://github.com/astro-tools/setup-gmat#supported-versions); the published tags are `R2022a`, `R2025a`, `R2026a`, and `latest`.
- The job runs but `actions/checkout@v5` reports `git: command not found` — only happens on minimal base images that strip `git`. The GMAT base image keeps `git` installed (pyenv depends on it), so this is not expected here; if it surfaces, the image was overridden to a downstream variant that removed it.
