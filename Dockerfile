# syntax=docker/dockerfile:1.6

# Canonical astro-tools/setup-gmat GMAT base image.
#
# Stage 1 downloads + extracts the upstream GMAT Linux tarball; stage 2 layers
# pyenv-managed Pythons on top and bootstraps gmatpy. The image's contract is
# the same as the Action's: GMAT installed correctly and `import gmatpy`
# working in three pinned Pythons — nothing more. Downstream images layer on
# top via FROM.

ARG GMAT_VERSION=R2026a

# ---------- Stage 1: download + extract GMAT ----------
FROM ubuntu:24.04 AS gmat-installer

ARG GMAT_VERSION
ARG INSTALLER_SHA256=

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        tar \
        gzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/installer

# URL template and per-version size floors mirror src/download.ts:18-22,76 — keep
# them in sync. The size guard catches partial-body downloads from SourceForge
# mirrors that pass HTTP-level checks; --retry-all-errors handles mid-stream
# drops (vs --retry alone, which only fires on initial connection failures).
RUN case "${GMAT_VERSION}" in \
        R2022a) min_bytes=$((360 * 1024 * 1024)) ;; \
        R2025a) min_bytes=$((390 * 1024 * 1024)) ;; \
        R2026a) min_bytes=$((380 * 1024 * 1024)) ;; \
        *) echo "Unsupported GMAT_VERSION: ${GMAT_VERSION}" >&2; exit 1 ;; \
    esac \
    && url="https://sourceforge.net/projects/gmat/files/GMAT/GMAT-${GMAT_VERSION}/gmat-ubuntu-x64-${GMAT_VERSION}.tar.gz/download" \
    && echo "Downloading GMAT ${GMAT_VERSION} from ${url}" \
    && curl --location --fail --retry 5 --retry-all-errors \
        --output gmat.tar.gz "${url}" \
    && size=$(stat --format=%s gmat.tar.gz) \
    && if [ "${size}" -lt "${min_bytes}" ]; then \
        echo "Installer truncated: ${size} bytes < ${min_bytes} byte threshold" >&2; \
        exit 1; \
    fi \
    && observed_sha=$(sha256sum gmat.tar.gz | awk '{print $1}') \
    && echo "Installer SHA-256: ${observed_sha}" \
    && if [ -n "${INSTALLER_SHA256}" ] && [ "${INSTALLER_SHA256}" != "${observed_sha}" ]; then \
        echo "SHA-256 mismatch: expected ${INSTALLER_SHA256}, got ${observed_sha}" >&2; \
        exit 1; \
    fi

# Linux tarball wraps the install in `GMAT/<version>/` — matches the resolver
# in src/extract.ts:121. Verify the api/BuildApiStartupFile.py landmark before
# leaving stage 1, so a layout drift fails here rather than in stage 2.
RUN mkdir -p /staging \
    && tar -xzf /tmp/installer/gmat.tar.gz -C /staging \
    && rm /tmp/installer/gmat.tar.gz \
    && test -f "/staging/GMAT/${GMAT_VERSION}/api/BuildApiStartupFile.py" \
        || (echo "Expected GMAT_ROOT at /staging/GMAT/${GMAT_VERSION}; archive layout changed?" >&2 && exit 1)

# ---------- Stage 2: pyenv + Pythons + GMAT ----------
FROM ubuntu:24.04 AS final

ARG GMAT_VERSION
ARG INSTALLER_SHA256=
ARG ACTION_VERSION=
ARG PYTHON_VERSIONS="3.12 3.11 3.10"

ENV DEBIAN_FRONTEND=noninteractive \
    PYENV_ROOT=/opt/pyenv \
    PYTHON_310_VERSION=3.10.20 \
    PYTHON_311_VERSION=3.11.15 \
    PYTHON_312_VERSION=3.12.13

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libssl-dev \
        libffi-dev \
        libbz2-dev \
        libreadline-dev \
        libsqlite3-dev \
        zlib1g-dev \
        liblzma-dev \
        tk-dev \
        libncursesw5-dev \
        xz-utils \
        curl \
        ca-certificates \
        git \
    && rm -rf /var/lib/apt/lists/*

# pyenv pinned to v2.6.28. Tags on GitHub are mutable; pinning to the SHA
# prevents silent retargeting if the tag is ever moved.
RUN git clone --no-checkout https://github.com/pyenv/pyenv.git "${PYENV_ROOT}" \
    && git -C "${PYENV_ROOT}" checkout 485090e7131630b191305316571c06e4ecac3a35

ENV PATH="${PYENV_ROOT}/shims:${PYENV_ROOT}/bin:${PATH}"

# Install only the Pythons listed in PYTHON_VERSIONS, in the order given.
# `pyenv global` is set in the same order, so the first listed minor becomes
# `python` / `python3`. Default `"3.12 3.11 3.10"` keeps 3.12 as the image's
# default `python`. Single-Python builds (e.g. PYTHON_VERSIONS=3.11) yield a
# slim image where only that interpreter is on PATH.
RUN <<'EOF'
set -eu
if [ -z "$(echo "$PYTHON_VERSIONS" | tr -d '[:space:]')" ]; then
    echo "PYTHON_VERSIONS is empty; specify at least one of: 3.10 3.11 3.12" >&2
    exit 1
fi
patches=""
for minor in $PYTHON_VERSIONS; do
    case "$minor" in
        3.10) patches="$patches $PYTHON_310_VERSION" ;;
        3.11) patches="$patches $PYTHON_311_VERSION" ;;
        3.12) patches="$patches $PYTHON_312_VERSION" ;;
        *) echo "Unsupported PYTHON_VERSIONS entry '$minor'; supported: 3.10 3.11 3.12" >&2; exit 1 ;;
    esac
done
for patch in $patches; do
    pyenv install "$patch"
done
pyenv global $patches
pyenv rehash
EOF

COPY --from=gmat-installer /staging/GMAT/${GMAT_VERSION} /opt/gmat

# BuildApiStartupFile.py writes absolute paths into api/api_startup_file.txt —
# must run after the GMAT root is at its final location, otherwise the file
# bakes in the staging path and gmatpy import fails cryptically at runtime.
RUN cd /opt/gmat && python api/BuildApiStartupFile.py

# gmatpy ships at `<gmat_root>/bin/gmatpy/`, not under `api/` — `api/` carries
# the load_gmat.py / BuildApiStartupFile.py entry scripts but the package
# itself (and api_startup_file.txt) lives in bin/. PYTHONPATH set absolutely;
# `$GMAT_ROOT/bin:$PYTHONPATH` would expand to a trailing colon on a fresh
# image and put CWD on sys.path.
ENV GMAT_ROOT=/opt/gmat \
    PYTHONPATH=/opt/gmat/bin

# INSTALLER_SHA256 and ACTION_VERSION default to empty for local builds; the
# publish workflow (#61) computes/passes them at build time.
LABEL org.opencontainers.image.source="https://github.com/astro-tools/setup-gmat" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.title="astro-tools/gmat" \
      org.opencontainers.image.description="Canonical GMAT base image with gmatpy importable in pyenv-managed Python 3.10, 3.11, 3.12." \
      gmat.version="${GMAT_VERSION}" \
      gmat.source-url="https://sourceforge.net/projects/gmat/files/GMAT/GMAT-${GMAT_VERSION}/gmat-ubuntu-x64-${GMAT_VERSION}.tar.gz/download" \
      gmat.installer-sha256="${INSTALLER_SHA256}" \
      setup-gmat.version="${ACTION_VERSION}"
