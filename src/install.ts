import * as core from '@actions/core';
import { restoreCache, saveCache } from './cache';
import { download } from './download';
import { extract } from './extract';
import { buildApiStartupFile } from './api_startup';
import { smoke } from './smoke';
import { parseInputs } from './inputs';
import type { Inputs } from './inputs';

export async function install(): Promise<void> {
  const inputs = parseInputs();
  logInputs(inputs);

  const { gmatRoot, cacheHit } = await resolveInstall(inputs);

  await core.group('Build api_startup_file.txt', () =>
    buildApiStartupFile(gmatRoot, inputs.pythonVersion),
  );
  await core.group('Smoke check', () => smoke(gmatRoot, inputs.version, inputs.pythonVersion));

  core.exportVariable('GMAT_ROOT', gmatRoot);
  core.setOutput('gmat-root', gmatRoot);
  core.setOutput('gmat-version', inputs.version);
  core.setOutput('cache-hit', cacheHit ? 'true' : 'false');
}

async function resolveInstall(inputs: Inputs): Promise<{ gmatRoot: string; cacheHit: boolean }> {
  if (inputs.cache) {
    const restored = await core.group('Restore GMAT cache', () => restoreCache(inputs.version));
    if (restored.hit) {
      return { gmatRoot: restored.path, cacheHit: true };
    }
  }

  const { archivePath, sha256 } = await core.group(`Download GMAT ${inputs.version}`, () =>
    download(inputs.version),
  );
  const gmatRoot = await core.group('Extract GMAT installer', () =>
    extract(archivePath, inputs.version),
  );

  if (inputs.cache) {
    await core.group('Save GMAT cache', () => saveCache(inputs.version, sha256, gmatRoot));
  }

  return { gmatRoot, cacheHit: false };
}

function logInputs(inputs: Inputs): void {
  core.info(`setup-gmat: version=${inputs.version} cache=${inputs.cache}`);
  if (inputs.pythonVersion !== undefined) {
    core.info(`setup-gmat: python-version=${inputs.pythonVersion}`);
  }
}
