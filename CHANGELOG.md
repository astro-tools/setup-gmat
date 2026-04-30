# Changelog

All notable changes to setup-gmat are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
