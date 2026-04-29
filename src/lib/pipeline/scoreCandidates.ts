import type { CandidateSpec } from '../types';

export type Stage2Scores = {
  api_feasibility: number;
  recency: number;
  archetype_fit: number;
  visual_potential: number;
  engagement_likelihood: number;
  total: number;
};

export type ScoredCandidate = {
  candidate_id: string;
  feasible: boolean;
  reason: string;
  source?: string;
  source_url?: string;
  scores: Stage2Scores;
  matched_archetype: string;
  matched_angle: string;
  matched_visual: string;
};

export type ScoreCandidatesResponse = {
  scored_candidates?: ScoredCandidate[];
};

export function buildScoreCandidatesPrompt(rawCandidates: unknown[], endpointRegistry: string) {
  return `Candidate trends:
${JSON.stringify({ candidates: rawCandidates }, null, 2)}

Endpoint capability registry:
${endpointRegistry}

Pass 1 task: score every candidate and decide whether it is structurally feasible using only the usable Crustdata endpoints in the registry.

Rules:
- Return valid minified JSON only. No indentation, markdown fences, or prose before or after the JSON.
- Use base/editorial fit only in this pass. Do not choose final headlines, subheads, chart data specs, or visual templates beyond matched_visual.
- feasible must be true only when the candidate can plausibly become a Crustdata-backed chart using one usable endpoint family.
- feasible must be false for sentiment analysis, comment analysis, unavailable endpoints, broad web discovery, professional-network live endpoints, /web/search/live, cross-endpoint joins, or topics likely to return too few rows.
- Keep reason to 12 words or fewer.
- Keep source to 8 words or fewer. Copy source_url exactly if present.
- Keep matched_archetype, matched_angle, and matched_visual as short snake_case ids.
- For infeasible candidates, output only the fields in the schema below. Do not include headline, subhead, rationale, crustdata_query, visual_template, or expected_data_shape.

Return JSON with this exact shape:
{"scored_candidates":[{"candidate_id":"c_01","feasible":true,"reason":"short feasibility reason","source":"short source","source_url":"https://...","scores":{"api_feasibility":0,"recency":0,"archetype_fit":0,"visual_potential":0,"engagement_likelihood":0,"total":0},"matched_archetype":"name","matched_angle":"name","matched_visual":"chart_type"}]}`;
}

export function isScoredCandidate(value: unknown): value is ScoredCandidate {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<ScoredCandidate>;
  return (
    typeof candidate.candidate_id === 'string' &&
    typeof candidate.feasible === 'boolean' &&
    typeof candidate.reason === 'string' &&
    typeof candidate.scores?.total === 'number'
  );
}

export function scoreTotal(candidate: Pick<CandidateSpec, 'scores'> | Pick<ScoredCandidate, 'scores'>) {
  return typeof candidate.scores?.total === 'number' ? candidate.scores.total : 0;
}
