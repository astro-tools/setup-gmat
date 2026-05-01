import * as nodeOs from 'node:os';
import * as path from 'node:path';
import * as cache from '@actions/cache';
import * as core from '@actions/core';

const ACTION_MAJOR_VERSION = 'v0';
const SHA12_LENGTH = 12;

export async function restoreCache(version: string): Promise<{ hit: boolean; path: string }> {
  const installPath = canonicalInstallPath();
  const prefix = composePrefix(version);
  // SHA-256 isn't known until we download the archive, so the exact key can't
  // be formed up front. Probe with a sentinel that never matches and fall back
  // to a prefix match via restoreKeys, accepting any prior installer's cache
  // for this version/OS/arch.
  const probeKey = `${prefix}__probe__`;
  core.info(`Restoring GMAT cache (prefix=${prefix}, path=${installPath})`);
  const matched = await cache.restoreCache([installPath], probeKey, [prefix]);
  if (matched !== undefined) {
    core.info(`Cache hit: ${matched}`);
  }
  return { hit: matched !== undefined, path: installPath };
}

export async function saveCache(
  version: string,
  sha256: string,
  installPath: string,
): Promise<void> {
  const key = composeKey(version, sha256);
  core.info(`Saving GMAT cache (key=${key}, path=${installPath})`);
  try {
    await cache.saveCache([installPath], key);
  } catch (err) {
    if (err instanceof cache.ReserveCacheError) {
      core.warning(`Cache already exists for key ${key}, skipping save: ${err.message}`);
      return;
    }
    throw err;
  }
}

function composePrefix(version: string): string {
  const runnerOs = process.env.RUNNER_OS ?? 'unknown-os';
  const runnerArch = process.env.RUNNER_ARCH ?? 'unknown-arch';
  return `setup-gmat-${ACTION_MAJOR_VERSION}-${version}-${runnerOs}-${runnerArch}-`;
}

function composeKey(version: string, sha256: string): string {
  return `${composePrefix(version)}${sha256.slice(0, SHA12_LENGTH)}`;
}

function canonicalInstallPath(): string {
  return path.join(process.env.RUNNER_TEMP ?? nodeOs.tmpdir(), 'gmat');
}
