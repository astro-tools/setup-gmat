# setup-gmat

GitHub Action and canonical Docker image for installing [NASA GMAT](https://gmat.gsfc.nasa.gov/) (General Mission Analysis Tool) and bootstrapping `gmatpy` in CI.

```yaml
- uses: astro-tools/setup-gmat@v1
  with:
    version: R2026a
    cache: true
- run: python -c "import gmatpy"
```

```bash
docker run --rm -it ghcr.io/astro-tools/gmat:R2026a python -c "import gmatpy"
```

## Status

Under active development. The v0.1 install path is not implemented yet — invoking the action today fails with an explicit "not implemented" message. Track progress in the [setup-gmat development project](https://github.com/orgs/astro-tools/projects/5).

## What it does (planned)

- Resolves the GMAT installer URL for the requested version and runner OS.
- Restores the install from cache, or downloads and extracts a fresh copy.
- Runs `BuildApiStartupFile.py` against the resolved `GMAT_ROOT`.
- Smoke-checks the install with a one-line propagation against a stock sample.
- Exports `GMAT_ROOT` to the workflow environment and writes outputs (`gmat-root`, `gmat-version`, `cache-hit`).

`actions/setup-python` (or any equivalent that puts `python` on PATH) is a prerequisite — setup-gmat does not bundle its own Python interpreter.

## Roadmap

| Release    | Scope                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| v0.1 (MVP) | Linux + R2026a, basic caching, smoke check, gmat-run CI consumes the action. |
| v0.2       | Windows + macOS, R2022a–R2026a matrix, weekly self-CI cron.                  |
| v0.3       | Docker image on GHCR, semantic-release wired up, cosign image signing.       |
| v1.0       | Public API stability; at least two external consumers shipped on the action. |

See the project [charter](https://github.com/astro-tools/setup-gmat/blob/main/docs/charter.md) for the longer-form scope and acceptance criteria. _(Charter source lives in `files/projects/setup-gmat-charter.docx` for now and will be ported to docs in a follow-up.)_

## License

[MIT](LICENSE).
