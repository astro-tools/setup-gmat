# Contributing to setup-gmat

Thanks for your interest. This page is the one place to learn the workflow.

## Getting set up

```bash
git clone https://github.com/astro-tools/setup-gmat.git
cd setup-gmat
nvm use   # picks up .nvmrc → Node 20
npm ci
```

## Branches and PRs

- One issue per branch. Branch names use a short prefix for type:
  - `feat/<slug>` — new capability, tied to a `type:feature` issue.
  - `fix/<slug>` — bug fix, tied to a `type:bug` issue.
  - `chore/<slug>` — infra / tooling / hygiene.
  - `docs/<slug>` — docs-only change.
- Open a PR against `main`. Put `Closes #<N>` in the PR description so the issue auto-closes on merge and the project board advances the card to Done.
- Squash-merge is the only merge method. The PR title becomes the squash commit subject — write it as a complete imperative sentence.

## Local checks before pushing

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

`npm run all` runs all four in sequence. CI re-runs them on every PR.

### dist/ is committed

The bundled action runtime lives at `dist/index.js`. CI verifies that running `npm run build` produces no diff against the committed `dist/`. If you change anything under `src/`, run `npm run build` and commit the regenerated bundle in the same PR. If you forget, CI fails the "Verify dist/ matches src/" step.

## Commit messages

Keep them short and imperative. One subject line, optional body.

- "Add Linux installer URL resolver"
- "Fix smoke-check exit code surfacing on macOS"

Do not include AI or tool attribution trailers in commits, PR titles, PR descriptions, or comments.

## CHANGELOG

Feature and fix PRs do **not** edit `CHANGELOG.md`. The release-cut PR aggregates the whole version section in one place.

## Scope discipline

setup-gmat's scope is deliberately narrow: install GMAT and prove `gmatpy` imports. Mission running, output parsing, and astrodynamics validation belong in sibling projects (`gmat-run`, `astro-validate`). Before opening a feature issue, check the [charter](https://github.com/astro-tools/setup-gmat) and existing issues to make sure the work belongs here.

## Questions

Open a [discussion in the org profile repo](https://github.com/astro-tools/.github/discussions) rather than a setup-gmat issue for open-ended questions, usage help, or brainstorming.
