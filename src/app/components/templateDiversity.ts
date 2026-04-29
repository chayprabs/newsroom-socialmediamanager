import type { RunState } from '@/lib/types';

export function shouldShowTemplateDiversityBanner(run: RunState | null | undefined) {
  return Boolean(
    run?.template_diversity &&
      run.template_diversity.distinct_templates_in_top_3 < 2 &&
      run.candidates.length > 0
  );
}
