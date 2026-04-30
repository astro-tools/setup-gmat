import { existsSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import type { GmatVersion } from './inputs';

const API_STARTUP_FILE = path.join('api', 'BuildApiStartupFile.py');

export async function extract(archivePath: string, version: GmatVersion): Promise<string> {
  core.info(`Extracting GMAT installer ${archivePath}`);
  const stagingDir = await tc.extractTar(archivePath);
  core.debug(`Extracted to ${stagingDir}`);

  const stagedRoot = locateGmatRoot(stagingDir, version);
  core.debug(`Resolved staged GMAT_ROOT: ${stagedRoot}`);

  const finalRoot = path.join(runnerTemp(), 'gmat');
  if (existsSync(finalRoot)) {
    core.debug(`Removing existing ${finalRoot} before move`);
    await io.rmRF(finalRoot);
  }
  await io.mv(stagedRoot, finalRoot);
  core.info(`GMAT_ROOT: ${finalRoot}`);
  return finalRoot;
}

function locateGmatRoot(stagingDir: string, version: GmatVersion): string {
  const expectedRoot = path.join(stagingDir, 'GMAT', version);
  if (existsSync(path.join(expectedRoot, API_STARTUP_FILE))) {
    return expectedRoot;
  }
  throw new Error(
    `Expected GMAT/${version}/${API_STARTUP_FILE} inside the installer, ` +
      `but ${path.join(expectedRoot, API_STARTUP_FILE)} is missing. ` +
      `Did the upstream archive layout change?`,
  );
}

function runnerTemp(): string {
  return process.env.RUNNER_TEMP ?? os.tmpdir();
}
