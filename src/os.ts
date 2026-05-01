export type RunnerOs = 'linux' | 'windows' | 'macos';

export const SUPPORTED_RUNNER_OS: readonly RunnerOs[] = ['linux', 'windows', 'macos'];

export function detectRunnerOs(): RunnerOs {
  const raw = process.env.RUNNER_OS;
  if (raw === 'Linux') return 'linux';
  if (raw === 'Windows') return 'windows';
  if (raw === 'macOS') return 'macos';
  throw new Error(
    `Unsupported runner OS "${raw ?? '<unset>'}". ` +
      `setup-gmat supports: ${SUPPORTED_RUNNER_OS.join(', ')}. ` +
      `Set RUNNER_OS to Linux, Windows, or macOS (GitHub-hosted runners do this automatically).`,
  );
}
