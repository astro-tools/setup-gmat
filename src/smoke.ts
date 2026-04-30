import * as path from 'node:path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

const SMOKE_SAMPLE = path.posix.join('samples', 'Ex_HighFidelitySRP.script');

const SMOKE_PYTHON_SRC = `
import os, sys
gmat_root = os.environ['GMAT_ROOT']
sys.path.insert(0, os.path.join(gmat_root, 'bin'))
import gmatpy as gmat
gmat.Setup(os.path.join(gmat_root, 'bin', 'api_startup_file.txt'))
script = os.path.join(gmat_root, ${JSON.stringify(SMOKE_SAMPLE)})
if not gmat.LoadScript(script):
    sys.exit(f'gmat.LoadScript failed for {script}')
rc = gmat.RunScript()
if rc != 1:
    sys.exit(f'gmat.RunScript returned {rc} for {script} (expected 1)')
print('setup-gmat smoke ok')
`;

export async function smoke(gmatRoot: string, pythonVersion?: string): Promise<void> {
  const pythonPath = await resolvePython();
  const sample = path.join(gmatRoot, SMOKE_SAMPLE);
  if (pythonVersion !== undefined) {
    core.info(
      `Smoke-testing GMAT install at ${gmatRoot} with ${pythonPath} (requested python-version=${pythonVersion})`,
    );
  } else {
    core.info(`Smoke-testing GMAT install at ${gmatRoot} with ${pythonPath}`);
  }
  try {
    await exec.exec(pythonPath, ['-c', SMOKE_PYTHON_SRC], {
      cwd: gmatRoot,
      env: { ...process.env, GMAT_ROOT: gmatRoot } as { [key: string]: string },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Smoke check failed: ${reason}. ` +
        `Sample: ${sample}. GMAT_ROOT: ${gmatRoot}. ` +
        `See the workflow log above for gmatpy's stderr.`,
    );
  }
}

async function resolvePython(): Promise<string> {
  try {
    return await io.which('python', true);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `python is not on PATH (${reason}). ` +
        `Add a 'uses: actions/setup-python@v5' step before setup-gmat.`,
    );
  }
}
