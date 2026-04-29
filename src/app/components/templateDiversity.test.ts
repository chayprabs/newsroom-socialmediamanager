import { describe, expect, it } from 'vitest';
import type { RunState } from '@/lib/types';
import { shouldShowTemplateDiversityBanner } from './templateDiversity';

function runWithDiversity(distinctTemplates: number, candidateCount = 3): RunState {
  return {
    run_id: 'test-run',
    created_at: '2099-01-01T00:00:00.000Z',
    updated_at: '2099-01-01T00:00:00.000Z',
    status: 'awaiting_selection',
    logs: [],
    candidates: Array.from({ length: candidateCount }, (_, index) => ({
      candidate_id: `c_${index}`,
      headline: 'Template diversity test',
      subhead: '',
      crustdata_query: { endpoint: '/job/search', params: {} },
      visual_template: 'ranked_horizontal_bar',
    })),
    generation_steps: [],
    template_diversity: {
      distinct_templates_in_top_3: distinctTemplates,
      diversity_rationale: 'Test rationale',
    },
  };
}

describe('shouldShowTemplateDiversityBanner', () => {
  it('shows when the actual distinct template count is below 2', () => {
    expect(shouldShowTemplateDiversityBanner(runWithDiversity(1))).toBe(true);
  });

  it('does not depend on optional warning copy', () => {
    const run = runWithDiversity(1);
    delete run.template_diversity?.warning;

    expect(shouldShowTemplateDiversityBanner(run)).toBe(true);
  });

  it('hides when there are at least 2 distinct templates or no candidates', () => {
    expect(shouldShowTemplateDiversityBanner(runWithDiversity(2))).toBe(false);
    expect(shouldShowTemplateDiversityBanner(runWithDiversity(1, 0))).toBe(false);
  });
});
