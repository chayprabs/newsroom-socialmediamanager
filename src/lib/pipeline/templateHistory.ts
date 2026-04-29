import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { RunState } from '../types';
import { dataRoot, readRun, writeRun } from '../server/storage';

const RUNS_DIR = path.join(dataRoot, 'runs');

/**
 * Read the most-recent N saved runs and return the `visual_template` they used,
 * ordered oldest-to-newest (so the prompt list reads as a chronological feed).
 *
 * Falls back to `selected_candidate.visual_template` when the top-level
 * `visual_template` field hasn't been stamped yet (older runs from before
 * `recordTemplateUsed` existed).
 */
export async function getRecentTemplates(maxRuns = 5): Promise<string[]> {
  if (maxRuns <= 0) return [];

  let entries: import('node:fs').Dirent[] = [];
  try {
    entries = await fs.readdir(RUNS_DIR, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const runs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readRun(entry.name))
  );

  const savedRuns = runs
    .filter((run): run is RunState => Boolean(run))
    .filter((run) => run.status === 'saved')
    .sort((a, b) => {
      const aKey = a.saved_at ?? a.updated_at;
      const bKey = b.saved_at ?? b.updated_at;
      return bKey.localeCompare(aKey);
    })
    .slice(0, maxRuns);

  const newestFirst: string[] = [];
  for (const run of savedRuns) {
    const template =
      run.visual_template?.trim() ||
      run.selected_candidate?.visual_template?.trim() ||
      '';
    if (template) newestFirst.push(template);
  }

  return newestFirst.reverse();
}

/**
 * Stamp a run's metadata with the visual template it ended up rendering.
 * Idempotent: if `visual_template` is already set on the run state, this is a no-op.
 *
 * Called from the orchestrator when a run transitions to saved on the dashboard,
 * so subsequent calls to `getRecentTemplates` see a stable template field
 * regardless of whether the run was saved before this field was introduced.
 */
export async function recordTemplateUsed(runId: string, template: string): Promise<void> {
  const trimmed = template?.trim();
  if (!trimmed) return;

  const run = await readRun(runId);
  if (!run) return;

  if (run.visual_template?.trim() === trimmed) {
    return;
  }

  await writeRun({
    ...run,
    visual_template: trimmed,
  });
}
