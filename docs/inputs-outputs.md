# Inputs and outputs

## Inputs

| Name             | Required | Default  | Description                                                                              |
| ---------------- | -------- | -------- | ---------------------------------------------------------------------------------------- |
| `version`        | no       | `R2026a` | GMAT release to install. v0.1 supports `R2026a` only on Linux.                           |
| `cache`          | no       | `true`   | Cache the resolved install across runs via `actions/cache`.                              |
| `python-version` | no       | `""`     | Python interpreter for `BuildApiStartupFile.py`. If empty, the `python` on PATH is used. |

## Outputs

| Name           | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `gmat-root`    | Absolute path to the resolved GMAT install root.                      |
| `gmat-version` | GMAT release that was installed.                                      |
| `cache-hit`    | `"true"` if the install was restored from cache, `"false"` otherwise. |

## Environment variables

The action exports `GMAT_ROOT` into the workflow environment so subsequent steps see the install root without having to read the action output.
