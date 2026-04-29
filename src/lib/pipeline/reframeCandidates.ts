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

export function buildReframeCandidatesPrompt(scoredCandidates: ScoredCandidate[], endpointRegistry: string) {
  return `Top feasible scored candidates:
${JSON.stringify({ scored_candidates: scoredCandidates }, null, 2)}

Endpoint capability registry:
${endpointRegistry}

Pass 2 task: fully reframe only these feasible candidates into deterministic Crustdata query specs and post-ready presentation fields.

Rules:
- Return valid JSON only. No markdown fences. No prose before or after the JSON.
- Return one item for each input candidate. Do not add new candidates.
- Use exactly one usable Crustdata endpoint from the registry for each crustdata_query.
- Do not invent endpoints, params, fields, operators, or capabilities.
- crustdata_query.params may contain only documented required_params and optional_params from the registry. Do not include helper keys such as post_processing, _note, grouping_notes, transform, or client_side_grouping.
- Put grouping/aggregation instructions in rationale or expected_data_shape, not in crustdata_query.params, unless the endpoint documents an aggregations param.
- Common /job/search field paths: use company.basic_info.name for company name and company.basic_info.primary_domain for company domain. Do not use company.name or company.primary_domain.
- Prefer broad query specs likely to return enough data for a chart.
- For /job/search count posts, prefer limit: 0 plus count/group_by aggregations.
- For row-returning search posts, request at least 5 rows.
- Do not use autocomplete endpoints as final post data unless the candidate is specifically about valid filter-value suggestions.
- If you discover a candidate actually cannot be answered, set feasible: false and output only: candidate_id, feasible, reason, source, source_url, scores, matched_archetype, matched_angle, matched_visual. Omit headline, subhead, rationale, crustdata_query, visual_template, and expected_data_shape entirely.

Return JSON with this exact shape for feasible candidates:
{
  "candidates": [
    {
      "candidate_id": "c_01",
      "feasible": true,
      "reason": "short endpoint mapping reason",
      "headline": "headline",
      "subhead": "subhead",
      "source": "short trend source text",
      "source_url": "https://...",
      "scores": {
        "api_feasibility": 0,
        "recency": 0,
        "archetype_fit": 0,
        "visual_potential": 0,
        "engagement_likelihood": 0,
        "total": 0
      },
      "matched_archetype": "name",
      "matched_angle": "name",
      "matched_visual": "chart type",
      "rationale": "one sentence",
      "crustdata_query": { "endpoint": "/job/search", "intent": "hiring_analysis", "params": {} },
      "visual_template": "ranked_horizontal_bar",
      "expected_data_shape": "rows of label/value"
    }
  ]
}`;
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
    visual_template: candidate.visual_template || candidate.matched_visual || 'bar',
    expected_data_shape: candidate.expected_data_shape,
  };
}
