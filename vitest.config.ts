import { defineConfig } from 'vitest/config';

/**
 * Disable file-level parallelism: several pipeline tests (templateHistory,
 * topicHistory) read and write the shared on-disk `runs/` directory through
 * the real `storage.ts` helpers. Parallel files would race each other on the
 * "most recent saved run" slice and produce flaky results, so we serialize
 * test files. Tests within a file still run quickly because each file uses
 * future-dated (`2099-…`) run states and tears down after every case.
 */
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
