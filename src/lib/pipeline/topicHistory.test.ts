import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import type { RunState, RunStatus } from '../types';
import { getRunDir, readRun, writeRun } from '../server/storage';
import {
  getRecentSteeringHistory,
  getRecentSteerings,
  recordSteering,
} from './topicHistory';

const createdRuns: string[] = [];

function runState(
  runId: string,
  savedAt: string,
  steeringInput?: string,
  status: RunStatus = 'saved',
): RunState {
  return {
    run_id: runId,
    created_at: savedAt,
    updated_at: savedAt,
    status,
    logs: [],
    candidates: [],
    generation_steps: [],
    saved_at: savedAt,
    ...(steeringInput !== undefined ? { steering_input: steeringInput } : {}),
  };
}

afterEach(async () => {
  await Promise.all(
    createdRuns.map((runId) => fs.rm(getRunDir(runId), { recursive: true, force: true })),
  );
  createdRuns.length = 0;
});

describe('topic history', () => {
  it('returns recent steering inputs newest-first, deduplicated case-insensitively', async () => {
    const run1 = `test-topic-${randomUUID()}`;
    const run2 = `test-topic-${randomUUID()}`;
    const run3 = `test-topic-${randomUUID()}`;
    const run4 = `test-topic-${randomUUID()}`;
    createdRuns.push(run1, run2, run3, run4);

    await writeRun(runState(run1, '2099-02-01T00:00:00.000Z', 'AI hiring'));
    await writeRun(runState(run2, '2099-02-02T00:00:00.000Z', 'Founder lineage'));
    await writeRun(runState(run3, '2099-02-03T00:00:00.000Z', 'ai hiring'));
    await writeRun(runState(run4, '2099-02-04T00:00:00.000Z', 'European unicorns'));

    await expect(getRecentSteerings(4)).resolves.toEqual([
      'European unicorns',
      'ai hiring',
      'Founder lineage',
    ]);
  });

  it('filters out blank/missing steering inputs', async () => {
    const run1 = `test-topic-${randomUUID()}`;
    const run2 = `test-topic-${randomUUID()}`;
    const run3 = `test-topic-${randomUUID()}`;
    createdRuns.push(run1, run2, run3);

    await writeRun(runState(run1, '2099-03-01T00:00:00.000Z', '   '));
    await writeRun(runState(run2, '2099-03-02T00:00:00.000Z'));
    await writeRun(runState(run3, '2099-03-03T00:00:00.000Z', 'Recent funding'));

    await expect(getRecentSteerings(3)).resolves.toEqual(['Recent funding']);
  });

  it('caps the result at maxRuns', async () => {
    const ids = Array.from({ length: 4 }, () => `test-topic-${randomUUID()}`);
    createdRuns.push(...ids);

    await Promise.all(
      ids.map((id, index) =>
        writeRun(
          runState(
            id,
            `2099-04-0${index + 1}T00:00:00.000Z`,
            `Topic ${index + 1}`,
          ),
        ),
      ),
    );

    const recent = await getRecentSteerings(2);
    expect(recent).toHaveLength(2);
    expect(recent[0]).toBe('Topic 4');
    expect(recent[1]).toBe('Topic 3');
  });

  it('returns recent steering history including blanks for unsteered runs', async () => {
    const run1 = `test-topic-${randomUUID()}`;
    const run2 = `test-topic-${randomUUID()}`;
    const run3 = `test-topic-${randomUUID()}`;
    createdRuns.push(run1, run2, run3);

    await writeRun(runState(run1, '2099-05-01T00:00:00.000Z', 'AI lab funding'));
    await writeRun(runState(run2, '2099-05-02T00:00:00.000Z'));
    await writeRun(
      runState(run3, '2099-05-03T00:00:00.000Z', 'Thinking Machines Lab recent hires'),
    );

    // Cap at 3 so co-existing real saved runs (no steering, earlier dates)
    // can't pad the result; the 2099 fixture dates always sort newest-first.
    const history = await getRecentSteeringHistory(3);
    expect(history.map((entry) => entry.steering)).toEqual([
      'Thinking Machines Lab recent hires',
      null,
      'AI lab funding',
    ]);
  });

  it('can include completed unsaved runs for Stage 1 repetition avoidance', async () => {
    const currentRun = `test-topic-${randomUUID()}`;
    const readyRun = `test-topic-${randomUUID()}`;
    const awaitingRun = `test-topic-${randomUUID()}`;
    const savedRun = `test-topic-${randomUUID()}`;
    const failedRun = `test-topic-${randomUUID()}`;
    createdRuns.push(currentRun, readyRun, awaitingRun, savedRun, failedRun);

    await writeRun(runState(currentRun, '2099-06-05T00:00:00.000Z', 'Current input', 'discovering'));
    await writeRun(runState(readyRun, '2099-06-04T00:00:00.000Z', 'Ready input', 'ready'));
    await writeRun(runState(awaitingRun, '2099-06-03T00:00:00.000Z', 'Awaiting input', 'awaiting_selection'));
    await writeRun(runState(savedRun, '2099-06-02T00:00:00.000Z', 'Saved input', 'saved'));
    await writeRun(runState(failedRun, '2099-06-01T00:00:00.000Z', 'Failed input', 'failed'));

    const history = await getRecentSteeringHistory(5, {
      includeCompletedUnsavedRuns: true,
      excludeRunId: currentRun,
    });

    const steerings = history.map((entry) => entry.steering);
    expect(steerings.slice(0, 3)).toEqual([
      'Ready input',
      'Awaiting input',
      'Saved input',
    ]);
    expect(steerings).not.toContain('Current input');
    expect(steerings).not.toContain('Failed input');
  });

  it('records steering on a run idempotently', async () => {
    const runId = `test-topic-${randomUUID()}`;
    createdRuns.push(runId);

    await writeRun(runState(runId, '2099-06-01T00:00:00.000Z'));
    await recordSteering(runId, '  AI hiring  ');

    const stored = await readRun(runId);
    expect(stored?.steering_input).toBe('AI hiring');

    const updatedAtBefore = stored?.updated_at;
    await recordSteering(runId, 'AI hiring');
    const after = await readRun(runId);
    expect(after?.steering_input).toBe('AI hiring');
    expect(after?.updated_at).toBe(updatedAtBefore);
  });

  it('skips empty/undefined steering inputs in recordSteering', async () => {
    const runId = `test-topic-${randomUUID()}`;
    createdRuns.push(runId);

    await writeRun(runState(runId, '2099-07-01T00:00:00.000Z'));
    await recordSteering(runId, undefined);
    await recordSteering(runId, '   ');

    const stored = await readRun(runId);
    expect(stored?.steering_input).toBeUndefined();
  });
});
