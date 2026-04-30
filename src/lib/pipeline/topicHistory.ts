import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { RunState, RunStatus } from '../types';
import { dataRoot, readRun, writeRun } from '../server/storage';

const RUNS_DIR = path.join(dataRoot, 'runs');
const SAVED_RUN_STATUSES = new Set<RunStatus>(['saved']);
const COMPLETED_DISCOVERY_STATUSES = new Set<RunStatus>([
  'awaiting_selection',
  'ready',
  'saved',
  'no_matches',
]);

/**
 * One row of recent-steering history. `steering` is `null` for runs that were
 * intentionally unsteered (so Stage 1 can render those as "(blank)" without
 * confusing them with absent data).
 */
export interface RecentSteeringEntry {
  steering: string | null;
  saved_at: string;
}

interface ReadRunsNewestFirstOptions {
  statuses?: Set<RunStatus>;
  excludeRunId?: string;
}

async function readRunsNewestFirst({
  statuses = SAVED_RUN_STATUSES,
  excludeRunId,
}: ReadRunsNewestFirstOptions = {}): Promise<RunState[]> {
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
      .map((entry) => readRun(entry.name)),
  );

  return runs
    .filter((run): run is RunState => Boolean(run))
    .filter((run) => statuses.has(run.status))
    .filter((run) => run.run_id !== excludeRunId)
    .sort((a, b) => {
      const aKey = a.saved_at ?? a.updated_at ?? a.created_at;
      const bKey = b.saved_at ?? b.updated_at ?? b.created_at;
      return bKey.localeCompare(aKey);
    });
}

/**
 * Read the most-recent `maxRuns` saved runs and return their `steering_input`
 * values, newest-first, with empty/undefined values filtered out and the
 * remaining values de-duplicated case-insensitively (most-recent occurrence
 * preserved).
 *
 * Used by:
 *  - the Dashboard chip row, which prepends up to 2 of these to the static
 *    seeds so users can re-pick a recent steering without retyping it; and
 *  - any other surface that wants a clean list of recent topics.
 *
 * Mirrors `getRecentTemplates` in shape so the two history helpers feel
 * consistent.
 */
export async function getRecentSteerings(maxRuns: number = 10): Promise<string[]> {
  if (maxRuns <= 0) return [];

  const savedRunsNewestFirst = (await readRunsNewestFirst()).slice(0, maxRuns);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const run of savedRunsNewestFirst) {
    const value = run.steering_input?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= maxRuns) break;
  }

  return result;
}

export interface RecentSteeringHistoryOptions {
  /**
   * Keep `getRecentSteerings()` Dashboard chips scoped to saved runs, but let
   * Stage 1 use completed unsaved runs too. This makes repeat discovery attempts
   * rotate angles even before a user saves the previous run.
   */
  includeCompletedUnsavedRuns?: boolean;
  /** Exclude the current run so its own steering does not look like history. */
  excludeRunId?: string;
}

/**
 * Read the most-recent `maxRuns` saved runs and return one entry per run with
 * `steering` populated as the raw steering text (or `null` for unsteered
 * runs). Stage 1 uses this to render the "Recent steerings used in the last N
 * runs" block — including `(blank)` lines so Sonnet sees the full pattern of
 * steered vs. unsteered runs, not just a deduplicated whitelist.
 */
export async function getRecentSteeringHistory(
  maxRuns: number = 5,
  options: RecentSteeringHistoryOptions = {},
): Promise<RecentSteeringEntry[]> {
  if (maxRuns <= 0) return [];

  const savedRunsNewestFirst = (await readRunsNewestFirst({
    statuses: options.includeCompletedUnsavedRuns
      ? COMPLETED_DISCOVERY_STATUSES
      : SAVED_RUN_STATUSES,
    excludeRunId: options.excludeRunId,
  })).slice(0, maxRuns);

  return savedRunsNewestFirst.map((run) => ({
    steering: run.steering_input?.trim() || null,
    saved_at: run.saved_at ?? run.updated_at,
  }));
}

/**
 * Stamp a run's metadata with the steering text the user submitted on the
 * Dashboard. Idempotent: if `steering_input` is already set to the trimmed
 * value, this is a no-op. Empty/undefined input is also a no-op so unsteered
 * runs stay clean.
 *
 * Called from the orchestrator at save time (parallel to `recordTemplateUsed`)
 * so future readers of `topicHistory` always see a stable `steering_input`
 * field regardless of whether legacy code paths populated it.
 */
export async function recordSteering(
  runId: string,
  steeringInput: string | undefined,
): Promise<void> {
  const trimmed = steeringInput?.trim();
  if (!trimmed) return;

  const run = await readRun(runId);
  if (!run) return;

  if (run.steering_input?.trim() === trimmed) return;

  await writeRun({
    ...run,
    steering_input: trimmed,
  });
}
