import type { CandidateSpec, TemplateDiversityCheck } from '../types';
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
  template_diversity_check?: TemplateDiversityCheck;
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
 * Verbatim diversity rule for the Stage 2 reframer SYSTEM prompt. It sits immediately
 * after the cached design.md block so the model reads `use_when` rules first, then the
 * explicit "top-3 must be diverse" mandate.
 *
 * Repetitive visual templates across runs is the #1 quality issue users complain about,
 * so this is intentionally aggressive.
 */
export const STAGE_2_DIVERSITY_RULE = `Diversity rule for visual_template selection:
When you produce the top 3 reframed candidates, the three candidates MUST collectively represent at least 2 distinct visual_template values. Surfacing 3 candidates that all map to the same visual_template (e.g., all three using ranked_horizontal_bar) is forbidden — even if all three trends are technically ranking-shaped.

If the candidate pool contains only ranking-shaped trends, you must:
- Include at most ONE candidate using ranked_horizontal_bar.
- For the other two slots, find candidates whose data CAN be reframed to a different chart type. Examples:
  - A "ranking by growth %" trend → diverging_horizontal_bar (showing the % changes, not absolute counts)
  - A "current snapshot" trend across a few entities → vertical_bar_comparison instead of ranked_horizontal_bar
  - A "what makes up X" trend → stacked_horizontal_bar
  - A "how X changed over time" trend → single_line_timeseries_with_annotations or multi_line_timeseries
  - A "distribution across categories" trend → donut_chart
  - A "before vs after" trend → slope_chart
  - A "two-metric relationship" trend → scatter_plot

If after creative reframing you still cannot diversify the top 3, mark some candidates as feasible: false with reason "ranked-bar-saturation: skipping to surface visual variety in this run." This is preferable to surfacing three identical-looking charts.

Repetitive visual templates across runs is the #1 quality issue users complain about. Prioritize variety aggressively when there's any reasonable mapping.

Accountability: when you call submit_reframed_candidates, you MUST also fill the template_diversity_check object with:
- distinct_templates_in_top_3: integer count of distinct visual_template values across feasible candidates in your top 3.
- recent_templates_avoided: array of template ids from the recent-runs list (in the user message) that you intentionally did NOT pick this run.
- diversity_rationale: a short sentence explaining how this top-3 set provides visual variety, e.g., "Used ranked_horizontal_bar once, diverging_horizontal_bar for the YoY-deltas trend, and donut_chart for the geographic distribution."`;

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

function formatRecentTemplatesBlock(recentTemplates: string[]) {
  if (!recentTemplates.length) {
    return `Recently used visual_template values across the last 5 saved runs:
(no saved runs yet — no templates to avoid)

Pick the template that fits the data shape; you have a clean slate.`;
  }

  const bullets = recentTemplates.map((template) => `- ${template}`).join('\n');
  return `Recently used visual_template values across the last 5 saved runs:
${bullets}

Heavily prefer template values NOT in this list. If the candidate pool requires reusing a recent template, prefer the LEAST-used one. The dashboard becomes visually monotonous when the same template repeats; aggressive variety is the goal.`;
}

export function buildReframeCandidatesPrompt(
  scoredCandidates: ScoredCandidate[],
  endpointRegistry: string,
  options: { recentVisualTemplates?: string[] } = {}
) {
  const recentTemplates = options.recentVisualTemplates ?? [];

  return `Top feasible scored candidates:
${JSON.stringify({ scored_candidates: scoredCandidates }, null, 2)}

Endpoint capability registry:
${endpointRegistry}

${VISUAL_TEMPLATE_GUIDE}

${formatRecentTemplatesBlock(recentTemplates)}

Pass 2 task: fully reframe only these feasible candidates into deterministic Crustdata query specs and post-ready presentation fields.

Rules:
- Return one item for each input candidate. Do not add new candidates.
- Use exactly one usable Crustdata endpoint from the registry for each crustdata_query.
- crustdata_query.intent MUST be copied exactly from the endpoint's supported_intents list in the registry. Do not write a sentence or explanation in intent; put explanations in rationale.
- Do not invent endpoints, params, fields, operators, or capabilities.
- crustdata_query.params may contain only documented required_params and optional_params from the registry. Do not include helper keys such as post_processing, _note, grouping_notes, transform, or client_side_grouping.
- Put grouping/aggregation instructions in rationale or expected_data_shape, not in crustdata_query.params, unless the endpoint documents an aggregations param.
- Common /job/search field paths: use company.basic_info.name for company name and company.basic_info.primary_domain for company domain. Do not use company.name or company.primary_domain.
- Prefer broad query specs likely to return enough data for a chart.
- For /job/search count posts, prefer limit: 0 plus count/group_by aggregations.
- For row-returning search posts, request at least 5 rows.
- visual_template MUST be exactly one of: ${VISUAL_TEMPLATE_IDS.join(', ')}. Do not invent variants like bar, horizontal_bar, ranked_horizontal_bar_with_left_logos, or line_chart.
- Do not pick event_effect_multi_panel_line unless the candidate explicitly requires pre/post comparison across 3+ entities sharing the same event type — it is special-case only.
- Apply the diversity rule from the system prompt: at most ONE candidate may use ranked_horizontal_bar across the surfaced top 3.
- Do not use autocomplete endpoints as final post data unless the candidate is specifically about valid filter-value suggestions.
- If you discover a candidate actually cannot be answered, set feasible: false and submit only: candidate_id, feasible, reason, source, source_url, scores, matched_archetype, matched_angle, matched_visual. Omit headline, subhead, rationale, crustdata_query, visual_template, and expected_data_shape entirely.
- After choosing visual_template values, fill the top-level template_diversity_check field on the tool input with distinct_templates_in_top_3, recent_templates_avoided, and diversity_rationale (see the system prompt for definitions). Be honest — distinct_templates_in_top_3 must equal the actual number of distinct visual_template values across feasible candidates you submit.
- Submit all reframed candidates through the submit_reframed_candidates tool.`;
}

export function isReframedCandidate(value: unknown): value is ReframedCandidate {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<ReframedCandidate>;
  return typeof candidate.candidate_id === 'string' && typeof candidate.feasible === 'boolean';
}

/**
 * Pure helper used by Stage 2 to decide whether the reframer's top-3 set is diverse enough.
 * Returns the soft warning copy when fewer than 2 distinct templates appear; otherwise null.
 *
 * Exported so the validator + tests can share the same threshold without duplicating it.
 */
export function buildDiversityWarning(distinctTemplatesInTop3: number): string | null {
  if (distinctTemplatesInTop3 >= 2) return null;
  return 'Limited template variety this run — consider rerolling.';
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
