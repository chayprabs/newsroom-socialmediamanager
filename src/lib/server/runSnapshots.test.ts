import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunState } from '../types';
import { ensureRunFromSnapshot } from './runSnapshots';

const storageMock = vi.hoisted(() => ({
  run: null as RunState | null,
  writes: [] as RunState[],
}));

vi.mock('./storage', () => ({
  readRun: vi.fn(async () => storageMock.run),
  writeRun: vi.fn(async (run: RunState) => {
    storageMock.run = run;
    storageMock.writes.push(run);
    return run;
  }),
}));

function testRun(overrides: Partial<RunState> = {}): RunState {
  return {
    run_id: 'run-1',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    status: 'awaiting_chart_type_selection',
    logs: [],
    candidates: [
      {
        candidate_id: 'candidate-1',
        headline: 'AI chatbots compared',
        subhead: 'Monthly visits by product.',
        crustdata_query: {
          endpoint: '/person/search',
          params: {},
        },
        visual_template: 'vertical_bar_comparison',
        chart_type_options: [
          {
            rank: 1,
            visual_template: 'vertical_bar_comparison',
            rationale: 'Best comparison.',
            data_preview: 'Rows.',
            suitability_score: 9,
          },
        ],
      },
    ],
    selected_candidate_id: 'candidate-1',
    generation_steps: [
      {
        id: 'fetching_data',
        title: 'Fetching data',
        description: 'Fetch data.',
        status: 'done',
      },
      {
        id: 'finalizing_data',
        title: 'Finalizing data',
        description: 'Finalize data.',
        status: 'done',
      },
      {
        id: 'awaiting_chart_type_selection',
        title: 'Awaiting chart-type selection',
        description: 'Pick a chart type.',
        status: 'running',
      },
      {
        id: 'generating_image',
        title: 'Generating image',
        description: 'Render image.',
        status: 'pending',
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  storageMock.run = null;
  storageMock.writes = [];
});

describe('ensureRunFromSnapshot', () => {
  it('revives a valid browser snapshot when no run exists in this function', async () => {
    const snapshot = testRun();

    await expect(ensureRunFromSnapshot('run-1', snapshot)).resolves.toEqual(snapshot);
    expect(storageMock.writes).toEqual([snapshot]);
  });

  it('replaces a stale function-local run with a newer browser snapshot', async () => {
    storageMock.run = testRun({ updated_at: '2026-05-01T00:00:00.000Z' });
    const snapshot = testRun({
      updated_at: '2026-05-01T00:00:05.000Z',
      status: 'generating',
      selected_chart_template: 'vertical_bar_comparison',
    });

    await expect(ensureRunFromSnapshot('run-1', snapshot)).resolves.toEqual(snapshot);
    expect(storageMock.writes).toEqual([snapshot]);
  });

  it('keeps the existing run when an older browser snapshot arrives later', async () => {
    const existingRun = testRun({
      updated_at: '2026-05-01T00:00:05.000Z',
      status: 'generating',
      selected_chart_template: 'vertical_bar_comparison',
    });
    storageMock.run = existingRun;
    const olderSnapshot = testRun({ updated_at: '2026-05-01T00:00:00.000Z' });

    await expect(ensureRunFromSnapshot('run-1', olderSnapshot)).resolves.toEqual(existingRun);
    expect(storageMock.writes).toEqual([]);
  });
});
