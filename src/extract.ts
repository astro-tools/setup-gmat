import { existsSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import type { GmatVersion } from './inputs';
import { detectRunnerOs } from './os';
import type { RunnerOs } from './os';

const API_STARTUP_FILE = path.join('api', 'BuildApiStartupFile.py');

export async function extract(archivePath: string, version: GmatVersion): Promise<string> {
  const runnerOs = detectRunnerOs();
  core.info(`Extracting GMAT installer ${archivePath}`);
  const stagingDir = await unpack(archivePath, runnerOs);
  core.debug(`Extracted to ${stagingDir}`);

  const stagedRoot = locateGmatRoot(stagingDir, version, runnerOs);
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

function unpack(archivePath: string, runnerOs: RunnerOs): Promise<string> {
  switch (runnerOs) {
    case 'linux':
      return tc.extractTar(archivePath);
    case 'windows':
      return tc.extractZip(archivePath);
  }
}

function locateGmatRoot(stagingDir: string, version: GmatVersion, runnerOs: RunnerOs): string {
  // The Linux tarball wraps its contents in `GMAT/<version>/`; the Windows zip
  // has no wrapper and unpacks the install layout directly at the staging root.
  const expectedRoot = runnerOs === 'linux' ? path.join(stagingDir, 'GMAT', version) : stagingDir;
  if (existsSync(path.join(expectedRoot, API_STARTUP_FILE))) {
    return expectedRoot;
  }
  throw new Error(
    `Expected ${API_STARTUP_FILE} inside the installer at ${expectedRoot}, ` +
      `but ${path.join(expectedRoot, API_STARTUP_FILE)} is missing. ` +
      `Did the upstream archive layout change?`,
  );
}

function runnerTemp(): string {
  return process.env.RUNNER_TEMP ?? os.tmpdir();
}
