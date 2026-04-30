import * as path from 'node:path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

export async function buildApiStartupFile(gmatRoot: string, pythonVersion?: string): Promise<void> {
  const pythonPath = await resolvePython();
  const script = path.join(gmatRoot, 'api', 'BuildApiStartupFile.py');
  if (pythonVersion !== undefined) {
    core.info(
      `Running BuildApiStartupFile.py with ${pythonPath} (requested python-version=${pythonVersion})`,
    );
  } else {
    core.info(`Running BuildApiStartupFile.py with ${pythonPath}`);
  }
  try {
    await exec.exec(pythonPath, [script], { cwd: gmatRoot });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `BuildApiStartupFile.py failed in ${gmatRoot}: ${reason}. ` +
        `Without api/api_startup_file.txt, gmatpy import will fail at runtime.`,
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
