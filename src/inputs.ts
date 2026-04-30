import * as core from '@actions/core';

export type GmatVersion = 'R2026a';

export const SUPPORTED_VERSIONS: readonly GmatVersion[] = ['R2026a'];

export interface Inputs {
  version: GmatVersion;
  cache: boolean;
  pythonVersion: string | undefined;
}

export function parseInputs(): Inputs {
  return {
    version: parseVersion(core.getInput('version')),
    cache: parseCache(core.getInput('cache')),
    pythonVersion: parsePythonVersion(core.getInput('python-version')),
  };
}

function parseVersion(raw: string): GmatVersion {
  const value = raw.trim();
  if (isSupportedVersion(value)) {
    return value;
  }
  throw new Error(
    `Unsupported GMAT version "${value}". Supported versions in v0.1: ${SUPPORTED_VERSIONS.join(', ')}.`,
  );
}

function isSupportedVersion(value: string): value is GmatVersion {
  return (SUPPORTED_VERSIONS as readonly string[]).includes(value);
}

function parseCache(raw: string): boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Invalid value "${raw}" for input "cache". Expected "true" or "false".`);
}

function parsePythonVersion(raw: string): string | undefined {
  const value = raw.trim();
  return value.length === 0 ? undefined : value;
}
