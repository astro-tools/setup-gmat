# syntax=docker/dockerfile:1.6

# Canonical astro-tools/setup-gmat GMAT base image.
#
# Stage 1 downloads + extracts the upstream GMAT Linux tarball; stage 2 layers
# pyenv-managed Pythons on top and bootstraps gmatpy. The image's contract is
# the same as the Action's: GMAT installed correctly and `import gmatpy`
# working in three pinned Pythons. Sibling astro-tools projects (gmat-run,
# astro-validate) layer on top via FROM rather than being baked in here.

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

# pyenv pinned to v2.5.7. Tags on GitHub are mutable; pinning to the SHA
# prevents silent retargeting if the tag is ever moved.
RUN git clone --no-checkout https://github.com/pyenv/pyenv.git "${PYENV_ROOT}" \
    && git -C "${PYENV_ROOT}" checkout f216b4bfb1598347137ecb3c4a8f893baf9ea37f

ENV PATH="${PYENV_ROOT}/shims:${PYENV_ROOT}/bin:${PATH}"

# 3.12 listed first so `python` / `python3` resolve to the newest minor;
# `python3.10` and `python3.11` shims still resolve to their own installs.
RUN pyenv install "${PYTHON_310_VERSION}" \
    && pyenv install "${PYTHON_311_VERSION}" \
    && pyenv install "${PYTHON_312_VERSION}" \
    && pyenv global \
        "${PYTHON_312_VERSION}" \
        "${PYTHON_311_VERSION}" \
        "${PYTHON_310_VERSION}" \
    && pyenv rehash

COPY --from=gmat-installer /staging/GMAT/${GMAT_VERSION} /opt/gmat

# BuildApiStartupFile.py writes absolute paths into api/api_startup_file.txt —
# must run after the GMAT root is at its final location, otherwise the file
# bakes in the staging path and gmatpy import fails cryptically at runtime.
RUN cd /opt/gmat && python api/BuildApiStartupFile.py

# A fresh image has no PYTHONPATH; the issue spec's `$GMAT_ROOT/api:$PYTHONPATH`
# would expand to a trailing colon, which Python interprets as CWD on sys.path.
# Set the path absolutely.
ENV GMAT_ROOT=/opt/gmat \
    PYTHONPATH=/opt/gmat/api

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
