import { stat } from 'node:fs/promises';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import type { GmatVersion } from './inputs';
import { detectRunnerOs } from './os';
import type { RunnerOs } from './os';

const MIB = 1024 * 1024;

interface InstallerSpec {
  url: string;
  minBytes: number;
  archiveLabel: string;
}

const LINUX_MIN_SIZE_BYTES: Record<GmatVersion, number> = {
  R2022a: 360 * MIB,
  R2025a: 390 * MIB,
  R2026a: 380 * MIB,
};

const WINDOWS_MIN_SIZE_BYTES: Record<GmatVersion, number> = {
  R2022a: 350 * MIB,
  R2025a: 400 * MIB,
  R2026a: 380 * MIB,
};

export async function download(version: GmatVersion): Promise<string> {
  const spec = installerSpec(detectRunnerOs(), version);
  core.info(`Downloading GMAT ${version} ${spec.archiveLabel} from ${spec.url}`);
  const archivePath = await tc.downloadTool(spec.url);
  core.info(`Downloaded to ${archivePath}`);
  await assertMinSize(archivePath, spec, version);
  return archivePath;
}

function installerSpec(runnerOs: RunnerOs, version: GmatVersion): InstallerSpec {
  switch (runnerOs) {
    case 'linux':
      return {
        url: `https://sourceforge.net/projects/gmat/files/GMAT/GMAT-${version}/gmat-ubuntu-x64-${version}.tar.gz/download`,
        minBytes: LINUX_MIN_SIZE_BYTES[version],
        archiveLabel: 'Linux installer',
      };
    case 'windows':
      return {
        url: `https://sourceforge.net/projects/gmat/files/GMAT/GMAT-${version}/gmat-win-${version}.zip/download`,
        minBytes: WINDOWS_MIN_SIZE_BYTES[version],
        archiveLabel: 'Windows installer',
      };
  }
}

async function assertMinSize(
  archivePath: string,
  spec: InstallerSpec,
  version: GmatVersion,
): Promise<void> {
  const { size } = await stat(archivePath);
  if (size < spec.minBytes) {
    throw new Error(
      `GMAT ${version} installer download appears truncated. ` +
        `Observed ${formatMiB(size)} (${size} bytes), expected at least ${formatMiB(spec.minBytes)}. ` +
        `URL: ${spec.url}`,
    );
  }
  core.debug(`Installer size ${formatMiB(size)} passes ${formatMiB(spec.minBytes)} threshold`);
}

function formatMiB(bytes: number): string {
  return `${(bytes / MIB).toFixed(1)} MiB`;
}
