import type { CandidateSpec } from '../types';
import type { ScoredCandidate } from './scoreCandidates';

export type ReframedCandidate = ScoredCandidate & {
  headline?: string;
  subhead?: string;
  rationale?: string;
  crustdata_query?: {
    endpoint?: string;
    intent?: string;
    params?: Record<string, unknown>;
  };
  visual_template?: string;
  expected_data_shape?: string;
};

export type ReframeCandidatesResponse = {
  candidates?: ReframedCandidate[];
};

/**
 * Closed enum of `visual_template` values whose worked-example skeletons live in design.md
 * (sections 7-8). Kept here so the reframer prompt can both list every template AND ask
 * Sonnet to actively distribute its picks across them.
 *
 * Whenever a new worked example is added to design.md, add the matching id here AND to
 * `ALLOWED_VISUAL_TEMPLATES` in `src/lib/server/pipeline.ts`.
 */
export const VISUAL_TEMPLATE_IDS = [
  'ranked_horizontal_bar',
  'ranked_horizontal_bar_with_icons',
  'vertical_bar_comparison',
  'single_line_timeseries',
  'annotated_line_timeseries',
  'event_effect_multi_panel_line',
  'diverging_horizontal_bar',
  'multi_line_timeseries',
  'single_line_timeseries_with_annotations',
  'stacked_horizontal_bar',
  'donut_chart',
  'slope_chart',
  'scatter_plot',
] as const;

export type VisualTemplateId = (typeof VISUAL_TEMPLATE_IDS)[number];

/**
 * Short shape-based hints to help Sonnet pick the RIGHT template instead of defaulting to
 * `ranked_horizontal_bar` because that's the only worked example that feels familiar.
 *
 * The rules deliberately mirror the `use_when` / `do_not_use_when` rules in design.md
 * sections 7.7-7.13 — keep them in sync.
 */
const VISUAL_TEMPLATE_GUIDE = `Visual-template selection guide (pick the template that fits the data shape, not the most familiar one):
- ranked_horizontal_bar: ranked categories of the SAME type with all-positive values (top-N destinations, hires, role counts).
- ranked_horizontal_bar_with_icons: same as ranked_horizontal_bar but each row is a recognizable named brand and an icon adds value.
- vertical_bar_comparison: 3-5 distinct competitors compared on ONE metric. Few categories, snapshot.
- single_line_timeseries: ONE entity, ONE metric, over time. No notable inflection events.
- annotated_line_timeseries: ONE entity over time WITH 2-5 sharp data callouts (data-flavored boxes).
- diverging_horizontal_bar: changes (% growth/decline, YoY deltas, gains/losses) where values are SIGNED — both positive and negative. Has a meaningful zero baseline.
- multi_line_timeseries: 3-5 distinct named entities tracked over time on the SAME metric — show relative trends and crossovers.
- single_line_timeseries_with_annotations: ONE entity over time with NARRATIVE event pills (launches, fundraises, pivots). Softer, more storytelling than annotated_line_timeseries.
- stacked_horizontal_bar: COMPOSITION of a single whole — shares of one entity (where employees came from, revenue mix). Sums to 100%.
- donut_chart: geographic or categorical distribution where the WHOLE matters and the total count is the focal point. 3-8 segments.
- slope_chart: BEFORE-and-AFTER comparison on ONE metric across several entities, between EXACTLY two time points. Rank changes are the story.
- scatter_plot: relationship between TWO metrics across multiple entities (e.g., headcount vs revenue/employee). Each entity is one point.
- event_effect_multi_panel_line: special-case landscape format. Do NOT auto-select; only use when the candidate explicitly requires pre/post comparison across 3+ entities sharing the same event.

Hard rules:
- Values can be negative -> diverging_horizontal_bar, NOT ranked_horizontal_bar.
- Two time points exactly -> slope_chart, NOT multi_line_timeseries.
- One whole split into shares -> stacked_horizontal_bar or donut_chart, NOT ranked_horizontal_bar.
- Two metrics on the same entities -> scatter_plot.
- Many entities over time -> multi_line_timeseries (max 5) instead of stacking single_line_timeseries posts.`;

function formatRecentTemplateHistory(recentTemplates: string[]) {
  if (!recentTemplates.length) {
    return 'Recent run history is empty (no recent visual_template choices to avoid).';
  }
  const lines = recentTemplates.map((template, index) => `  ${index + 1}. ${template}`).join('\n');
  return `Visual templates already used by the most recent runs (newest first):
${lines}`;
}

