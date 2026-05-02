# Changelog

All notable changes to setup-gmat are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-05-02

Canonical GMAT base image published on GHCR, with cosign keyless signing and a per-image gmatpy smoke gate before publish. Container-mode adoption is now a first-class recipe alongside the action.

### Added

- Multi-stage `Dockerfile` for the canonical GMAT base image: ubuntu:24.04 base, pyenv-managed Python 3.10/3.11/3.12, GMAT installed and `BuildApiStartupFile.py` resolved at build time, `GMAT_ROOT` and `PYTHONPATH` set so `import gmatpy` works in any of the three Pythons (#70, #72).
- `PYTHON_VERSIONS` build arg on the Dockerfile so downstream image builds can narrow the bundled Python set without forking the Dockerfile (#74).
- `docker.yml` GHCR publish workflow: builds the canonical image for every supported GMAT version on each `v*.*.*` tag, pushes per-version tags (`R2022a`, `R2025a`, `R2026a`) plus a `latest` alias floating to the newest supported release (#75).
- Per-image smoke gate that runs `import gmatpy` and a one-line propagation against each bundled Python before push, failing the workflow before any tag is published if the import or run regresses (#76).
- Cosign keyless signing for every pushed digest via GitHub OIDC, with the verification one-liner documented in the README (#77).
- Container-mode docs recipe (`docs/recipes/docker.md`) and runnable `examples/docker-mode.yml`: how to run a job inside `ghcr.io/astro-tools/gmat:Rxxxxa` instead of installing the action on a fresh runner (#78).
- Runnable workflow files in `examples/` mirroring the remaining recipe pages (`pytest.yml`, `run-mission-script.yml`, `skip-on-docs.yml`, `multi-version.yml`) so downstream repos can copy a complete `.github/workflows/*.yml` verbatim (#79).
- Marketplace listing pass for v0.3: branding, description, and inputs/outputs metadata refreshed (#80).

## [0.2.0] - 2026-05-01

Cross-platform coverage and full version matrix. setup-gmat now installs GMAT on Linux, Windows, and macOS runners against R2022a, R2025a, or R2026a — every cell of that matrix exercised in self-CI on every PR and on a weekly cron.

### Added

- Windows installer support and an OS-dispatch refactor that lifts the v0.1 Linux-hardcoded install path into per-OS `download` / `extract` modules (#48).
- macOS DMG installer support: `hdiutil attach` (read-only, `-nobrowse`, mountpoint under `RUNNER_TEMP`), `cp -R` of the resolved root off the mount, `hdiutil detach` (#49).
- Supported `version` input expanded from R2026a-only to R2022a, R2025a, and R2026a. R2023a and R2024a were never released by NASA and are explicitly rejected with a pointer to the FAQ (#47).
- Installer SHA-256 (first 12 chars) folded into the cache key, so a re-uploaded installer at the same SourceForge URL invalidates cleanly without a version bump (#50).
- Cross-platform self-CI matrix exercising every supported `(runner, version)` pair on every PR — `{ubuntu-latest, windows-latest, macos-latest}` × `{R2022a, R2025a, R2026a}`, with `macos-latest × R2022a` excluded (R2022a's macOS DMG ships x86_64-only `gmatpy` bindings and Apple Silicon runners cannot dlopen it) (#51).
- Weekly self-CI cron on `main` (Mondays 06:00 UTC) — early-warning channel for SourceForge URL drift, mirror retirements, and installer-archive layout changes (#52).
- Mirror-drift `drift.yml` workflow: a daily HEAD-only liveness check across every supported `(version, OS)` triple that fails before a download attempt would (#53).
- `uv`-based Python 3.9 install for R2022a in the self-test matrix, since `actions/setup-python@v5` no longer ships 3.9 binaries on every runner (#55).
- Multi-version compatibility recipe documenting the full `{ubuntu, windows, macos} × {R2022a, R2025a, R2026a}` matrix with the `macos × R2022a` exclude and per-version Python pin (#56).
- Troubleshooting and FAQ updates covering Windows-specific failure modes, macOS DMG mount/architecture failures, and the R2023a / R2024a version gap (#57).
- README and docs landing surface refreshed for the v0.2 surface: 3-OS quick-start matrix, supported-versions table, Python ABI per GMAT release table, and `_(current)_` roadmap row updated (#58).

### Changed

- v0.1's R2026a-hardcoded assumptions removed: cache key, smoke check, and version-resolution logic are now driven by the validated `version` input rather than embedded R2026a constants (audit folded into #47).
- v0.1's Linux-hardcoded assumptions removed: `download` / `extract` / `GMAT_ROOT` resolution moved behind a per-OS dispatch instead of a single Linux tarball path (audit folded into #48).

## [0.1.0] - 2026-04-30

First usable release. Installs GMAT R2026a on Ubuntu runners and bootstraps gmatpy for use in CI.

### Added

- GitHub Action that installs GMAT for the requested version on the requested runner OS, runs `BuildApiStartupFile.py`, and smoke-checks the install with a one-line gmatpy propagation against a stock sample (#19, #20, #21, #22, #23, #25).
- Inputs: `version` (default `R2026a`), `cache` (default `true`), `python-version` (optional override) (#19).
- Outputs: `gmat-root`, `gmat-version`, `cache-hit`. `GMAT_ROOT` is also exported to the workflow environment so subsequent steps see it without reading outputs (#25).
- Install caching via `@actions/cache`, keyed on action major version, GMAT version, runner OS, and runner architecture (#24).
- Self-CI on `ubuntu-latest` × `R2026a` running two consecutive jobs (cache miss, then cache hit) and asserting the resolved root is byte-identical between runs (#26).
- Node 24 runtime, single-file `dist/index.js` bundle via `@vercel/ncc`, and a CI gate that fails the build if `dist/` drifts from `src/` (#1, #18).
- MkDocs Material documentation site at <https://astro-tools.github.io/setup-gmat/>: getting started, inputs/outputs reference, FAQ, troubleshooting, and recipes (pytest, mission script, skip-on-docs) (#13, #14, #30, #31, #32).
- README rewritten around real v0.1 usage with a supported-versions table, Python prerequisite, and a matrix-CI quick-start (#12, #29, #34).

### Fixed

- Resolve `GMAT_ROOT` by walking installer wrapper directories instead of guessing a fixed depth, so installs whose archive layout adds an extra wrapper level still resolve correctly (#28).
