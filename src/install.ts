import * as core from '@actions/core';

export async function install(): Promise<void> {
  core.info('setup-gmat: scaffold loaded.');
  throw new Error(
    'setup-gmat is under active development; the v0.1 install path is not implemented yet. ' +
      'See https://github.com/astro-tools/setup-gmat for status.',
  );
}