function formatTemplateUsageCounts(recentTemplates: string[]) {
  if (!recentTemplates.length) return '';
  const counts = new Map<string, number>();
  for (const template of recentTemplates) {
    counts.set(template, (counts.get(template) || 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const formatted = sorted.map(([template, count]) => `  - ${template}: ${count}`).join('\n');
  return `Recent usage counts:
${formatted}`;
}

export function buildReframeCandidatesPrompt(
  scoredCandidates: ScoredCandidate[],
  endpointRegistry: string,
  options: { recentVisualTemplates?: string[] } = {}
) {
  const recentTemplates = options.recentVisualTemplates ?? [];
  const overuseCounts = recentTemplates.reduce<Map<string, number>>((counts, template) => {
    counts.set(template, (counts.get(template) || 0) + 1);
    return counts;
  }, new Map());
  const overusedTemplates = Array.from(overuseCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([template]) => template);

  return `Top feasible scored candidates:
${JSON.stringify({ scored_candidates: scoredCandidates }, null, 2)}

Endpoint capability registry:
${endpointRegistry}

${VISUAL_TEMPLATE_GUIDE}

${formatRecentTemplateHistory(recentTemplates)}
${formatTemplateUsageCounts(recentTemplates)}

Pass 2 task: fully reframe only these feasible candidates into deterministic Crustdata query specs and post-ready presentation fields.

Rules:
- Return one item for each input candidate. Do not add new candidates.
- Use exactly one usable Crustdata endpoint from the registry for each crustdata_query.
- Do not invent endpoints, params, fields, operators, or capabilities.
- crustdata_query.params may contain only documented required_params and optional_params from the registry. Do not include helper keys such as post_processing, _note, grouping_notes, transform, or client_side_grouping.
- Put grouping/aggregation instructions in rationale or expected_data_shape, not in crustdata_query.params, unless the endpoint documents an aggregations param.
- Common /job/search field paths: use company.basic_info.name for company name and company.basic_info.primary_domain for company domain. Do not use company.name or company.primary_domain.
- Prefer broad query specs likely to return enough data for a chart.
- For /job/search count posts, prefer limit: 0 plus count/group_by aggregations.
- For row-returning search posts, request at least 5 rows.
- visual_template MUST be exactly one of: ${VISUAL_TEMPLATE_IDS.join(', ')}. Do not invent variants like bar, horizontal_bar, ranked_horizontal_bar_with_left_logos, or line_chart.

Visual-template diversity rules (BINDING — read carefully):
- The dashboard already has many ranked_horizontal_bar posts. Do not auto-pick ranked_horizontal_bar just because the candidate is "rankable." Match the data SHAPE to the matching template using the selection guide above.
- Across this candidate pool, prefer DIFFERENT visual_template values for different candidates whenever the data supports it. If two candidates would naturally use the same template, look at each candidate's specific data shape and reframe one of them to a more specific template (e.g., a top-10 ranking with signed deltas should become diverging_horizontal_bar; a "share of" composition should become stacked_horizontal_bar or donut_chart; a 2024-vs-2026 comparison should become slope_chart).
- Across recent runs, AVOID repeating templates that have been used 2+ times in the recent history above${
    overusedTemplates.length
      ? ` — specifically these are currently overused: ${overusedTemplates.join(', ')}. Pick a different template unless the candidate's data shape genuinely has no other fit.`
      : '.'
  }
- Do not pick event_effect_multi_panel_line unless the candidate explicitly requires pre/post comparison across 3+ entities sharing the same event type — it is special-case only.
- If you genuinely cannot avoid an overused template for a candidate (e.g., it really is a clean top-N ranking of same-type items with all-positive values), keep it AND explain in the rationale why no other template fits the data shape.

- Do not use autocomplete endpoints as final post data unless the candidate is specifically about valid filter-value suggestions.
- If you discover a candidate actually cannot be answered, set feasible: false and submit only: candidate_id, feasible, reason, source, source_url, scores, matched_archetype, matched_angle, matched_visual. Omit headline, subhead, rationale, crustdata_query, visual_template, and expected_data_shape entirely.
- Submit all reframed candidates through the submit_reframed_candidates tool.`;
}

export function isReframedCandidate(value: unknown): value is ReframedCandidate {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<ReframedCandidate>;
  return typeof candidate.candidate_id === 'string' && typeof candidate.feasible === 'boolean';
}

export function toCandidateSpec(candidate: ReframedCandidate): CandidateSpec {
  return {
    candidate_id: candidate.candidate_id,
    headline: candidate.headline || 'Untitled idea',
    subhead: candidate.subhead || '',
    source: candidate.source,
    source_url: candidate.source_url,
    scores: candidate.scores,
    matched_archetype: candidate.matched_archetype,
    matched_angle: candidate.matched_angle,
    matched_visual: candidate.matched_visual,
    rationale: candidate.rationale,
    crustdata_query: {
      endpoint: candidate.crustdata_query?.endpoint || '',
      intent: candidate.crustdata_query?.intent,
      params: candidate.crustdata_query?.params || {},
    },
    visual_template: candidate.visual_template || candidate.matched_visual || '',
    expected_data_shape: candidate.expected_data_shape,
  };
}
