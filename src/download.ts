import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
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

// R2026a's signed DMG is ~455 MiB; 400 MiB matches the charter floor and
// gmat-run's working CI threshold. R2022a/R2025a floors are conservative
// truncation guards — the actual archives are larger.
const MACOS_MIN_SIZE_BYTES: Record<GmatVersion, number> = {
  R2022a: 350 * MIB,
  R2025a: 380 * MIB,
  R2026a: 400 * MIB,
};

// SourceForge filenames vary per release: R2022a is unsigned and arch-implicit,
// R2025a is signed but arch-implicit, R2026a is the modern `-x64-…-signed` form.
const MACOS_INSTALLER_FILENAME: Record<GmatVersion, string> = {
  R2022a: 'gmat-mac-R2022a.dmg',
  R2025a: 'gmat-mac-R2025a-signed.dmg',
  R2026a: 'gmat-mac-x64-R2026a-signed.dmg',
};

export interface DownloadResult {
  archivePath: string;
  sha256: string;
}

export async function download(version: GmatVersion): Promise<DownloadResult> {
  const spec = installerSpec(detectRunnerOs(), version);
  core.info(`Downloading GMAT ${version} ${spec.archiveLabel} from ${spec.url}`);
  const archivePath = await tc.downloadTool(spec.url);
  core.info(`Downloaded to ${archivePath}`);
  await assertMinSize(archivePath, spec, version);
  const sha256 = await hashFile(archivePath);
  core.info(`Installer SHA-256: ${sha256}`);
  return { archivePath, sha256 };
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest('hex');
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
    case 'macos':
      return {
        url: `https://sourceforge.net/projects/gmat/files/GMAT/GMAT-${version}/${MACOS_INSTALLER_FILENAME[version]}/download`,
        minBytes: MACOS_MIN_SIZE_BYTES[version],
        archiveLabel: 'macOS installer',
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
