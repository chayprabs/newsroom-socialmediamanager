export type RunStatus =
  | 'created'
  | 'discovering'
  | 'no_matches'
  | 'awaiting_selection'
  | 'generating'
  | 'ready'
  | 'saved'
  | 'failed';

export type StepStatus = 'done' | 'running' | 'pending' | 'error';

export interface PipelineLog {
  at: string;
  message: string;
}

export interface CandidateSpec {
  candidate_id: string;
  headline: string;
  subhead: string;
  source?: string;
  source_url?: string;
  scores?: {
    api_feasibility?: number;
    recency?: number;
    archetype_fit?: number;
    visual_potential?: number;
    engagement_likelihood?: number;
    total?: number;
  };
  matched_archetype?: string;
  matched_angle?: string;
  matched_visual?: string;
  rationale?: string;
  crustdata_query: {
    endpoint: string;
    intent?: string;
    params: Record<string, unknown>;
  };
  visual_template: string;
  expected_data_shape?: string;
}

export interface GenerationStep {
  id: 'fetching_data' | 'finalizing_data' | 'generating_image';
  title: string;
  description: string;
  status: StepStatus;
  microStatus?: string;
}

export interface GeneratedPostData {
  title: string;
  subtitle: string;
  rows: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  footer: string;
  source_metadata?: Record<string, unknown>;
}

export type RunErrorKind =
  | 'image_prompt_validation_failed'
  | 'image_prompt_too_long'
  | 'openai_image_rejected'
  | 'generic';

export interface RunErrorDetails {
  kind: RunErrorKind;
  /** Short human-readable label, e.g. "Image prompt validation failed". */
  label: string;
  /** Required elements still missing on the final attempt (validation failure only). */
  missing?: string[];
  /** Soft validator warnings carried alongside the failure. */
  warnings?: string[];
  /** Number of Stage 4a Sonnet attempts taken before giving up. */
  attempts?: number;
  /** Final prompt length when the hard cap was tripped. */
  prompt_length_chars?: number;
  /** Maximum prompt length when the hard cap was tripped. */
  cap_chars?: number;
  /** HTTP status code from the upstream OpenAI rejection, when available. */
  status_code?: number;
}

export interface RunState {
  run_id: string;
  created_at: string;
  updated_at: string;
  status: RunStatus;
  logs: PipelineLog[];
  candidates: CandidateSpec[];
  selected_candidate_id?: string;
  selected_candidate?: CandidateSpec;
  generation_steps: GenerationStep[];
  data?: GeneratedPostData;
  caption?: string;
  image_path?: string;
  image_filename?: string;
  image_mime_type?: string;
  image_model?: string;
  usage_summary?: UsageSummary;
  saved_at?: string;
  error?: string;
  error_details?: RunErrorDetails;
}

export interface RunSummary {
  run_id: string;
  headline: string;
  date: string;
  status: RunStatus;
  image_url?: string;
}

export interface UsageStageSummary {
  stage: string;
  sonnet_calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface UsageSummary {
  run_id: string;
  generated_at: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_reads: number;
  total_cache_writes: number;
  total_sonnet_calls: number;
  stage_2_total?: UsageStageSummary;
  stage_4_total?: UsageStageSummary;
  by_stage: UsageStageSummary[];
}
