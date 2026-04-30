import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';

const API_STARTUP_FILE = path.join('api', 'BuildApiStartupFile.py');

export async function extract(archivePath: string): Promise<string> {
  core.info(`Extracting GMAT installer ${archivePath}`);
  const stagingDir = await tc.extractTar(archivePath);
  core.debug(`Extracted to ${stagingDir}`);

  const stagedRoot = await locateGmatRoot(stagingDir);
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

async function locateGmatRoot(stagingDir: string): Promise<string> {
  if (existsSync(path.join(stagingDir, API_STARTUP_FILE))) {
    return stagingDir;
  }
  const entries = await readdir(stagingDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(stagingDir, entry.name);
    if (existsSync(path.join(candidate, API_STARTUP_FILE))) {
      return candidate;
    }
  }
  throw new Error(
    `Could not locate ${API_STARTUP_FILE} under ${stagingDir}. ` +
      `The installer archive layout may have changed.`,
  );
}

function runnerTemp(): string {
  return process.env.RUNNER_TEMP ?? os.tmpdir();
}
