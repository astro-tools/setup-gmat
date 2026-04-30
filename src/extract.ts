import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
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
    case 'macos':
      return unpackDmg(archivePath);
  }
}

async function unpackDmg(dmgPath: string): Promise<string> {
  const id = randomUUID();
  const mountPoint = path.join(runnerTemp(), `gmat-dmg-mount-${id}`);
  const stagingDir = path.join(runnerTemp(), `gmat-dmg-stage-${id}`);
  await io.mkdirP(stagingDir);

  let attached = false;
  try {
    // -nobrowse hides the mount from Finder; -readonly is the default but
    // explicit; -noautoopen prevents auto-launch of any app on the volume.
    // Empty stdin defends against an interactive license prompt blocking the
    // runner — `hdiutil` will fall back to its non-interactive path.
    await exec.exec(
      'hdiutil',
      ['attach', '-nobrowse', '-readonly', '-noautoopen', '-mountpoint', mountPoint, dmgPath],
      { input: Buffer.alloc(0) },
    );
    attached = true;

    const apiScriptInMount = await findApiStartupScript(mountPoint);
    const resolvedRoot = path.dirname(path.dirname(apiScriptInMount));
    core.debug(`Resolved DMG GMAT root: ${resolvedRoot}`);

    // cp -R because the mount is read-only, so io.mv would fail. -R on macOS
    // BSD cp preserves symlinks as symlinks; Mach-O code signatures live
    // inside the binaries themselves and bundle CodeResources are plain files
    // in the tree, so the copy preserves signing without extra flags.
    const stagedRoot = path.join(stagingDir, 'gmat');
    await exec.exec('cp', ['-R', resolvedRoot, stagedRoot]);
  } finally {
    if (attached) {
      try {
        await exec.exec('hdiutil', ['detach', mountPoint]);
      } catch (err) {
        core.warning(
          `hdiutil detach failed for ${mountPoint}: ${err instanceof Error ? err.message : String(err)}. ` +
            `Self-hosted runners may need manual cleanup.`,
        );
      }
    }
    await io.rmRF(mountPoint).catch(() => undefined);
  }

  return stagingDir;
}

async function findApiStartupScript(mountPoint: string): Promise<string> {
  // The DMG's wrapper folder name is not deterministic across versions, so
  // resolve the GMAT root by locating BuildApiStartupFile.py and walking up
  // two levels (the script lives at <gmat_root>/api/BuildApiStartupFile.py).
  let stdout = '';
  await exec.exec('find', [mountPoint, '-name', 'BuildApiStartupFile.py', '-print', '-quit'], {
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString();
      },
    },
  });
  const match = stdout.split('\n').find((line) => line.trim().length > 0);
  if (match === undefined) {
    throw new Error(
      `Could not locate BuildApiStartupFile.py inside the mounted DMG at ${mountPoint}. ` +
        `Did the upstream archive layout change?`,
    );
  }
  return match.trim();
}

function locateGmatRoot(stagingDir: string, version: GmatVersion, runnerOs: RunnerOs): string {
  // Linux: the tarball wraps in `GMAT/<version>/`. macOS: unpackDmg already
  // resolves the GMAT root inside the mount and copies it to `<staging>/gmat`.
  // Windows: the zip has no wrapper; install layout sits at the staging root.
  let expectedRoot: string;
  switch (runnerOs) {
    case 'linux':
      expectedRoot = path.join(stagingDir, 'GMAT', version);
      break;
    case 'macos':
      expectedRoot = path.join(stagingDir, 'gmat');
      break;
    case 'windows':
      expectedRoot = stagingDir;
      break;
  }
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
