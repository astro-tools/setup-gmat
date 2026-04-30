import * as core from '@actions/core';
import { parseInputs } from './inputs';

export async function install(): Promise<void> {
  const inputs = parseInputs();
  core.info(`setup-gmat: scaffold loaded.`);
  core.info(`setup-gmat: version=${inputs.version} cache=${inputs.cache}`);
  if (inputs.pythonVersion !== undefined) {
    core.info(`setup-gmat: python-version=${inputs.pythonVersion}`);
  }
  throw new Error(
    'setup-gmat is under active development; the v0.1 install path is not implemented yet. ' +
      'See https://github.com/astro-tools/setup-gmat for status.',
  );
}
