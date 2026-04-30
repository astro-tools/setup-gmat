import { stat } from 'node:fs/promises';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import type { GmatVersion } from './inputs';

const MIB = 1024 * 1024;

const MIN_SIZE_BYTES: Record<GmatVersion, number> = {
  R2026a: 380 * MIB,
};

export async function download(version: GmatVersion): Promise<string> {
  const url = linuxInstallerUrl(version);
  core.info(`Downloading GMAT ${version} Linux installer from ${url}`);
  const archivePath = await tc.downloadTool(url);
  core.info(`Downloaded to ${archivePath}`);
  await assertMinSize(archivePath, version, url);
  return archivePath;
}

function linuxInstallerUrl(version: GmatVersion): string {
  return `https://sourceforge.net/projects/gmat/files/GMAT/GMAT-${version}/gmat-ubuntu-x64-${version}.tar.gz/download`;
}

async function assertMinSize(
  archivePath: string,
  version: GmatVersion,
  url: string,
): Promise<void> {
  const minBytes = MIN_SIZE_BYTES[version];
  const { size } = await stat(archivePath);
  if (size < minBytes) {
    throw new Error(
      `GMAT ${version} installer download appears truncated. ` +
        `Observed ${formatMiB(size)} (${size} bytes), expected at least ${formatMiB(minBytes)}. ` +
        `URL: ${url}`,
    );
  }
  core.debug(`Installer size ${formatMiB(size)} passes ${formatMiB(minBytes)} threshold`);
}

function formatMiB(bytes: number): string {
  return `${(bytes / MIB).toFixed(1)} MiB`;
}
