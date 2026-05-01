"""Cross-platform helpers for the self-test cache-equivalence assertion.

Two modes:

  snapshot <root> <out>   Walk <root>, hash each non-excluded file with SHA-256,
                          and write `<hash>  <relpath>\n` lines sorted by path
                          to <out>. Identical output across Linux/Windows/macOS.

  reset    <root>         Recursively delete <root>, ignoring "missing" but
                          surfacing every other error (permissions, etc.).

Excluded from snapshots:
  - basenames: api_startup_file.txt (rebuilt per install), .DS_Store, Thumbs.db,
    desktop.ini (OS-injected metadata)
  - extensions: .pyc (compiled at import time)
  - any path segment named __pycache__
"""

from __future__ import annotations

import hashlib
import shutil
import sys
from pathlib import Path

EXCLUDE_BASENAMES = frozenset(
    {"api_startup_file.txt", ".DS_Store", "Thumbs.db", "desktop.ini"}
)
EXCLUDE_SUFFIXES = frozenset({".pyc"})
EXCLUDE_PATH_SEGMENTS = frozenset({"__pycache__"})

CHUNK_SIZE = 1 << 20


def is_excluded(rel: Path) -> bool:
    if rel.name in EXCLUDE_BASENAMES:
        return True
    if rel.suffix in EXCLUDE_SUFFIXES:
        return True
    return any(part in EXCLUDE_PATH_SEGMENTS for part in rel.parts)


def hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(CHUNK_SIZE), b""):
            h.update(chunk)
    return h.hexdigest()


def snapshot(root: Path, out: Path) -> None:
    if not root.is_dir():
        sys.exit(f"snapshot: root {root} is not a directory")
    entries: list[str] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.is_symlink():
            continue
        rel = path.relative_to(root)
        if is_excluded(rel):
            continue
        entries.append(f"{hash_file(path)}  {rel.as_posix()}")
    entries.sort()
    out.write_text("\n".join(entries) + "\n", newline="\n")
    print(f"snapshot: wrote {len(entries)} entries to {out}")


def reset(root: Path) -> None:
    if not root.exists():
        print(f"reset: {root} does not exist, nothing to do")
        return
    shutil.rmtree(root)
    print(f"reset: removed {root}")


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        sys.exit("usage: snapshot-install.py {snapshot <root> <out> | reset <root>}")
    mode = argv[1]
    if mode == "snapshot":
        if len(argv) != 4:
            sys.exit("usage: snapshot-install.py snapshot <root> <out>")
        snapshot(Path(argv[2]), Path(argv[3]))
    elif mode == "reset":
        if len(argv) != 3:
            sys.exit("usage: snapshot-install.py reset <root>")
        reset(Path(argv[2]))
    else:
        sys.exit(f"unknown mode: {mode!r}")


if __name__ == "__main__":
    main(sys.argv)
