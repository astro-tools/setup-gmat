import * as nodeOs from 'node:os';
import * as path from 'node:path';
import * as cache from '@actions/cache';
import * as core from '@actions/core';

const ACTION_MAJOR_VERSION = 'v0';

export async function restoreCache(version: string): Promise<{ hit: boolean; path: string }> {
  const installPath = canonicalInstallPath();
  const key = composeKey(version);
  core.info(`Restoring GMAT cache (key=${key}, path=${installPath})`);
  const matched = await cache.restoreCache([installPath], key);
  return { hit: matched !== undefined, path: installPath };
}

export async function saveCache(version: string, installPath: string): Promise<void> {
  const key = composeKey(version);
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

function composeKey(version: string): string {
  const runnerOs = process.env.RUNNER_OS ?? 'unknown-os';
  const runnerArch = process.env.RUNNER_ARCH ?? 'unknown-arch';
  return `setup-gmat-${ACTION_MAJOR_VERSION}-${version}-${runnerOs}-${runnerArch}`;
}

function canonicalInstallPath(): string {
  return path.join(process.env.RUNNER_TEMP ?? nodeOs.tmpdir(), 'gmat');
}
