import * as core from '@actions/core';
import { install } from './install';

async function run(): Promise<void> {
  try {
    await install();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    core.setFailed(message);
  }
}

void run();
