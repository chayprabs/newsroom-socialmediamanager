import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import type { RunState } from '../types';
import { getRunDir, writeRun } from '../server/storage';
import { getRecentTemplates, recordTemplateUsed } from './templateHistory';

const createdRuns: string[] = [];

function runState(
  runId: string,
  savedAt: string,
  visualTemplate?: string,
  selectedTemplate?: string
): RunState {
  return {
    run_id: runId,
    created_at: savedAt,
    updated_at: savedAt,
    status: 'saved',
    logs: [],
    candidates: [],
    generation_steps: [],
    saved_at: savedAt,
    visual_template: visualTemplate,
    selected_candidate: selectedTemplate
      ? {
          candidate_id: `candidate-${runId}`,
          headline: 'Template history test',
          subhead: 'Saved run template tracking',
          crustdata_query: { endpoint: '/job/search', params: {} },
          visual_template: selectedTemplate,
        }
      : undefined,
  };
}

afterEach(async () => {
  await Promise.all(createdRuns.map((runId) => fs.rm(getRunDir(runId), { recursive: true, force: true })));
  createdRuns.length = 0;
});

describe('template history', () => {
  it('returns saved run templates oldest-to-newest from the most recent saved runs', async () => {
    const run1 = `test-history-${randomUUID()}`;
    const run2 = `test-history-${randomUUID()}`;
    const run3 = `test-history-${randomUUID()}`;
    createdRuns.push(run1, run2, run3);

    await writeRun(runState(run1, '2099-01-01T00:00:00.000Z', 'ranked_horizontal_bar'));
    await writeRun(runState(run2, '2099-01-02T00:00:00.000Z', undefined, 'donut_chart'));
    await writeRun(runState(run3, '2099-01-03T00:00:00.000Z', 'scatter_plot'));

    await expect(getRecentTemplates(3)).resolves.toEqual([
      'ranked_horizontal_bar',
      'donut_chart',
      'scatter_plot',
    ]);
  });

  it('stamps the saved run with the template used', async () => {
    const runId = `test-history-${randomUUID()}`;
    createdRuns.push(runId);

    await writeRun(runState(runId, '2099-01-04T00:00:00.000Z', undefined, 'slope_chart'));
    await recordTemplateUsed(runId, 'multi_line_timeseries');

    await expect(getRecentTemplates(1)).resolves.toEqual(['multi_line_timeseries']);
  });
});
