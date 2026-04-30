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

export interface BuildScoreCandidatesPromptOptions {
  /**
   * Optional per-run steering text from the Dashboard chat-box. Surfaced as a
   * soft preference — see {@link buildSteeringContextBlock} — never as a hard
   * filter, so the existing rubric (api_feasibility, recency, archetype_fit,
   * visual_potential, engagement_likelihood) is unchanged.
   */
  steeringInput?: string;
}

export function buildScoreCandidatesPrompt(
  rawCandidates: unknown[],
  endpointRegistry: string,
  options: BuildScoreCandidatesPromptOptions = {},
) {
  return `Candidate trends:
${JSON.stringify({ candidates: rawCandidates }, null, 2)}

Endpoint capability registry:
${endpointRegistry}

${buildSteeringContextBlock(options.steeringInput)}

Pass 1 task: score every candidate and decide whether it is structurally feasible using only the usable Crustdata endpoints in the registry.

Rules:
- Use base/editorial fit only in this pass. Do not choose final headlines, subheads, chart data specs, or visual templates beyond matched_visual.
- feasible must be true only when the candidate can plausibly become a Crustdata-backed chart using one usable endpoint family.
- feasible must be false for sentiment analysis, comment analysis, unavailable endpoints, broad web discovery, professional-network live endpoints, /web/search/live, cross-endpoint joins, or topics likely to return too few rows.
- Keep reason to 12 words or fewer.
- Keep source to 8 words or fewer. Copy source_url exactly if present.
- Keep matched_archetype, matched_angle, and matched_visual as short snake_case ids.
- For infeasible candidates, use only the fields in the tool schema. Do not include headline, subhead, rationale, crustdata_query, visual_template, or expected_data_shape.
- Submit all scored candidates through the submit_candidate_scores tool.`;
}

/**
 * Soft-preference block embedded in Stage 2 user messages. Both Stage 2 passes
 * (score + reframe) read the same block so the rubric stays consistent across
 * passes; Stage 1 builds its own steering block because it has different
 * instructions (PRIMARY signal for query construction).
 *
 * Always emits the block — even when steering is absent — so prompt caching
 * sees a stable structural prefix and the model has explicit context that the
 * run was not steered.
 */
export function buildSteeringContextBlock(steeringInput?: string): string {
  const trimmed = steeringInput?.trim();
  if (!trimmed) {
    return `USER STEERING INPUT for this run (for context — do not let this change your scoring rubric):
(blank — no steering input was provided; score with the standard rubric only)`;
  }

  return `USER STEERING INPUT for this run (for context — do not let this change your scoring rubric):
${trimmed}

If steering input is present: prefer candidates that align tightly with what the user asked for. If multiple candidates match the input equally well, fall back to standard scoring criteria. Do NOT artificially boost weak candidates just because they mention the steering keywords — quality and feasibility still matter most.`;
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
