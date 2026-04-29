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
  by_stage: UsageStageSummary[];
}
