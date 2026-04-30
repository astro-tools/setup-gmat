export type RunnerOs = 'linux' | 'windows';

export const SUPPORTED_RUNNER_OS: readonly RunnerOs[] = ['linux', 'windows'];

export function detectRunnerOs(): RunnerOs {
  const raw = process.env.RUNNER_OS;
  if (raw === 'Linux') return 'linux';
  if (raw === 'Windows') return 'windows';
  if (raw === 'macOS') {
    throw new Error(
      'macOS runners are not yet supported by setup-gmat. ' +
        'See the project roadmap for cross-platform support.',
    );
  }
  throw new Error(
    `Unsupported runner OS "${raw ?? '<unset>'}". ` +
      `setup-gmat supports: ${SUPPORTED_RUNNER_OS.join(', ')}. ` +
      `Set RUNNER_OS to Linux or Windows (GitHub-hosted runners do this automatically).`,
  );
}
