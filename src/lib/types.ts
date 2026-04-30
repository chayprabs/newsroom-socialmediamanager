export type RunStatus =
  | 'created'
  | 'discovering'
  | 'no_matches'
  | 'awaiting_selection'
  | 'awaiting_chart_type_selection'
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
  chart_type_options?: ChartTypeOption[];
  expected_data_shape?: string;
}

export interface GenerationStep {
  id: 'fetching_data' | 'finalizing_data' | 'awaiting_chart_type_selection' | 'generating_image';
  title: string;
  description: string;
  status: StepStatus;
  microStatus?: string;
}

export interface ChartTypeOption {
  rank: number;
  visual_template: string;
  rationale: string;
  data_preview: string;
  suitability_score: number;
}

export interface ChartDatum {
  label?: string;
  entity?: string;
  date?: string;
  value: number;
  color?: string;
  brand_color_hex?: string;
  count?: number;
  total?: number;
  percent?: number;
  x?: number;
  y?: number;
}

export interface ChartAnnotation {
  date: string;
  label: string;
  sublabel?: string;
  value?: number;
}

export interface ChartEntitySeries {
  entity: string;
  color?: string;
  brand_color_hex?: string;
  points?: ChartDatum[];
  start_value?: number;
  end_value?: number;
  x?: number;
  y?: number;
}

export interface ChartSegment {
  label: string;
  value: number;
  color?: string;
  count?: number;
  percent?: number;
  icon?: string;
  flag_or_logo?: string;
}

export interface GeneratedPostData {
  title: string;
  subtitle: string;
  rows?: ChartDatum[];
  points?: ChartDatum[];
  entities?: ChartEntitySeries[];
  segments?: ChartSegment[];
  annotations?: ChartAnnotation[];
  unit_label?: string;
  y_axis_title?: string;
  x_axis_label?: string;
  y_axis_label?: string;
  start_time_label?: string;
  end_time_label?: string;
  total_annotation?: string;
  donut_hole_total?: number | string;
  donut_hole_label?: string;
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

export interface TemplateDiversityCheck {
  /** How many distinct `visual_template` values appear across the top-3 surfaced candidates. */
  distinct_templates_in_top_3: number;
  /** Recent-run templates that the reframer reports it actively avoided. */
  recent_templates_avoided?: string[];
  /** Sonnet's plain-English explanation of how this top-3 set provides visual variety. */
  diversity_rationale: string;
  /** Soft-fail warning copy shown in the UI when fewer than 2 distinct templates appear. */
  warning?: string;
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
  selected_chart_template?: string;
  selected_chart_rationale?: string;
  image_path?: string;
  image_filename?: string;
  image_mime_type?: string;
  image_model?: string;
  image_data_url?: string;
  usage_summary?: UsageSummary;
  saved_at?: string;
  /**
   * Top-level snapshot of the visual template the run actually rendered.
   * Stamped by `recordTemplateUsed` when the run is saved so that
   * `getRecentTemplates` does not have to dig into `selected_candidate`.
   */
  visual_template?: string;
  /** Stage 2 reframer's diversity self-check for the candidate set. */
  template_diversity?: TemplateDiversityCheck;
  /**
   * Optional per-run steering text submitted from the Dashboard chat-box.
   * Threaded into Stage 1 and Stage 2 prompts to bias trend discovery toward a
   * user-chosen intent (e.g., "AI hiring", "Founder lineage"). Empty/undefined
   * means general trending — Stage 1 falls back to the static base.md flow.
   */
  steering_input?: string;
  /**
   * Stage 1's one-sentence acknowledgement of how it interpreted the user's
   * steering input. When `steering_input` is empty Stage 1 still records a
   * neutral acknowledgement (e.g., "No steering input — defaulted to general
   * trending discovery.") so the run-detail UI can surface that the system
   * understood the user correctly.
   */
  steering_acknowledged?: string;
  /**
   * Recency window (in days) Stage 1 asked Grok to honor. Stamped alongside
   * `steering_acknowledged` so the same artifact captures both how the run was
   * steered and how far back it looked.
   */
  steering_time_window_days?: number;
  /**
   * When the Dashboard/API truncated a long steering string, this holds the
   * original character count before truncation (the stored `steering_input`
   * is capped at 200). Used only to surface a Stage 1 system note—Sonnet never
   * receives an empty steering string, and we do not sanitize content.
   */
  steering_input_truncated_from_chars?: number;
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
  stage_4c_duration_ms?: number;
  by_stage: UsageStageSummary[];
}
