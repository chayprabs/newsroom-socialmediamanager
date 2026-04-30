import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CandidateSpec, ChartTypeOption, GeneratedPostData, GenerationStep, RunErrorDetails, RunState } from '../types';
import {
  type AnthropicCallOptions,
  type AnthropicTextBlock,
  type AnthropicResponse,
  callAnthropicWithResponse,
  callCrustdata,
  callGrok,
  generateOpenAiImage,
  isOpenAiImageConfigured,
} from './clients';
import { logSonnetUsage, logStageUsage } from '../pipeline/tokenLogger';
import { extractJsonObjectWithDiagnostics } from '../pipeline/jsonDiagnostics';
import {
  buildScoreCandidatesPrompt,
  isScoredCandidate,
  scoreTotal,
  type ScoreCandidatesResponse,
  type ScoredCandidate,
} from '../pipeline/scoreCandidates';
import {
  buildDiversityWarning,
  buildReframeCandidatesPrompt,
  isReframedCandidate,
  STAGE_2_DIVERSITY_RULE,
  type ReframeCandidatesResponse,
  type ReframedCandidate,
} from '../pipeline/reframeCandidates';
import { getRecentTemplates, recordTemplateUsed } from '../pipeline/templateHistory';
import {
  getRecentSteeringHistory,
  recordSteering,
  type RecentSteeringEntry,
} from '../pipeline/topicHistory';
import {
  buildImagePrompt,
  ImagePromptTooLongError,
  ImagePromptValidationError,
} from '../pipeline/imagePromptBuilder';
import { applyFooterOverlay, type FooterOverlayResult } from '../pipeline/footerOverlay';
import { renderPostSvg } from './image';
import {
  formatEndpointCapabilitiesForPrompt,
  getEndpointCapability,
  normalizeCrustdataEndpoint,
  usableEndpointCapabilities,
  type CrustdataEndpointCapability,
} from './clients/crustdata/endpoint_capabilities';
import {
  appendRunArtifact,
  getRunDir,
  readMarkdown,
  readRun,
  writeRun,
  writeRunArtifact,
  writeRunBinaryArtifact,
} from './storage';

type FeasibilityResult = {
  feasible: boolean;
  reason: string;
  mapped_endpoints: string[];
};

type CandidateForValidation = Omit<Partial<CandidateSpec>, 'crustdata_query'> & {
  candidate_id?: string;
  feasible?: boolean;
  reason?: string;
  infeasibility_reason?: string;
  crustdata_query?: {
    endpoint?: string;
    intent?: string;
    params?: Record<string, unknown>;
  };
  chart_type_options?: ChartTypeOption[];
};

type RuntimeKnowledgeFile = 'base' | 'design';
type RuntimeKnowledge = Partial<Record<RuntimeKnowledgeFile, string>>;
type AnthropicTool = NonNullable<AnthropicCallOptions['tools']>[number];
type DiscoveryCandidatesResponse = {
  candidates?: unknown[];
};
type GeneratedPostToolInput = {
  data?: GeneratedPostData;
  caption?: string;
  hook?: string;
  key_data_point?: string;
};

const FEASIBILITY_LOG_FILENAME = 'pipeline.log';
const MAX_DISCOVERY_CANDIDATES = 10;
const GROK_QUERY_TOOL_NAME = 'submit_grok_query';

/** Must stay in sync with POST /api/runs steering cap. Exported for the route. */
export const MAX_STEERING_INPUT_CHARS = 200;

const DEFAULT_STEERING_TIME_WINDOW_DAYS = 7;
const MIN_STEERING_TIME_WINDOW_DAYS = 1;
const MAX_STEERING_TIME_WINDOW_DAYS = 30;
const SHOULD_PREFLIGHT_CRUSTDATA = process.env.NEWSROOM_PREFLIGHT_CRUSTDATA !== '0';
const DISCOVERY_CANDIDATES_TOOL_NAME = 'submit_discovery_candidates';
const SCORE_CANDIDATES_TOOL_NAME = 'submit_candidate_scores';
const REFRAME_CANDIDATES_TOOL_NAME = 'submit_reframed_candidates';
const GENERATED_POST_TOOL_NAME = 'submit_generated_post';
const ALLOWED_VISUAL_TEMPLATES = new Set([
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
]);
const STATIC_PROJECT_CONTEXT = `Newsroom is Crustdata's internal pipeline for turning live tech/startup trend signals into API-backed data posts.
Use the cached knowledge files as the source of truth for editorial fit, topic scope, voice, visual conventions, and pipeline constraints.
Keep stage outputs concise, structured, and faithful to the supplied runtime data.
Do not invent data, endpoints, sources, companies, metrics, or claims.`;

const UNSUPPORTED_QUESTION_PATTERNS = [
  {
    pattern: /\bsentiment\b/i,
    reason: 'Crustdata has no verified endpoint for sentiment analysis.',
  },
  {
    pattern: /\b(hn|hacker news)\s+comments?\b/i,
    reason: 'Crustdata has no verified endpoint for Hacker News comment analysis.',
  },
  {
    pattern: /\bcomment\s+sentiment\b/i,
    reason: 'Crustdata has no verified endpoint for comment sentiment analysis.',
  },
];
const NON_API_HELPER_PARAM_NAMES = new Set([
  '_note',
  'post_processing',
  'grouping_notes',
  'transform',
  'client_side_grouping',
]);

function isUsableCrustdataEndpoint(endpoint: string) {
  return getEndpointCapability(endpoint)?.availability === 'usable';
}

function formatUsableEndpoints() {
  return usableEndpointCapabilities().map((capability) => `- ${capability.endpoint}`).join('\n');
}

function now() {
  return new Date().toISOString();
}

function defaultSteps(): GenerationStep[] {
  return [
    {
      id: 'fetching_data',
      title: 'Fetching data',
      description: 'Querying Crustdata for the numbers behind the headline.',
      status: 'pending',
    },
    {
      id: 'finalizing_data',
      title: 'Finalizing data',
      description: 'Shaping the response into a chart-ready format.',
      status: 'pending',
    },
    {
      id: 'awaiting_chart_type_selection',
      title: 'Awaiting chart-type selection',
      description: 'Pick a chart type before the post image is rendered.',
      status: 'pending',
    },
    {
      id: 'generating_image',
      title: 'Generating image',
      description: 'Rendering the post in your visual style.',
      status: 'pending',
    },
  ];
}

async function appendLog(run: RunState, message: string) {
  return writeRun({
    ...run,
    logs: [...run.logs, { at: now(), message }],
  });
}

function classifyRunError(error: unknown, message: string): RunErrorDetails {
  if (error instanceof ImagePromptValidationError) {
    return {
      kind: 'image_prompt_validation_failed',
      label: 'Image prompt validation failed',
      missing: error.missing,
      warnings: error.warnings,
      attempts: error.attempts,
    };
  }

  if (error instanceof ImagePromptTooLongError) {
    const lengthMatch = /produced a prompt of (\d+) chars, exceeding the (\d+) cap/.exec(message);
    return {
      kind: 'image_prompt_too_long',
      label: 'Image prompt exceeded length cap',
      prompt_length_chars: lengthMatch ? Number(lengthMatch[1]) : undefined,
      cap_chars: lengthMatch ? Number(lengthMatch[2]) : undefined,
    };
  }

  if (error instanceof Error && /^OpenAI image generation failed/.test(error.message)) {
    const statusMatch = /:\s*(\d{3})\b/.exec(error.message);
    return {
      kind: 'openai_image_rejected',
      label: 'OpenAI API rejected prompt',
      status_code: statusMatch ? Number(statusMatch[1]) : undefined,
    };
  }

  return { kind: 'generic', label: 'Pipeline error' };
}

async function failRun(run: RunState, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const errorDetails = classifyRunError(error, message);

  return writeRun({
    ...run,
    status: 'failed',
    error: message,
    error_details: errorDetails,
    logs: [...run.logs, { at: now(), message }],
    generation_steps: run.generation_steps.map((step) =>
      step.status === 'running' ? { ...step, status: 'error', microStatus: message } : step
    ),
  });
}

async function noMatches(run: RunState, message: string) {
  return writeRun({
    ...run,
    status: 'no_matches',
    error: undefined,
    candidates: [],
    logs: [...run.logs, { at: now(), message }],
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPresentParam(name: string, value: unknown) {
  if (value === null || value === undefined) return false;
  if (name === 'query' && typeof value === 'string') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return true;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

function stage2ScoresSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      api_feasibility: { type: 'number' },
      recency: { type: 'number' },
      archetype_fit: { type: 'number' },
      visual_potential: { type: 'number' },
      engagement_likelihood: { type: 'number' },
      total: { type: 'number' },
    },
    required: [
      'api_feasibility',
      'recency',
      'archetype_fit',
      'visual_potential',
      'engagement_likelihood',
      'total',
    ],
  };
}

type Stage1QueryToolInput = {
  grok_query?: unknown;
  steering_acknowledged?: unknown;
  time_window_days?: unknown;
};

function grokQueryTool(): AnthropicTool[] {
  return [
    {
      name: GROK_QUERY_TOOL_NAME,
      description:
        'Submit the Grok/X live-search query for Stage 1 trend discovery, plus an explicit acknowledgement of how the steering input was interpreted.',
      input_schema: {
        type: 'object',
        properties: {
          grok_query: {
            type: 'string',
            description:
              'One concise Grok/X live-search prompt, plain text. Centers on the steering input when present, otherwise targets general trending Crustdata-shaped conversations.',
          },
          steering_acknowledged: {
            type: 'string',
            description:
              "If steering_input was present, summarize in one sentence how you interpreted the user's intent. If blank, write 'No steering input — defaulted to general trending discovery.'",
          },
          time_window_days: {
            type: 'integer',
            description:
              'Recency window the Grok query should honor, in days. Typical 7-14 for steered runs; default 7 for unsteered runs.',
          },
        },
        required: ['grok_query', 'steering_acknowledged', 'time_window_days'],
      },
    },
  ];
}

function buildStage1QueryPrompt(steeringInput?: string): string {
  const trimmed = steeringInput?.trim();
  const steeringBlock = trimmed && trimmed.length > 0 ? trimmed : '(blank — no steering input)';

  return `Write one concise Grok/X live-search prompt to find current tech/startup conversations that can become Crustdata data posts.

USER STEERING INPUT for this run:
${steeringBlock}

If the steering input is blank or absent, construct a Grok query targeting general trending conversations matching the editorial archetypes in base.md (your existing default behavior).

If the steering input is present, construct a Grok query that:
1. Centers on the topic, entity, or angle the user described.
2. Still respects the editorial archetypes in base.md — find the trending conversations within that steering input that ALSO match Crustdata's archetypes.
3. Specifically searches for X conversations referencing the entities or topics mentioned in the steering input.
4. Returns 8-12 candidates focused on the steering input rather than general trends.

Examples of how to handle steering inputs:
- Input "Thinking Machines Lab recent hires" → Grok query targeting conversations on X discussing Thinking Machines Lab's hiring, talent movement, founding team, recent additions, all within the last 14 days.
- Input "AI hiring" → broader: Grok query targeting trending conversations about AI lab hiring velocity, role distribution, layoffs, startup hiring patterns, recent 7-14 days.
- Input "Anthropic" → entity-centric: trending conversations about Anthropic specifically — funding, products, hiring, comparisons with other labs.

The user's steering input is the PRIMARY signal for what they want. base.md is the secondary signal that constrains how the topic is framed editorially.

The downstream Crustdata key can only use these endpoint-backed post shapes:
- Hiring demand and job-posting counts via /job/search.
- Company cohorts, rankings, funding/headcount/location/taxonomy comparisons via /company/search.
- Known-company deep dives via /company/enrich.
- Founder, alumni, title, employer, skills, and location patterns via /person/search.
- Known-person enrichment via /person/enrich.
- Known-URL page fetches via /web/enrich/live.

Avoid trends that require unavailable data: professional-network live endpoints, /web/search/live, broad web discovery, sentiment analysis, comment analysis, or anything that needs values Crustdata cannot structurally return.
Prefer data-rich questions with broad cohorts, rankings, or aggregations.

If the steering input is in a non-English language, you may construct the Grok query in English (which is what Grok handles best) but include the original-language entity names verbatim.

Submit through the ${GROK_QUERY_TOOL_NAME} tool. Set time_window_days to the recency window the Grok query should honor (default ${DEFAULT_STEERING_TIME_WINDOW_DAYS}; for steered runs prefer 7-14 unless the steering input clearly demands a different window).`;
}

/**
 * Render the "Recent steerings used in the last N runs" block injected into
 * the Stage 1 system prompt's stage instruction (so prompt caching for base.md
 * is preserved — only the unstable instruction block changes per run).
 *
 * Formatted exactly as the spec example:
 *   Recent steerings used in the last 5 runs:
 *   - "Thinking Machines Lab recent hires"
 *   - "AI lab funding"
 *   - (blank)
 */
function buildRecentSteeringsBlock(history: RecentSteeringEntry[]): string {
  if (!history.length) {
    return `Recent steerings used in the last 5 runs:
(no saved runs yet — no recent steerings to consider)`;
  }

  const lines = history.map((entry) =>
    entry.steering ? `- "${entry.steering}"` : '- (blank)',
  );

  return `Recent steerings used in the last ${history.length} runs:
${lines.join('\n')}

If the current steering input matches or closely overlaps with a recent one, surface DIFFERENT angles within the same topic. The user has already seen the obvious takes — show them something fresh from the same area.

This is an additional steering signal on top of the diversity rule from the previous PR.`;
}

function clampTimeWindowDays(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_STEERING_TIME_WINDOW_DAYS;
  }
  const rounded = Math.round(value);
  if (rounded < MIN_STEERING_TIME_WINDOW_DAYS) return MIN_STEERING_TIME_WINDOW_DAYS;
  if (rounded > MAX_STEERING_TIME_WINDOW_DAYS) return MAX_STEERING_TIME_WINDOW_DAYS;
  return rounded;
}

function discoveryCandidatesTool(): AnthropicTool[] {
  return [
    {
      name: DISCOVERY_CANDIDATES_TOOL_NAME,
      description: 'Submit Crustdata-ready fallback trend candidates when Grok discovery is unavailable.',
      input_schema: {
        type: 'object',
        properties: {
          candidates: {
            type: 'array',
            maxItems: MAX_DISCOVERY_CANDIDATES,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Stable candidate id such as c_01.' },
                text: { type: 'string', description: 'Concise trend text.' },
                source_url: { type: 'string', description: 'Source URL if known, otherwise an empty string.' },
                engagement: {
                  type: 'object',
                  properties: {
                    likes: { type: 'number' },
                    reposts: { type: 'number' },
                    replies: { type: 'number' },
                  },
                  required: ['likes', 'reposts', 'replies'],
                },
                entities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Companies, people, or topics mentioned by the candidate.',
                },
              },
              required: ['id', 'text', 'source_url', 'engagement', 'entities'],
            },
          },
        },
        required: ['candidates'],
      },
    },
  ];
}

function scoreCandidatesTool(): AnthropicTool[] {
  return [
    {
      name: SCORE_CANDIDATES_TOOL_NAME,
      description: 'Submit the scored Stage 2 candidate feasibility pass.',
      input_schema: {
        type: 'object',
        properties: {
          scored_candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                candidate_id: { type: 'string' },
                feasible: { type: 'boolean' },
                reason: { type: 'string', description: 'Short feasibility reason, 12 words or fewer.' },
                source: { type: 'string' },
                source_url: { type: 'string' },
                scores: stage2ScoresSchema(),
                matched_archetype: { type: 'string' },
                matched_angle: { type: 'string' },
                matched_visual: { type: 'string' },
              },
              required: [
                'candidate_id',
                'feasible',
                'reason',
                'source',
                'source_url',
                'scores',
                'matched_archetype',
                'matched_angle',
                'matched_visual',
              ],
            },
          },
        },
        required: ['scored_candidates'],
      },
    },
  ];
}

export function reframeCandidatesTool(): AnthropicTool[] {
  return [
    {
      name: REFRAME_CANDIDATES_TOOL_NAME,
      description: 'Submit fully reframed Crustdata query specs for feasible candidates.',
      input_schema: {
        type: 'object',
        properties: {
          candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                candidate_id: { type: 'string' },
                feasible: { type: 'boolean' },
                reason: { type: 'string' },
                headline: { type: 'string' },
                subhead: { type: 'string' },
                source: { type: 'string' },
                source_url: { type: 'string' },
                scores: stage2ScoresSchema(),
                matched_archetype: { type: 'string' },
                matched_angle: { type: 'string' },
                matched_visual: { type: 'string' },
                rationale: { type: 'string' },
                crustdata_query: {
                  type: 'object',
                  properties: {
                    endpoint: { type: 'string' },
                    intent: { type: 'string' },
                    params: {
                      type: 'object',
                      additionalProperties: true,
                    },
                  },
                  required: ['endpoint', 'intent', 'params'],
                },
                visual_template: {
                  type: 'string',
                  enum: Array.from(ALLOWED_VISUAL_TEMPLATES),
                },
                chart_type_options: {
                  type: 'array',
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: 'object',
                    properties: {
                      rank: { type: 'integer', minimum: 1, maximum: 3 },
                      visual_template: {
                        type: 'string',
                        enum: Array.from(ALLOWED_VISUAL_TEMPLATES),
                        description: 'Must match a template name in design.md.',
                      },
                      rationale: {
                        type: 'string',
                        description:
                          "1-2 sentence explanation of why this chart type fits the data and the user's question. Be specific about what the chart will show.",
                      },
                      data_preview: {
                        type: 'string',
                        description:
                          "A short text preview of what the chart will look like with the actual data. Example: 'Ranked bar with 5 rows: Anthropic ($X/employee), OpenAI ($Y/employee), ... - sorted descending.'",
                      },
                      suitability_score: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 10,
                        description: "How well this chart type answers the user's question on a 1-10 scale.",
                      },
                    },
                    required: ['rank', 'visual_template', 'rationale', 'data_preview', 'suitability_score'],
                  },
                },
                expected_data_shape: { type: 'string' },
              },
              required: ['candidate_id', 'feasible', 'reason'],
            },
          },
          template_diversity_check: {
            type: 'object',
            description:
              'Self-reported diversity check for the surfaced top-3 candidates. Forces the model to explicitly account for visual variety instead of leaving it implicit in the prompt.',
            properties: {
              distinct_templates_in_top_3: {
                type: 'integer',
                minimum: 0,
                maximum: 3,
                description:
                  'Number of distinct visual_template values across feasible candidates in the top 3 you submitted.',
              },
              recent_templates_avoided: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Templates from the recent-runs list (in the user message) that you intentionally did NOT pick this run.',
              },
              diversity_rationale: {
                type: 'string',
                description: 'Short sentence explaining how this top-3 set provides visual variety.',
              },
            },
            required: ['distinct_templates_in_top_3', 'diversity_rationale'],
          },
        },
        required: ['candidates', 'template_diversity_check'],
      },
    },
  ];
}

export function generatedPostDataSchema(): Record<string, unknown> {
  const numericDatumSchema = {
    type: 'object',
    properties: {
      label: { type: 'string' },
      entity: { type: 'string' },
      date: { type: 'string' },
      value: { type: 'number' },
      color: { type: 'string', description: 'Hex color such as #6B5BD9.' },
      brand_color_hex: { type: 'string', description: 'Hex color such as #6B5BD9.' },
      count: { type: 'number' },
      total: { type: 'number' },
      percent: { type: 'number' },
      x: { type: 'number' },
      y: { type: 'number' },
    },
    required: ['value'],
  };

  return {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Post title shown on the image.' },
      subtitle: { type: 'string', description: 'Post subtitle shown on the image.' },
      rows: {
        type: 'array',
        items: numericDatumSchema,
        description:
          'Bar-style rows for ranked_horizontal_bar, ranked_horizontal_bar_with_icons, vertical_bar_comparison, and diverging_horizontal_bar. Use label + value; signed values are allowed for diverging bars.',
      },
      points: {
        type: 'array',
        items: numericDatumSchema,
        description:
          'Time-series points for single_line_timeseries and single_line_timeseries_with_annotations. Use date + value.',
      },
      entities: {
        type: 'array',
        description:
          'Entity series for multi_line_timeseries, slope_chart, and scatter_plot. Use points for multi-line; start_value/end_value for slope; x/y for scatter.',
        items: {
          type: 'object',
          properties: {
            entity: { type: 'string' },
            color: { type: 'string', description: 'Hex color such as #6B5BD9.' },
            brand_color_hex: { type: 'string', description: 'Hex color such as #6B5BD9.' },
            points: { type: 'array', items: numericDatumSchema },
            start_value: { type: 'number' },
            end_value: { type: 'number' },
            x: { type: 'number' },
            y: { type: 'number' },
          },
          required: ['entity'],
        },
      },
      segments: {
        type: 'array',
        description: 'Composition/distribution segments for stacked_horizontal_bar and donut_chart.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'number' },
            color: { type: 'string', description: 'Hex color such as #6B5BD9.' },
            count: { type: 'number' },
            percent: { type: 'number' },
            icon: { type: 'string' },
            flag_or_logo: { type: 'string' },
          },
          required: ['label', 'value'],
        },
      },
      annotations: {
        type: 'array',
        description: 'Event annotations for annotated line templates.',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            label: { type: 'string' },
            sublabel: { type: 'string' },
            value: { type: 'number' },
          },
          required: ['date', 'label'],
        },
      },
      unit_label: { type: 'string' },
      y_axis_title: { type: 'string' },
      x_axis_label: { type: 'string' },
      y_axis_label: { type: 'string' },
      start_time_label: { type: 'string' },
      end_time_label: { type: 'string' },
      total_annotation: { type: 'string' },
      donut_hole_total: { type: ['number', 'string'] },
      donut_hole_label: { type: 'string' },
      footer: { type: 'string', description: 'Data attribution, usually Data from: Crustdata.' },
      source_metadata: {
        type: 'object',
        additionalProperties: true,
      },
    },
    required: ['title', 'subtitle', 'footer'],
  };
}

function generatedPostTool(description: string): AnthropicTool[] {
  return [
    {
      name: GENERATED_POST_TOOL_NAME,
      description,
      input_schema: {
        type: 'object',
        properties: {
          data: generatedPostDataSchema(),
          caption: {
            type: 'string',
            description:
              "The caption text. 2-3 sentences. Matches Crustdata's voice: confident, data-driven, mildly contrarian.",
          },
          hook: {
            type: 'string',
            description: 'A short opening line, one sentence, that draws the reader in.',
          },
          key_data_point: {
            type: 'string',
            description: 'The single most striking data point from the chart, expressed in one short sentence.',
          },
        },
        required: ['data', 'caption', 'hook', 'key_data_point'],
      },
    },
  ];
}

function safeStageName(stage: string) {
  return stage.replace(/[^a-z0-9_-]/gi, '_');
}

async function writeAnthropicToolFailure(
  stage: string,
  runId: string,
  response: AnthropicResponse,
  reason: string
) {
  try {
    const dir = path.join(getRunDir(runId), 'debug');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${safeStageName(stage)}_failure.json`),
      JSON.stringify(
        {
          stage,
          timestamp: now(),
          failure_reason: reason,
          stop_reason: response.stop_reason,
          usage: response.usage,
          response,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (error) {
    console.error(
      `[tool-diagnostics] failed to write debug bundle for run=${runId} stage=${stage}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function throwAnthropicToolFailure(
  stage: string,
  runId: string,
  response: AnthropicResponse,
  reason: string
): Promise<never> {
  await writeAnthropicToolFailure(stage, runId, response, reason);
  throw new Error(reason);
}

async function getRequiredToolInput<T>(
  stage: string,
  runId: string,
  response: AnthropicResponse,
  toolName: string
): Promise<T> {
  const toolUse = response.content?.find((part) => part.type === 'tool_use' && part.name === toolName);
  const input = toolUse?.input;

  if (!isRecord(input)) {
    return throwAnthropicToolFailure(stage, runId, response, `${stage}: expected ${toolName} tool_use block.`);
  }

  return input as T;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isChartDatum(value: unknown, requireLabel = false, requireDate = false) {
  if (!isRecord(value)) return false;
  if (!isFiniteNumber(value.value)) return false;
  if (requireLabel && (typeof value.label !== 'string' || !value.label.trim())) return false;
  if (requireDate && (typeof value.date !== 'string' || !value.date.trim())) return false;
  return true;
}

function isChartSegment(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    value.label.trim().length > 0 &&
    isFiniteNumber(value.value)
  );
}

function isChartAnnotation(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.date === 'string' &&
    value.date.trim().length > 0 &&
    typeof value.label === 'string' &&
    value.label.trim().length > 0
  );
}

function isChartEntitySeries(value: unknown) {
  if (!isRecord(value)) return false;
  if (typeof value.entity !== 'string' || !value.entity.trim()) return false;

  const hasPoints =
    Array.isArray(value.points) &&
    value.points.length > 0 &&
    value.points.every((point) => isChartDatum(point, false, true));
  const hasSlope = isFiniteNumber(value.start_value) && isFiniteNumber(value.end_value);
  const hasScatter = isFiniteNumber(value.x) && isFiniteNumber(value.y);

  return hasPoints || hasSlope || hasScatter;
}

export function isGeneratedPostData(value: unknown): value is GeneratedPostData {
  if (!isRecord(value)) return false;
  if (typeof value.title !== 'string' || !value.title.trim()) return false;
  if (typeof value.subtitle !== 'string') return false;
  if (typeof value.footer !== 'string' || !value.footer.trim()) return false;

  const hasRows =
    Array.isArray(value.rows) &&
    value.rows.length > 0 &&
    value.rows.every((row) => isChartDatum(row, true));
  const hasPoints =
    Array.isArray(value.points) &&
    value.points.length > 0 &&
    value.points.every((point) => isChartDatum(point, false, true));
  const hasEntities =
    Array.isArray(value.entities) &&
    value.entities.length > 0 &&
    value.entities.every(isChartEntitySeries);
  const hasSegments =
    Array.isArray(value.segments) &&
    value.segments.length > 0 &&
    value.segments.every(isChartSegment);
  const annotationsOk =
    !Array.isArray(value.annotations) || value.annotations.every(isChartAnnotation);

  return annotationsOk && (hasRows || hasPoints || hasEntities || hasSegments);
}

async function getGeneratedPostToolInput(
  stage: string,
  runId: string,
  response: AnthropicResponse
): Promise<{ data: GeneratedPostData; caption: string; hook: string; key_data_point: string }> {
  const input = await getRequiredToolInput<GeneratedPostToolInput>(
    stage,
    runId,
    response,
    GENERATED_POST_TOOL_NAME
  );
  const caption = typeof input.caption === 'string' ? input.caption.trim() : '';
  const hook = typeof input.hook === 'string' ? input.hook.trim() : '';
  const keyDataPoint = typeof input.key_data_point === 'string' ? input.key_data_point.trim() : '';

  if (!isGeneratedPostData(input.data)) {
    return throwAnthropicToolFailure(
      stage,
      runId,
      response,
      `${stage}: ${GENERATED_POST_TOOL_NAME}.data did not include valid chart-ready data. Include rows, points, entities, or segments for the selected visual_template.`
    );
  }

  if (!caption) {
    return throwAnthropicToolFailure(
      stage,
      runId,
      response,
      `${stage}: ${GENERATED_POST_TOOL_NAME}.caption was empty.`
    );
  }

  return {
    data: input.data,
    caption,
    hook,
    key_data_point: keyDataPoint,
  };
}

function isKnownFieldPath(field: string, fields?: readonly string[], groups?: readonly string[]) {
  if (fields?.includes(field)) return true;
  return Boolean(groups?.some((group) => field === group || field.startsWith(`${group}.`)));
}

function unsupportedQuestionReason(candidateSpec: CandidateForValidation) {
  const text = [
    candidateSpec.headline,
    candidateSpec.subhead,
    candidateSpec.rationale,
    candidateSpec.expected_data_shape,
    candidateSpec.crustdata_query?.intent,
  ]
    .filter(Boolean)
    .join(' ');

  const match = UNSUPPORTED_QUESTION_PATTERNS.find(({ pattern }) => pattern.test(text));
  return match?.reason;
}

function validateVisualTemplate(candidateSpec: CandidateForValidation) {
  const template = typeof candidateSpec.visual_template === 'string' ? candidateSpec.visual_template.trim() : '';

  if (!template) {
    return `visual_template is required and must exactly match one of: ${Array.from(ALLOWED_VISUAL_TEMPLATES).join(
      ', '
    )}.`;
  }

  if (!ALLOWED_VISUAL_TEMPLATES.has(template)) {
    return `Unsupported visual_template "${template}". It must exactly match one of the worked-example templates in design.md: ${Array.from(
      ALLOWED_VISUAL_TEMPLATES
    ).join(', ')}.`;
  }

  return null;
}

function inferSupportedIntent(
  capability: CrustdataEndpointCapability,
  intent: string,
  params: Record<string, unknown>
) {
  const trimmed = intent.trim();
  if (capability.supported_intents.includes(trimmed)) return trimmed;

  const text = trimmed.toLowerCase();
  const supports = (value: string) => capability.supported_intents.includes(value);
  const pick = (...values: string[]) => values.find((value) => supports(value));

  if (capability.endpoint === '/job/search') {
    if ('aggregations' in params) return pick('job_aggregation', 'job_count', 'hiring_analysis');
    if (/\bhir(e|ing|es)\b/.test(text)) return pick('hiring_analysis');
    if (/\brole|demand|function|category\b/.test(text)) return pick('role_demand');
    if (/\bcount|total\b/.test(text)) return pick('job_count');
    return pick('job_search');
  }

  if (capability.endpoint === '/company/enrich') {
    if (/\btraffic|visits?|web\b/.test(text)) return pick('web_traffic_analysis');
    if (/\bheadcount|employee|employees|growth\b/.test(text)) return pick('headcount_analysis');
    if (/\bhir(e|ing|es)|jobs?\b/.test(text)) return pick('hiring_analysis');
    if (/\bfund|funding|raised|valuation|investor\b/.test(text)) return pick('funding_analysis');
    if (/\brevenue|arr\b/.test(text)) return pick('revenue_analysis');
    if (/\bfounder|people|person|alumni|employee\b/.test(text)) return pick('founder_or_people_lookup');
    return pick('company_enrich');
  }

  if (capability.endpoint === '/company/search') {
    if (/\bcountry|geograph|location|region\b/.test(text)) return pick('company_geography');
    if (/\bfund|funding|raised|valuation|investor\b/.test(text)) return pick('funding_analysis');
    if (/\bheadcount|employee|employees|growth\b/.test(text)) return pick('headcount_analysis');
    if (/\brank|top|largest|fastest|compare\b/.test(text)) return pick('company_ranking');
    if (/\bcount|total\b/.test(text)) return pick('company_count');
    if (/\bsegment|cohort|category|distribution\b/.test(text)) return pick('company_segment');
    return pick('company_search');
  }

  if (capability.endpoint === '/person/search') {
    if (/\bfounder\b/.test(text)) return pick('founder_analysis');
    if (/\balumni|former|ex[-\s]?employee\b/.test(text)) return pick('alumni_analysis');
    if (/\bcount|total\b/.test(text)) return pick('people_count');
    if (/\brole|title|skill|education|location\b/.test(text)) {
      return pick('talent_analysis', 'role_analysis', 'person_search');
    }
    return pick('person_search');
  }

  return undefined;
}

function countFilterConditions(value: unknown): number {
  if (!isRecord(value)) return 0;
  if (Array.isArray(value.conditions)) {
    return value.conditions.reduce((total, condition) => total + countFilterConditions(condition), 0);
  }
  return typeof value.field === 'string' ? 1 : 0;
}

function validateDataRichness(capability: CrustdataEndpointCapability, params: Record<string, unknown>) {
  if (capability.endpoint !== '/company/search' && capability.endpoint !== '/person/search' && capability.endpoint !== '/job/search') {
    return null;
  }

  const conditionCount = countFilterConditions(params.filters);
  if (conditionCount > 5) {
    return `${capability.endpoint} query is too narrow for candidate selection: use at most 5 filter conditions so the query is likely to return enough data.`;
  }

  if (
    typeof params.limit === 'number' &&
    params.limit > 0 &&
    params.limit < 5 &&
    !('aggregations' in params)
  ) {
    return `${capability.endpoint} query is too narrow for a chart: use limit 0 with aggregations or request at least 5 rows.`;
  }

  return null;
}

function validateRequiredParams(capability: CrustdataEndpointCapability, params: Record<string, unknown>) {
  if (capability.required_one_of?.length) {
    const present = capability.required_one_of.filter((param) => isPresentParam(param, params[param]));

    if (present.length === 0) {
      return `Missing required identifier param: provide exactly one of ${capability.required_one_of.join(', ')}.`;
    }

    if (present.length > 1) {
      return `Provide exactly one identifier param for ${capability.endpoint}; received ${present.join(', ')}.`;
    }
  }

  const directRequiredParams = capability.required_params.filter((param) => !param.startsWith('exactly one of '));
  const missing = directRequiredParams.filter((param) => !isPresentParam(param, params[param]));

  if (missing.length) {
    return `Missing required param${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`;
  }

  return null;
}

function validateParamNames(capability: CrustdataEndpointCapability, params: Record<string, unknown>) {
  const allowed = new Set([
    ...capability.required_params.filter((param) => !param.startsWith('exactly one of ')),
    ...(capability.required_one_of ?? []),
    ...capability.optional_params,
  ]);
  const unknown = Object.keys(params).filter((param) => !allowed.has(param));

  if (unknown.length) {
    return `Unsupported param${unknown.length === 1 ? '' : 's'} for ${capability.endpoint}: ${unknown.join(', ')}.`;
  }

  return null;
}

function validateFilterTree(
  value: unknown,
  capability: CrustdataEndpointCapability,
  path = 'filters'
): string | null {
  if (!isRecord(value)) {
    return `${path} must be an object.`;
  }

  if ('conditions' in value || 'op' in value) {
    const op = value.op;
    if (op !== 'and' && op !== 'or') {
      return `${path}.op must be "and" or "or".`;
    }

    if (!Array.isArray(value.conditions) || value.conditions.length === 0) {
      return `${path}.conditions must be a non-empty array.`;
    }

    for (let index = 0; index < value.conditions.length; index += 1) {
      const issue = validateFilterTree(value.conditions[index], capability, `${path}.conditions[${index}]`);
      if (issue) return issue;
    }

    return null;
  }

  const field = value.field;
  const type = value.type;

  if (typeof field !== 'string' || !field.trim()) {
    return `${path}.field is required.`;
  }

  if (capability.valid_filter_fields && !capability.valid_filter_fields.includes(field)) {
    return `Unsupported filter field for ${capability.endpoint}: ${field}.`;
  }

  if (typeof type !== 'string' || !type.trim()) {
    return `${path}.type is required.`;
  }

  if (capability.valid_operators && !capability.valid_operators.includes(type)) {
    return `Unsupported filter operator for ${capability.endpoint}: ${type}.`;
  }

  if (!['is_null', 'is_not_null'].includes(type) && !('value' in value) && type !== 'geo_distance') {
    return `${path}.value is required for operator ${type}.`;
  }

  if ((type === 'in' || type === 'not_in') && !Array.isArray(value.value)) {
    return `${path}.value must be an array for operator ${type}.`;
  }

  return null;
}

function validateFieldList(
  capability: CrustdataEndpointCapability,
  value: unknown,
  paramName: 'fields' | 'field'
) {
  if (paramName === 'field') {
    if (typeof value !== 'string' || !value.trim()) {
      return 'field must be a non-empty string.';
    }

    if (!isKnownFieldPath(value, capability.valid_return_fields, capability.valid_field_groups)) {
      return `Unsupported autocomplete field for ${capability.endpoint}: ${value}.`;
    }

    return null;
  }

  const fields = asStringArray(value);
  if (!fields) {
    return 'fields must be an array of strings.';
  }

  const invalid = fields.filter(
    (field) => !isKnownFieldPath(field, capability.valid_return_fields, capability.valid_field_groups)
  );

  if (invalid.length) {
    return `Unsupported fields for ${capability.endpoint}: ${invalid.join(', ')}.`;
  }

  return null;
}

function validateSorts(capability: CrustdataEndpointCapability, value: unknown) {
  if (!Array.isArray(value)) {
    return 'sorts must be an array.';
  }

  for (let index = 0; index < value.length; index += 1) {
    const sort = value[index];
    if (!isRecord(sort)) {
      return `sorts[${index}] must be an object.`;
    }

    const column = sort.column ?? sort.field;
    if (typeof column !== 'string' || !column.trim()) {
      return `sorts[${index}] must include column or field.`;
    }

    if (!isKnownFieldPath(column, capability.valid_sort_fields, capability.valid_field_groups)) {
      return `Unsupported sort field for ${capability.endpoint}: ${column}.`;
    }

    if (sort.order !== 'asc' && sort.order !== 'desc') {
      return `sorts[${index}].order must be "asc" or "desc".`;
    }
  }

  return null;
}

function validateAggregations(capability: CrustdataEndpointCapability, value: unknown) {
  if (!Array.isArray(value)) {
    return 'aggregations must be an array.';
  }

  if (!capability.valid_aggregation_columns) {
    return `${capability.endpoint} does not support aggregations in the audited registry.`;
  }

  for (let index = 0; index < value.length; index += 1) {
    const aggregation = value[index];
    if (!isRecord(aggregation)) {
      return `aggregations[${index}] must be an object.`;
    }

    if (aggregation.type !== 'count' && aggregation.type !== 'group_by') {
      return `aggregations[${index}].type must be "count" or "group_by".`;
    }

    if (aggregation.type === 'group_by') {
      if (typeof aggregation.column !== 'string' || !aggregation.column.trim()) {
        return `aggregations[${index}].column is required for group_by.`;
      }

      if (!capability.valid_aggregation_columns.includes(aggregation.column)) {
        return `Unsupported aggregation column for ${capability.endpoint}: ${aggregation.column}.`;
      }

      if (aggregation.agg !== 'count') {
        return `aggregations[${index}].agg must be "count".`;
      }

      const size = aggregation.size;
      if (size !== undefined) {
        if (typeof size !== 'number' || !Number.isInteger(size) || size < 1 || size > 1000) {
          return `aggregations[${index}].size must be an integer from 1 to 1000.`;
        }
      }
    }
  }

  return null;
}

function validateLimit(capability: CrustdataEndpointCapability, value: unknown) {
  if (value === undefined || !capability.limit) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 'limit must be an integer.';
  }
  if (value < capability.limit.min || value > capability.limit.max) {
    return `limit must be between ${capability.limit.min} and ${capability.limit.max} for ${capability.endpoint}.`;
  }
  return null;
}

function validateEndpointSpecificRules(capability: CrustdataEndpointCapability, params: Record<string, unknown>) {
  if ('filters' in params) {
    const issue = validateFilterTree(params.filters, capability);
    if (issue) return issue;
  }

  if ('fields' in params) {
    const issue = validateFieldList(capability, params.fields, 'fields');
    if (issue) return issue;
  }

  if ('field' in params) {
    const issue = validateFieldList(capability, params.field, 'field');
    if (issue) return issue;
  }

  if ('sorts' in params) {
    const issue = validateSorts(capability, params.sorts);
    if (issue) return issue;
  }

  if ('aggregations' in params) {
    const issue = validateAggregations(capability, params.aggregations);
    if (issue) return issue;
  }

  const limitIssue = validateLimit(capability, params.limit);
  if (limitIssue) return limitIssue;

  const richnessIssue = validateDataRichness(capability, params);
  if (richnessIssue) return richnessIssue;

  if (capability.endpoint === '/web/enrich/live') {
    const urls = asStringArray(params.urls);
    if (!urls) return 'urls must be an array of strings.';
    if (urls.length < 1 || urls.length > 10) return 'urls must contain between 1 and 10 URLs.';
    const invalidUrl = urls.find((url) => !/^https?:\/\//i.test(url));
    if (invalidUrl) return `URL must include http:// or https://: ${invalidUrl}.`;
  }

  if (capability.endpoint === '/person/enrich') {
    for (const param of capability.required_one_of ?? []) {
      const value = params[param];
      if (Array.isArray(value) && value.length > 25) {
        return `${param} accepts at most 25 values.`;
      }
    }
  }

  return null;
}

export function validateFeasibility(candidateSpec: CandidateForValidation): FeasibilityResult {
  const aiRejected = candidateSpec.feasible === false;
  if (aiRejected) {
    return {
      feasible: false,
      reason: `Reframer marked infeasible: ${
        candidateSpec.reason || candidateSpec.infeasibility_reason || 'no usable Crustdata endpoint fits this trend'
      }.`,
      mapped_endpoints: [],
    };
  }

  const unsupportedReason = unsupportedQuestionReason(candidateSpec);
  if (unsupportedReason) {
    return { feasible: false, reason: unsupportedReason, mapped_endpoints: [] };
  }

  const visualTemplateIssue = validateVisualTemplate(candidateSpec);
  if (visualTemplateIssue) {
    return { feasible: false, reason: visualTemplateIssue, mapped_endpoints: [] };
  }

  const endpoint = candidateSpec.crustdata_query?.endpoint;
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    return { feasible: false, reason: 'crustdata_query.endpoint is required.', mapped_endpoints: [] };
  }

  const normalizedEndpoint = normalizeCrustdataEndpoint(endpoint);
  const capability = getEndpointCapability(normalizedEndpoint);
  if (!capability) {
    return {
      feasible: false,
      reason: `Unknown Crustdata endpoint: ${normalizedEndpoint}.`,
      mapped_endpoints: [],
    };
  }

  if (capability.availability !== 'usable') {
    return {
      feasible: false,
      reason: `${normalizedEndpoint} is not enabled for this Newsroom run: ${
        capability.unavailable_reason || 'endpoint is unavailable in the audited registry'
      }.`,
      mapped_endpoints: [normalizedEndpoint],
    };
  }

  const intent = candidateSpec.crustdata_query?.intent;
  if (typeof intent !== 'string' || !intent.trim()) {
    return {
      feasible: false,
      reason: `crustdata_query.intent is required and must be one of: ${capability.supported_intents.join(', ')}.`,
      mapped_endpoints: [normalizedEndpoint],
    };
  }

  const normalizedIntent = inferSupportedIntent(capability, intent, isRecord(candidateSpec.crustdata_query?.params) ? candidateSpec.crustdata_query.params : {});
  if (!normalizedIntent) {
    return {
      feasible: false,
      reason: `Intent "${intent}" does not map to ${normalizedEndpoint}; supported intents are ${capability.supported_intents.join(
        ', '
      )}.`,
      mapped_endpoints: [normalizedEndpoint],
    };
  }

  const params = candidateSpec.crustdata_query?.params;
  if (!isRecord(params)) {
    return { feasible: false, reason: 'crustdata_query.params must be an object.', mapped_endpoints: [normalizedEndpoint] };
  }

  const paramNameIssue = validateParamNames(capability, params);
  if (paramNameIssue) {
    return { feasible: false, reason: paramNameIssue, mapped_endpoints: [normalizedEndpoint] };
  }

  const requiredIssue = validateRequiredParams(capability, params);
  if (requiredIssue) {
    return { feasible: false, reason: requiredIssue, mapped_endpoints: [normalizedEndpoint] };
  }

  const endpointSpecificIssue = validateEndpointSpecificRules(capability, params);
  if (endpointSpecificIssue) {
    return { feasible: false, reason: endpointSpecificIssue, mapped_endpoints: [normalizedEndpoint] };
  }

  return {
    feasible: true,
    reason:
      normalizedIntent === intent
        ? `Mapped to ${normalizedEndpoint} (${normalizedIntent}) in the audited Crustdata registry.`
        : `Mapped to ${normalizedEndpoint} (${normalizedIntent}) in the audited Crustdata registry; normalized verbose intent "${intent}".`,
    mapped_endpoints: [normalizedEndpoint],
  };
}

function numericValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function aggregationHasData(value: unknown) {
  if (!Array.isArray(value)) return false;

  return value.some((aggregation) => {
    if (!isRecord(aggregation)) return false;
    if (numericValue(aggregation.value) > 0) return true;
    if (!Array.isArray(aggregation.buckets)) return false;
    return aggregation.buckets.some((bucket) => isRecord(bucket) && numericValue(bucket.count) > 0);
  });
}

function matchEnvelopeHasData(value: unknown, dataKey: 'company_data' | 'person_data') {
  if (!Array.isArray(value)) return false;

  return value.some((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.matches)) return false;
    return entry.matches.some((match) => isRecord(match) && isRecord(match[dataKey]));
  });
}

export function hasCrustdataUsableData(endpoint: string, rawData: unknown) {
  const normalizedEndpoint = normalizeCrustdataEndpoint(endpoint);

  if (normalizedEndpoint === '/company/identify' || normalizedEndpoint === '/company/enrich') {
    return matchEnvelopeHasData(rawData, 'company_data');
  }

  if (normalizedEndpoint === '/person/enrich') {
    return matchEnvelopeHasData(rawData, 'person_data');
  }

  if (!isRecord(rawData)) {
    if (normalizedEndpoint === '/web/enrich/live' && Array.isArray(rawData)) {
      return rawData.some(
        (entry) =>
          isRecord(entry) &&
          entry.success === true &&
          (typeof entry.content === 'string' ? entry.content.trim().length > 0 : typeof entry.title === 'string')
      );
    }
    return false;
  }

  if (normalizedEndpoint === '/company/search') {
    return (
      (Array.isArray(rawData.companies) && rawData.companies.length > 0) ||
      numericValue(rawData.total_count) > 0
    );
  }

  if (normalizedEndpoint === '/person/search') {
    return (
      (Array.isArray(rawData.profiles) && rawData.profiles.length > 0) ||
      numericValue(rawData.total_count) > 0
    );
  }

  if (normalizedEndpoint === '/job/search') {
    return (
      (Array.isArray(rawData.job_listings) && rawData.job_listings.length > 0) ||
      numericValue(rawData.total_count) > 0 ||
      aggregationHasData(rawData.aggregations)
    );
  }

  if (normalizedEndpoint === '/company/search/autocomplete' || normalizedEndpoint === '/person/search/autocomplete') {
    return Array.isArray(rawData.suggestions) && rawData.suggestions.length > 0;
  }

  return true;
}

function noUsableDataMessage(endpoint: string) {
  return `Crustdata returned no usable data for ${endpoint}. The query was structurally valid, but it did not return enough rows or matches to build a trustworthy chart.`;
}

function artifactSafeId(value: string) {
  const safe = value.replace(/[^a-zA-Z0-9_-]/g, '_');
  return safe || 'candidate';
}

async function preflightCandidateData(runId: string, candidate: CandidateSpec): Promise<FeasibilityResult> {
  const endpoint = normalizeCrustdataEndpoint(candidate.crustdata_query.endpoint);

  try {
    const rawData = await callCrustdata(endpoint, candidate.crustdata_query.params);
    await writeRunArtifact(
      runId,
      `crustdata-preflight-${artifactSafeId(candidate.candidate_id)}.json`,
      JSON.stringify(rawData, null, 2)
    );

    if (!hasCrustdataUsableData(endpoint, rawData)) {
      return {
        feasible: false,
        reason: noUsableDataMessage(endpoint),
        mapped_endpoints: [endpoint],
      };
    }

    return {
      feasible: true,
      reason: `Crustdata preflight returned usable data for ${endpoint}.`,
      mapped_endpoints: [endpoint],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      feasible: false,
      reason: `Crustdata preflight failed for ${endpoint}: ${message}`,
      mapped_endpoints: [endpoint],
    };
  }
}

function getCandidateId(candidate: CandidateForValidation) {
  return typeof candidate.candidate_id === 'string' ? candidate.candidate_id : '';
}

function stripNonApiHelperParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([name]) => !NON_API_HELPER_PARAM_NAMES.has(name))
  );
}

function normalizeChartTypeOptions(candidate: CandidateForValidation): ChartTypeOption[] | undefined {
  const rawOptions = Array.isArray(candidate.chart_type_options) ? candidate.chart_type_options : [];
  const normalized = rawOptions
    .map((option) => {
      if (!isRecord(option)) return null;
      const rank = typeof option.rank === 'number' && Number.isInteger(option.rank) ? option.rank : 0;
      const visualTemplate = typeof option.visual_template === 'string' ? option.visual_template.trim() : '';
      const rationale = typeof option.rationale === 'string' ? option.rationale.trim() : '';
      const dataPreview = typeof option.data_preview === 'string' ? option.data_preview.trim() : '';
      const suitabilityScore =
        typeof option.suitability_score === 'number' && Number.isInteger(option.suitability_score)
          ? option.suitability_score
          : 0;

      if (rank < 1 || rank > 3 || !ALLOWED_VISUAL_TEMPLATES.has(visualTemplate)) return null;

      return {
        rank,
        visual_template: visualTemplate,
        rationale,
        data_preview: dataPreview,
        suitability_score: Math.min(10, Math.max(1, suitabilityScore || 1)),
      };
    })
    .filter((option): option is ChartTypeOption => Boolean(option))
    .sort((a, b) => a.rank - b.rank);

  if (normalized.length > 0) {
    return normalized;
  }

  const fallbackTemplate =
    candidate.visual_template?.trim() || candidate.matched_visual?.trim() || '';
  if (!ALLOWED_VISUAL_TEMPLATES.has(fallbackTemplate)) {
    return undefined;
  }

  return [
    {
      rank: 1,
      visual_template: fallbackTemplate,
      rationale: 'Newsroom selected this as the best available visual template for the candidate.',
      data_preview: 'Preview will be generated after data is finalized.',
      suitability_score: 8,
    },
  ];
}

function normalizeValidatedCandidate(
  candidate: CandidateForValidation,
  scoredById: Map<string, ScoredCandidate>
): CandidateSpec & CandidateForValidation {
  const candidateId = getCandidateId(candidate);
  const scoredCandidate = scoredById.get(candidateId);
  const rawEndpoint = candidate.crustdata_query?.endpoint || '';
  const endpoint = rawEndpoint.trim() ? normalizeCrustdataEndpoint(rawEndpoint) : '';
  const params = stripNonApiHelperParams(candidate.crustdata_query?.params || {});
  const capability = endpoint ? getEndpointCapability(endpoint) : undefined;
  const intent =
    capability && typeof candidate.crustdata_query?.intent === 'string'
      ? inferSupportedIntent(capability, candidate.crustdata_query.intent, params) || candidate.crustdata_query.intent
      : candidate.crustdata_query?.intent;
  const chartTypeOptions = normalizeChartTypeOptions(candidate);
  const topChartTemplate = chartTypeOptions?.[0]?.visual_template;

  const normalized: CandidateSpec & CandidateForValidation = {
    candidate_id: candidateId,
    feasible: candidate.feasible,
    reason: candidate.reason,
    infeasibility_reason: candidate.infeasibility_reason,
    headline: candidate.headline || 'Untitled idea',
    subhead: candidate.subhead || candidate.rationale || '',
    source: candidate.source || scoredCandidate?.source,
    source_url: candidate.source_url || scoredCandidate?.source_url,
    scores: candidate.scores || scoredCandidate?.scores,
    matched_archetype: candidate.matched_archetype || scoredCandidate?.matched_archetype,
    matched_angle: candidate.matched_angle || scoredCandidate?.matched_angle,
    matched_visual: candidate.matched_visual || scoredCandidate?.matched_visual,
    rationale: candidate.rationale,
    crustdata_query: {
      endpoint,
      intent,
      params,
    },
    visual_template:
      topChartTemplate ||
      candidate.visual_template ||
      candidate.matched_visual ||
      scoredCandidate?.matched_visual ||
      '',
    chart_type_options: chartTypeOptions,
    expected_data_shape: candidate.expected_data_shape,
  };

  return normalized;
}

async function logFeasibilityDecision(
  runId: string,
  candidate: CandidateForValidation,
  decision: FeasibilityResult
) {
  const proposedEndpoint =
    typeof candidate.crustdata_query?.endpoint === 'string' && candidate.crustdata_query.endpoint.trim()
      ? normalizeCrustdataEndpoint(candidate.crustdata_query.endpoint)
      : '';

  const entry = {
    candidate_id: getCandidateId(candidate) || 'unknown',
    proposed_endpoint: proposedEndpoint,
    feasibility: decision.feasible ? 'feasible' : 'infeasible',
    reason: decision.reason,
    mapped_endpoints: decision.mapped_endpoints,
  };

  await appendRunArtifact(runId, FEASIBILITY_LOG_FILENAME, `${JSON.stringify(entry)}\n`);
  return entry;
}

async function writeStage4cDiagnostics(runId: string, result: FooterOverlayResult) {
  const debugDir = path.join(getRunDir(runId), 'debug');
  await fs.mkdir(debugDir, { recursive: true });
  await fs.writeFile(
    path.join(debugDir, 'stage_4c_footer_overlay.json'),
    JSON.stringify(result, null, 2),
    'utf8'
  );
}

async function encodeRawImageAsPng(buffer: Buffer, outputFormat: string) {
  if (outputFormat === 'png') {
    return buffer;
  }

  const sharp = (await import('sharp')).default;
  return sharp(buffer, { failOn: 'none' }).png().toBuffer();
}

async function overlayFooterForRun(runId: string, rawImagePath: string, outputImagePath: string, exportSize?: string) {
  const startedAt = Date.now();

  try {
    const result = await applyFooterOverlay(rawImagePath, outputImagePath, { exportSize });
    const durationMs = Date.now() - startedAt;

    await writeStage4cDiagnostics(runId, result);
    logStageUsage('stage_4c_footer_overlay', runId, {
      durationMs,
      footerSource: result.footerSource,
      success: result.success,
    });

    return { result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logStageUsage('stage_4c_footer_overlay', runId, {
      durationMs,
      success: false,
    });
    throw error;
  }
}

async function createPostImageArtifact(
  runId: string,
  data: GeneratedPostData,
  template: string
) {
  const prompt = await buildImagePrompt(data, template, runId);

  if (isOpenAiImageConfigured()) {
    const image = await generateOpenAiImage(prompt, { template });
    const rawBuffer = await encodeRawImageAsPng(image.buffer, image.outputFormat);
    const rawImagePath = await writeRunBinaryArtifact(runId, 'post_raw.png', rawBuffer);
    const filename = 'post.png';
    const imagePath = path.join(getRunDir(runId), filename);
    const { result: footerOverlay } = await overlayFooterForRun(
      runId,
      rawImagePath,
      imagePath,
      image.exportSize
    );
    const finalImage = await fs.readFile(imagePath);

    if (image.revisedPrompt) {
      await writeRunArtifact(runId, 'openai-revised-image-prompt.txt', image.revisedPrompt);
    }
    logStageUsage('stage_4_image', runId, { model: image.model });
    await appendRunArtifact(
      runId,
      FEASIBILITY_LOG_FILENAME,
      `${JSON.stringify({
        event: 'stage_4_image',
        run_id: runId,
        timestamp: now(),
        model: image.model,
        size: image.size,
        output_format: image.outputFormat,
        raw_filename: 'post_raw.png',
        final_filename: filename,
      })}\n`
    );

    return {
      imagePath,
      filename,
      mimeType: 'image/png',
      model: image.model,
      dataUrl: `data:image/png;base64,${finalImage.toString('base64')}`,
      logMessage: image.isLandscape
        ? `Generated landscape image with OpenAI ${image.model} at ${image.size}; Stage 4c applied footer from ${footerOverlay.footerSource}.`
        : `Generated image with OpenAI ${image.model} at ${image.size}, exported ${image.exportSize}, and applied Stage 4c footer from ${footerOverlay.footerSource}.`,
    };
  }

  const svg = renderPostSvg(data, template);
  const rawSvgBuffer = Buffer.from(svg, 'utf8');
  const sharp = (await import('sharp')).default;
  const rawImagePath = await writeRunBinaryArtifact(runId, 'post_raw.png', await sharp(rawSvgBuffer).png().toBuffer());
  const filename = 'post.png';
  const imagePath = path.join(getRunDir(runId), filename);
  const { result: footerOverlay } = await overlayFooterForRun(runId, rawImagePath, imagePath);
  const finalImage = await fs.readFile(imagePath);
  logStageUsage('stage_4_image', runId, { model: 'local-svg-fallback' });
  await appendRunArtifact(
    runId,
    FEASIBILITY_LOG_FILENAME,
    `${JSON.stringify({
      event: 'stage_4_image',
      run_id: runId,
      timestamp: now(),
      model: 'local-svg-fallback',
      size: 'local-svg',
      output_format: 'png',
      raw_filename: 'post_raw.png',
      final_filename: filename,
    })}\n`
  );
  return {
    imagePath,
    filename,
    mimeType: 'image/png',
    model: 'local-svg-fallback',
    dataUrl: `data:image/png;base64,${finalImage.toString('base64')}`,
    logMessage: `Rendered local SVG fallback because OPENAI_API_KEY is not configured; Stage 4c applied footer from ${footerOverlay.footerSource}.`,
  };
}

async function readRuntimeKnowledge(requiredFiles: RuntimeKnowledgeFile[]) {
  const entries = await Promise.all(
    requiredFiles.map(async (file) => [file, await readMarkdown(file)] as const)
  );
  const knowledge = Object.fromEntries(entries) as RuntimeKnowledge;

  for (const file of requiredFiles) {
    if (!knowledge[file]?.trim()) {
      throw new Error(
        `${file}/${file}.md is empty. Add the ${file === 'base' ? 'editorial DNA' : 'visual spec'} before running the pipeline.`
      );
    }
  }

  return knowledge;
}

function cachedRuntimeSystem(
  knowledge: RuntimeKnowledge,
  requiredFiles: RuntimeKnowledgeFile[],
  stageInstruction: string
): AnthropicTextBlock[] {
  const blocks: AnthropicTextBlock[] = [
    {
      type: 'text',
      text: STATIC_PROJECT_CONTEXT,
    },
  ];
  if (requiredFiles.includes('base')) {
    const block: AnthropicTextBlock = {
      type: 'text',
      text: knowledge.base || '',
      cache_control: { type: 'ephemeral' },
    };

    blocks.push(block);
  }

  if (requiredFiles.includes('design')) {
    const block: AnthropicTextBlock = {
      type: 'text',
      text: knowledge.design || '',
      cache_control: { type: 'ephemeral' },
    };

    blocks.push(block);
  }

  blocks.push({
    type: 'text',
    text: stageInstruction,
  });

  return blocks;
}

async function callLoggedAnthropic(
  stage: string,
  runId: string,
  prompt: string,
  options?: AnthropicCallOptions
) {
  const { text, response } = await callAnthropicWithResponse(prompt, options);
  logSonnetUsage(stage, runId, response);
  return text;
}

async function callLoggedAnthropicFull(
  stage: string,
  runId: string,
  prompt: string,
  options?: AnthropicCallOptions
) {
  const { text, response } = await callAnthropicWithResponse(prompt, options);
  logSonnetUsage(stage, runId, response);
  return { text, response };
}

function requireRun(run: RunState | null): RunState {
  if (!run) {
    throw new Error('Run not found.');
  }

  return run;
}

export interface CreateRunOptions {
  /**
   * Optional steering text submitted from the Dashboard chat-box. Trimmed
   * server-side. When empty/undefined the run uses the unsteered base.md flow.
   * Never pass whitespace-only — callers should strip first.
   */
  steeringInput?: string;
  /**
   * When the client/API truncated `steeringInput` from a longer paste, set
   * this to the pre-truncation character count so Stage 1 can disclose it in
   * the uncached system instruction block (base.md caching unchanged).
   */
  steeringInputTruncatedFromChars?: number;
}

export async function createRun(options: CreateRunOptions = {}) {
  const timestamp = now();
  const steeringInput = options.steeringInput?.trim();
  const truncatedFrom = options.steeringInputTruncatedFromChars;
  const hasTruncationMeta =
    typeof truncatedFrom === 'number' &&
    Number.isFinite(truncatedFrom) &&
    truncatedFrom > MAX_STEERING_INPUT_CHARS &&
    Boolean(steeringInput);

  let logMessage = 'Run created.';
  if (steeringInput) {
    logMessage = hasTruncationMeta
      ? `Run created with steering input (truncated from ${truncatedFrom} to ${MAX_STEERING_INPUT_CHARS} chars): "${steeringInput}".`
      : `Run created with steering input: "${steeringInput}".`;
  }

  const run: RunState = {
    run_id: randomUUID(),
    created_at: timestamp,
    updated_at: timestamp,
    status: 'created',
    logs: [{ at: timestamp, message: logMessage }],
    candidates: [],
    generation_steps: defaultSteps(),
    ...(steeringInput ? { steering_input: steeringInput } : {}),
    ...(hasTruncationMeta ? { steering_input_truncated_from_chars: truncatedFrom } : {}),
  };

  return writeRun(run);
}

export async function discoverCandidates(runId: string) {
  let run = requireRun(await readRun(runId));

  try {
    run = await writeRun({ ...run, status: 'discovering', error: undefined });
    run = await appendLog(run, 'Reading editorial base.');

    const baseKnowledge = await readRuntimeKnowledge(['base']);
    const steeringInput = run.steering_input?.trim() || undefined;

    if (steeringInput) {
      run = await appendLog(run, `Stage 1 steered by user input: "${steeringInput}".`);
    } else {
      run = await appendLog(run, 'Stage 1 unsteered — defaulting to general trending discovery.');
    }

    const recentSteeringHistory = await getRecentSteeringHistory(5, {
      includeCompletedUnsavedRuns: true,
      excludeRunId: runId,
    });
    if (recentSteeringHistory.length) {
      const summary = recentSteeringHistory
        .map((entry) => entry.steering ?? '(blank)')
        .join(' | ');
      run = await appendLog(
        run,
        `Recent steerings (newest -> oldest): ${summary}.`,
      );
    }

    const truncatedFrom = run.steering_input_truncated_from_chars;
    const truncationSystemNote =
      typeof truncatedFrom === 'number' &&
      Number.isFinite(truncatedFrom) &&
      truncatedFrom > MAX_STEERING_INPUT_CHARS
        ? `Note: user's steering input was truncated from ${truncatedFrom} to ${MAX_STEERING_INPUT_CHARS} characters.\n\n`
        : '';

    if (truncationSystemNote) {
      run = await appendLog(
        run,
        `Steering input was truncated from ${truncatedFrom} to ${MAX_STEERING_INPUT_CHARS} characters before Stage 1.`,
      );
    }

    const stage1Instruction = `${truncationSystemNote}${
      steeringInput
        ? "You are Stage 1 of Newsroom for Crustdata: create a steered trend-discovery prompt for Grok/X. The user's steering input is the PRIMARY signal; base.md is the secondary editorial constraint."
        : 'You are Stage 1 of Newsroom for Crustdata: create a general trend-discovery prompt for Grok/X.'
    }

${buildRecentSteeringsBlock(recentSteeringHistory)}`;

    run = await appendLog(run, 'Asking Claude to construct a Grok trend discovery query.');
    const stage1Response = await callLoggedAnthropicFull(
      'stage_1_discovery',
      runId,
      buildStage1QueryPrompt(steeringInput),
      {
        system: cachedRuntimeSystem(baseKnowledge, ['base'], stage1Instruction),
        tools: grokQueryTool(),
        toolChoice: { type: 'tool', name: GROK_QUERY_TOOL_NAME },
      }
    );

    const stage1ToolInput = await getRequiredToolInput<Stage1QueryToolInput>(
      'stage_1_discovery',
      runId,
      stage1Response.response,
      GROK_QUERY_TOOL_NAME
    );

    const rawGrokQuery = typeof stage1ToolInput.grok_query === 'string' ? stage1ToolInput.grok_query.trim() : '';
    if (!rawGrokQuery) {
      throw new Error('Stage 1 returned an empty grok_query.');
    }
    const grokQuery = rawGrokQuery;
    const steeringAcknowledged =
      typeof stage1ToolInput.steering_acknowledged === 'string' && stage1ToolInput.steering_acknowledged.trim()
        ? stage1ToolInput.steering_acknowledged.trim()
        : steeringInput
          ? `Steered toward: ${steeringInput}.`
          : 'No steering input — defaulted to general trending discovery.';
    const timeWindowDays = clampTimeWindowDays(stage1ToolInput.time_window_days);

    run = await writeRun({
      ...run,
      steering_acknowledged: steeringAcknowledged,
      steering_time_window_days: timeWindowDays,
    });
    run = await appendLog(
      run,
      `Stage 1 acknowledged steering: ${steeringAcknowledged} (time window: last ${timeWindowDays} day(s)).`
    );

    const steeringClause = steeringInput
      ? `User steering for this run: ${steeringInput}\nFavor candidates that align tightly with this steering. Quality and feasibility still matter most.\n\n`
      : '';

    const grokCandidatePrompt = `Use this search intent to identify and rank the best ${MAX_DISCOVERY_CANDIDATES} current tech/startup trend candidates suitable for Crustdata data posts:

${grokQuery}

${steeringClause}Recency window: focus on conversations from the last ${timeWindowDays} day(s).

Return only the strongest ${MAX_DISCOVERY_CANDIDATES} ideas according to your judgment. Rank them from strongest to weakest before returning them. Favor trends that can become:
- rankings or counts across companies,
- hiring/job-posting aggregations,
- founder/alumni/person-search analyses,
- known-company comparisons.

Prefer candidates with clear recency, concrete entities, public conversation momentum, and a high chance of becoming a Crustdata-backed chart.
Do not include candidates that require sentiment, comments, professional-network live endpoints, /web/search/live, or unknown data sources.

Return JSON with this exact shape:
{
  "candidates": [
    {
      "id": "c_01",
      "text": "trend text",
      "source_url": "https://...",
      "engagement": { "likes": 0, "reposts": 0, "replies": 0 },
      "entities": ["company or topic"]
    }
  ]
}`;

    run = await appendLog(run, 'Querying Grok for candidate trends.');
    let grokResponse = '';
    let rawCandidates: DiscoveryCandidatesResponse | undefined;
    let discoverySource = 'Grok';
    try {
      grokResponse = await callGrok(grokCandidatePrompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      run = await appendLog(run, `Grok discovery failed (${message}). Falling back to Claude candidate generation.`);
      discoverySource = 'Claude fallback';
      const fallbackSteeringClause = steeringInput
        ? `\nUSER STEERING INPUT for this run:\n${steeringInput}\n\nCenter the fallback candidates on this steering input while still respecting base.md archetypes. Do not drift into general trending if the steering is clear.\n`
        : '';

      const fallbackResponse = await callLoggedAnthropicFull(
        'stage_1_discovery_fallback',
        runId,
        `Grok could not return candidates, so generate ${MAX_DISCOVERY_CANDIDATES} Crustdata-ready fallback candidates yourself.

Use the same search intent and constraints:
${grokQuery}
${fallbackSteeringClause}
Recency window: focus on conversations and signals from the last ${timeWindowDays} day(s).

The candidates do not need live engagement numbers, but they must be plausible, API-backed, and broad enough for Crustdata data posts.
Use only these endpoint-backed shapes:
- /job/search hiring demand, job counts, and group_by aggregations.
- /company/search company cohorts, funding, headcount, geography, taxonomy, followers, and rankings.
- /company/enrich known-company profile comparisons.
- /person/search founder, alumni, employer, title, role, skills, education, and location patterns.

Do not include ideas requiring sentiment, comments, /web/search/live, professional-network live endpoints, or unknown APIs.
Submit the candidates through the submit_discovery_candidates tool.`,
        {
          system: cachedRuntimeSystem(
            baseKnowledge,
            ['base'],
            steeringInput
              ? "You are Stage 1 fallback for Newsroom: produce conservative Crustdata API-ready candidate ideas centered on the user's steering input when Grok is unavailable."
              : 'You are Stage 1 fallback for Newsroom: produce conservative Crustdata API-ready candidate ideas when Grok is unavailable.'
          ),
          tools: discoveryCandidatesTool(),
          toolChoice: { type: 'tool', name: DISCOVERY_CANDIDATES_TOOL_NAME },
        }
      );
      rawCandidates = await getRequiredToolInput<DiscoveryCandidatesResponse>(
        'stage_1_discovery_fallback',
        runId,
        fallbackResponse.response,
        DISCOVERY_CANDIDATES_TOOL_NAME
      );
    }

    if (!rawCandidates) {
      rawCandidates = await extractJsonObjectWithDiagnostics<DiscoveryCandidatesResponse>(
        'stage_1_grok_candidates',
        runId,
        grokResponse
      );
    }
    const rawCandidateList = Array.isArray(rawCandidates.candidates)
      ? rawCandidates.candidates.slice(0, MAX_DISCOVERY_CANDIDATES)
      : [];
    run = await appendLog(run, `${discoverySource} returned ${rawCandidateList.length} candidate trends.`);

    if (rawCandidateList.length === 0) {
      return noMatches(run, 'No current trends matched the editorial base. Try finding new ideas again.');
    }

    run = await appendLog(run, 'Scoring candidates and checking API feasibility.');
    const scoredResponse = await callLoggedAnthropicFull(
      'stage_2_score',
      runId,
      buildScoreCandidatesPrompt(rawCandidateList, formatEndpointCapabilitiesForPrompt(), {
        steeringInput,
      }),
      {
        system: cachedRuntimeSystem(
          baseKnowledge,
          ['base'],
          'You are Stage 2 pass 1 of Newsroom: score all trend candidates and decide initial Crustdata feasibility. Treat any steering input in the user message as a soft preference only — never as a hard filter or rubric override.'
        ),
        maxTokens: 4096,
        tools: scoreCandidatesTool(),
        toolChoice: { type: 'tool', name: SCORE_CANDIDATES_TOOL_NAME },
      }
    );

    const scored = await getRequiredToolInput<ScoreCandidatesResponse>(
      'stage_2_score',
      runId,
      scoredResponse.response,
      SCORE_CANDIDATES_TOOL_NAME
    );
    const scoredCandidates = (Array.isArray(scored.scored_candidates) ? scored.scored_candidates : []).filter(
      isScoredCandidate
    );

    if (!scoredCandidates.length) {
      return noMatches(run, 'No candidates could be scored. Try finding new ideas again.');
    }

    const topScoredCandidates = scoredCandidates
      .filter((candidate) => candidate.feasible)
      .sort((a, b) => scoreTotal(b) - scoreTotal(a))
      .slice(0, 3);

    if (!topScoredCandidates.length) {
      return noMatches(run, 'No candidates passed the Stage 2 API feasibility screen. Try finding new ideas again.');
    }

    const scoredById = new Map(scoredCandidates.map((candidate) => [candidate.candidate_id, candidate]));
    run = await appendLog(run, 'Reading visual design spec for reframing.');
    const reframeKnowledge = {
      ...baseKnowledge,
      ...(await readRuntimeKnowledge(['design'])),
    };
    const recentVisualTemplates = await getRecentTemplates(5);
    if (recentVisualTemplates.length) {
      run = await appendLog(
        run,
        `Recent visual_template usage (oldest -> newest): ${recentVisualTemplates.join(', ')}.`
      );
    }
    run = await appendLog(run, `Reframing top ${topScoredCandidates.length} feasible candidate(s).`);
    const reframeResponse = await callLoggedAnthropicFull(
      'stage_2_reframe',
      runId,
      buildReframeCandidatesPrompt(topScoredCandidates, formatEndpointCapabilitiesForPrompt(), {
        recentVisualTemplates,
        steeringInput,
      }),
      {
        system: cachedRuntimeSystem(
          reframeKnowledge,
          ['base', 'design'],
          `You are Stage 2 pass 2 of Newsroom: fully reframe only the supplied feasible candidates into deterministic Crustdata query specs. Only use these currently usable endpoints:\n${formatUsableEndpoints()}\n\n${STAGE_2_DIVERSITY_RULE}\n\nIf the user message contains a steering input, treat it as a soft tie-break preference only — the diversity rule and feasibility rules above always take precedence.`
        ),
        maxTokens: 4096,
        tools: reframeCandidatesTool(),
        toolChoice: { type: 'tool', name: REFRAME_CANDIDATES_TOOL_NAME },
      }
    );

    const reframed = await getRequiredToolInput<ReframeCandidatesResponse>(
      'stage_2_reframe',
      runId,
      reframeResponse.response,
      REFRAME_CANDIDATES_TOOL_NAME
    );
    const reframedCandidates = (Array.isArray(reframed.candidates) ? reframed.candidates : []).filter(
      isReframedCandidate
    );
    const diversityCheck = reframed.template_diversity_check;
    const reframedCandidateIds = new Set(reframedCandidates.map(getCandidateId).filter(Boolean));
    const validationCandidates: CandidateForValidation[] = [
      ...reframedCandidates,
      ...topScoredCandidates
        .filter((candidate) => !reframedCandidateIds.has(candidate.candidate_id))
        .map((candidate) => ({
          ...candidate,
          feasible: false,
          reason: 'Stage 2 reframe did not return a full query spec for this candidate.',
          crustdata_query: { endpoint: '', params: {} },
        })),
    ];
    const validationLogs: RunState['logs'] = [];
    const feasibleCandidates: CandidateSpec[] = [];

    for (const candidate of validationCandidates) {
      const normalizedCandidate = normalizeValidatedCandidate(candidate, scoredById);
      const decision = validateFeasibility(normalizedCandidate);
      const logEntry = await logFeasibilityDecision(runId, normalizedCandidate, decision);

      validationLogs.push({
        at: now(),
        message: `Feasibility ${logEntry.feasibility}: ${logEntry.candidate_id} - ${logEntry.reason}`,
      });

      if (decision.feasible) {
        if (!SHOULD_PREFLIGHT_CRUSTDATA) {
          feasibleCandidates.push(normalizedCandidate);
          continue;
        }

        const preflightDecision = await preflightCandidateData(runId, normalizedCandidate);
        const preflightLogEntry = await logFeasibilityDecision(runId, normalizedCandidate, preflightDecision);
        validationLogs.push({
          at: now(),
          message: `Data preflight ${preflightLogEntry.feasibility}: ${preflightLogEntry.candidate_id} - ${preflightLogEntry.reason}`,
        });

        if (preflightDecision.feasible) {
          feasibleCandidates.push(normalizedCandidate);
        }
      }
    }

    const topCandidates = feasibleCandidates.sort((a, b) => scoreTotal(b) - scoreTotal(a)).slice(0, 3);

    if (!topCandidates.length) {
      run = { ...run, logs: [...run.logs, ...validationLogs] };
      return noMatches(run, 'No candidates passed the Crustdata feasibility validator. Try finding new ideas again.');
    }

    const distinctTemplatesActual = new Set(
      topCandidates.map((candidate) => candidate.visual_template?.trim()).filter((value): value is string => Boolean(value))
    ).size;
    const reportedDistinct =
      typeof diversityCheck?.distinct_templates_in_top_3 === 'number'
        ? diversityCheck.distinct_templates_in_top_3
        : distinctTemplatesActual;
    const diversityWarning = buildDiversityWarning(distinctTemplatesActual);
    const templateDiversity: RunState['template_diversity'] = {
      distinct_templates_in_top_3: distinctTemplatesActual,
      recent_templates_avoided: Array.isArray(diversityCheck?.recent_templates_avoided)
        ? diversityCheck.recent_templates_avoided.filter((value): value is string => typeof value === 'string')
        : [],
      diversity_rationale:
        typeof diversityCheck?.diversity_rationale === 'string'
          ? diversityCheck.diversity_rationale
          : '',
      ...(diversityWarning ? { warning: diversityWarning } : {}),
    };
    const diversityLogs: RunState['logs'] = [];
    if (reportedDistinct !== distinctTemplatesActual) {
      diversityLogs.push({
        at: now(),
        message: `Stage 2 diversity self-check mismatch: model reported ${reportedDistinct} distinct templates, actual is ${distinctTemplatesActual}.`,
      });
    }
    if (diversityWarning) {
      diversityLogs.push({
        at: now(),
        message: `Stage 2 diversity warning (soft, non-blocking): ${diversityWarning} Distinct templates in top 3 = ${distinctTemplatesActual}.`,
      });
    } else if (templateDiversity.diversity_rationale) {
      diversityLogs.push({
        at: now(),
        message: `Stage 2 diversity OK (${distinctTemplatesActual} distinct templates): ${templateDiversity.diversity_rationale}`,
      });
    }

    const topSpecsArtifact = {
      run_id: runId,
      generated_at: now(),
      steering_input: steeringInput ?? null,
      steering_input_truncated_from_chars: run.steering_input_truncated_from_chars ?? null,
      steering_acknowledged: steeringAcknowledged,
      steering_time_window_days: timeWindowDays,
      recent_visual_templates: recentVisualTemplates,
      template_diversity_check: {
        distinct_templates_in_top_3: distinctTemplatesActual,
        reported_distinct_templates_in_top_3: reportedDistinct,
        recent_templates_avoided: templateDiversity.recent_templates_avoided ?? [],
        diversity_rationale: templateDiversity.diversity_rationale,
        warning: templateDiversity.warning,
      },
      candidates: topCandidates.map((candidate) => ({
        candidate_id: candidate.candidate_id,
        headline: candidate.headline,
        subhead: candidate.subhead,
        visual_template: candidate.visual_template,
        chart_type_options: candidate.chart_type_options,
        matched_archetype: candidate.matched_archetype,
        matched_angle: candidate.matched_angle,
        crustdata_query: candidate.crustdata_query,
        scores: candidate.scores,
        rationale: candidate.rationale,
        expected_data_shape: candidate.expected_data_shape,
        source: candidate.source,
        source_url: candidate.source_url,
      })),
    };
    await writeRunArtifact(runId, 'top_3_specs.json', JSON.stringify(topSpecsArtifact, null, 2));

    return writeRun({
      ...run,
      status: 'awaiting_selection',
      candidates: topCandidates,
      template_diversity: templateDiversity,
      logs: [
        ...run.logs,
        ...validationLogs,
        ...diversityLogs,
        { at: now(), message: `Candidate judging complete. ${topCandidates.length} feasible candidate(s) ready.` },
      ],
    });
  } catch (error) {
    return failRun(run, error);
  }
}

export async function selectCandidate(runId: string, candidateId: string) {
  const run = requireRun(await readRun(runId));
  const selected = run.candidates.find((candidate) => candidate.candidate_id === candidateId);

  if (!selected) {
    throw new Error('Selected candidate was not found on this run.');
  }

  return writeRun({
    ...run,
    status: 'generating',
    selected_candidate_id: candidateId,
    selected_candidate: selected,
    selected_chart_template: undefined,
    selected_chart_rationale: undefined,
    generation_steps: defaultSteps(),
    logs: [...run.logs, { at: now(), message: `Selected candidate: ${selected.headline}` }],
  });
}

function findChartTypeOption(run: RunState, template: string) {
  const normalizedTemplate = template.trim();
  return run.selected_candidate?.chart_type_options?.find(
    (option) => option.visual_template === normalizedTemplate
  );
}

export async function selectChartType(runId: string, selectedTemplate: string) {
  const run = requireRun(await readRun(runId));
  const template = selectedTemplate.trim();

  if (!template) {
    throw new Error('selected_template is required.');
  }

  if (!ALLOWED_VISUAL_TEMPLATES.has(template)) {
    throw new Error(`Unsupported chart template: ${template}.`);
  }

  const option = findChartTypeOption(run, template);
  const knownOptions = run.selected_candidate?.chart_type_options ?? [];
  if (knownOptions.length > 0 && !option) {
    throw new Error('Selected chart template was not found on this run.');
  }

  return writeRun({
    ...run,
    status: 'generating',
    selected_chart_template: template,
    selected_chart_rationale: option?.rationale || '',
    generation_steps: run.generation_steps.map((step) =>
      step.id === 'awaiting_chart_type_selection'
        ? { ...step, status: 'done', microStatus: undefined }
        : step
    ),
    logs: [
      ...run.logs,
      { at: now(), message: `Selected chart type: ${template}${option?.rationale ? ` - ${option.rationale}` : ''}` },
    ],
  });
}

function updateStep(run: RunState, id: GenerationStep['id'], status: GenerationStep['status'], microStatus?: string) {
  return {
    ...run,
    generation_steps: run.generation_steps.map((step) =>
      step.id === id ? { ...step, status, microStatus } : step
    ),
  };
}

export async function generatePost(runId: string) {
  let run = requireRun(await readRun(runId));

  try {
    if (!run.selected_candidate) {
      throw new Error('No selected candidate to generate from.');
    }
    let selectedCandidate = run.selected_candidate;

    if (!run.data || !run.caption) {
      run = await writeRun({ ...run, status: 'generating', error: undefined });
      const candidatePool = [
        selectedCandidate,
        ...run.candidates.filter((candidate) => candidate.candidate_id !== selectedCandidate.candidate_id),
      ];
      const failedCandidateMessages: string[] = [];
      let rawData: unknown | undefined;

      for (const [index, candidate] of candidatePool.entries()) {
        const endpoint = normalizeCrustdataEndpoint(candidate.crustdata_query.endpoint);
        const isFallbackCandidate = index > 0;
        const candidateLabel = candidate.headline || candidate.candidate_id;

        if (!isUsableCrustdataEndpoint(endpoint)) {
          failedCandidateMessages.push(`${candidateLabel}: Crustdata endpoint ${endpoint} has not been verified for this API key.`);
          continue;
        }

        if (isFallbackCandidate) {
          run = await appendLog(
            run,
            `Selected idea returned no usable data. Trying backup candidate: ${candidateLabel}.`
          );
        }

        selectedCandidate = candidate;
        run = await writeRun({
          ...run,
          selected_candidate_id: candidate.candidate_id,
          selected_candidate: candidate,
          selected_chart_template: isFallbackCandidate ? undefined : run.selected_chart_template,
          selected_chart_rationale: isFallbackCandidate ? undefined : run.selected_chart_rationale,
          data: undefined,
          caption: undefined,
        });
        run = await writeRun(
          updateStep(
            run,
            'fetching_data',
            'running',
            isFallbackCandidate ? `Trying backup idea: ${candidateLabel}.` : 'Calling Crustdata API.'
          )
        );

        try {
          const candidateRawData = await callCrustdata(endpoint, candidate.crustdata_query.params);
          await writeRunArtifact(
            runId,
            `crustdata-response-${artifactSafeId(candidate.candidate_id)}.json`,
            JSON.stringify(candidateRawData, null, 2)
          );

          if (hasCrustdataUsableData(endpoint, candidateRawData)) {
            rawData = candidateRawData;
            await writeRunArtifact(runId, 'crustdata-response.json', JSON.stringify(candidateRawData, null, 2));
            break;
          }

          const message = noUsableDataMessage(endpoint);
          failedCandidateMessages.push(`${candidateLabel}: ${message}`);
          run = await appendLog(run, `No usable Crustdata data for ${candidateLabel}: ${message}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failedCandidateMessages.push(`${candidateLabel}: ${message}`);
          run = await appendLog(run, `Crustdata fetch failed for ${candidateLabel}: ${message}`);
        }
      }

      if (rawData === undefined) {
        const summary = failedCandidateMessages.slice(0, 3).join(' ');
        throw new Error(
          `Crustdata returned no usable data for any surfaced candidate.${summary ? ` ${summary}` : ''}`
        );
      }

      run = await writeRun(updateStep(run, 'fetching_data', 'done'));
      run = await writeRun(updateStep(run, 'finalizing_data', 'running', 'Asking Claude to normalize chart data.'));

      const baseKnowledge = await readRuntimeKnowledge(['base']);
      const shapedResponse = await callLoggedAnthropicFull('stage_5_caption', runId, `Selected candidate:
${JSON.stringify(selectedCandidate, null, 2)}

Chart type options from Stage 2:
${JSON.stringify(selectedCandidate.chart_type_options ?? [], null, 2)}

Raw Crustdata response:
${JSON.stringify(rawData, null, 2)}

Normalize the raw response into chart-ready post data and write the social caption.

Requirements:
- Use only data that is present in the raw Crustdata response.
- If the original candidate cannot be supported exactly, adjust the title, subtitle, chart data, and caption to what the returned data actually supports.
- Shape the chart data for the rank-1 recommended visual_template for now. The user may choose one of the other chart_type_options before image generation, so keep the normalized data compact and compatible with the stated options when possible.
  - ranked_horizontal_bar, ranked_horizontal_bar_with_icons, vertical_bar_comparison, diverging_horizontal_bar: use rows[{label,value,color?}]. Sort ranked rows descending; keep signed values for diverging rows.
  - single_line_timeseries and annotated_line_timeseries: use points[{date,value}] and optional annotations[{date,label,sublabel?}].
  - single_line_timeseries_with_annotations: use points[{date,value}] plus annotations[{date,label,sublabel?}].
  - multi_line_timeseries: use entities[{entity,brand_color_hex?,points[{date,value}]}].
  - stacked_horizontal_bar and donut_chart: use segments[{label,value,count?,percent?,color?}] plus total_annotation or donut_hole_total/donut_hole_label as appropriate.
  - slope_chart: use entities[{entity,brand_color_hex?,start_value,end_value}] plus start_time_label and end_time_label.
  - scatter_plot: use entities[{entity,brand_color_hex?,x,y}] plus x_axis_label and y_axis_label.
- For ratio/efficiency/per-X questions, compute the derived ratio from the raw metrics before writing chart data. The chart data must include the computed ratios as the primary values, not just the raw numerator and denominator.
- Include a compact rows summary when it is natural, but do not collapse multi-line, slope, scatter, or segment data into rows only.
- Keep all numeric series compact and directly renderable by the selected visual template.
- Use "Data from: Crustdata" as the footer unless the runtime knowledge requires a more specific Crustdata attribution.
- Write a 2-3 sentence caption in Crustdata's voice with a clear hook and the key data takeaway.
- Submit the result through the submit_generated_post tool.`, {
        system: cachedRuntimeSystem(
          baseKnowledge,
          ['base'],
          'You are Stage 5 of Newsroom: normalize Crustdata API output into chart-ready post data and a caption.'
        ),
        maxTokens: 2048,
        temperature: 0.1,
        tools: generatedPostTool('Submit chart-ready post data and the caption for the selected Crustdata candidate.'),
        toolChoice: { type: 'tool', name: GENERATED_POST_TOOL_NAME },
      });

      const shaped = await getGeneratedPostToolInput(
        'stage_5_caption',
        runId,
        shapedResponse.response
      );

      await writeRunArtifact(runId, 'data.json', JSON.stringify(shaped.data, null, 2));
      run = await writeRun({ ...updateStep(run, 'finalizing_data', 'done'), data: shaped.data, caption: shaped.caption });
    }

    if (!run.selected_chart_template) {
      run = await writeRun(
        updateStep(
          run,
          'awaiting_chart_type_selection',
          'running',
          'Pick a chart type to continue.'
        )
      );
      return writeRun({
        ...run,
        status: 'awaiting_chart_type_selection',
        logs: [...run.logs, { at: now(), message: 'Data finalized. Awaiting chart-type selection.' }],
      });
    }

    const selectedTemplate =
      run.selected_chart_template ||
      selectedCandidate.visual_template ||
      selectedCandidate.matched_visual ||
      '';
    if (!run.data) {
      throw new Error('No chart-ready data exists for image generation.');
    }
    const chartData = run.data;

    run = await writeRun({ ...run, status: 'generating', error: undefined });
    run = await writeRun(updateStep(run, 'awaiting_chart_type_selection', 'done'));
    run = await writeRun(updateStep(run, 'generating_image', 'running', 'Generating the post image.'));

    const imageArtifact = await createPostImageArtifact(
      runId,
      chartData,
      selectedTemplate
    );

    return writeRun({
      ...updateStep(run, 'generating_image', 'done'),
      status: 'ready',
      image_path: imageArtifact.imagePath,
      image_filename: imageArtifact.filename,
      image_mime_type: imageArtifact.mimeType,
      image_model: imageArtifact.model,
      image_data_url: imageArtifact.dataUrl,
      logs: [
        ...run.logs,
        { at: now(), message: imageArtifact.logMessage },
        { at: now(), message: 'Generated post is ready for review.' },
      ],
    });
  } catch (error) {
    return failRun(run, error);
  }
}

export async function regeneratePost(runId: string, editPrompt: string) {
  let run = requireRun(await readRun(runId));

  try {
    if (!run.data) {
      throw new Error('No generated data exists to regenerate from.');
    }

    run = await appendLog(run, 'Regenerating post with edit prompt.');
    const baseKnowledge = await readRuntimeKnowledge(['base']);
    const revisedResponse = await callLoggedAnthropicFull('stage_5_regenerate', runId, `Current data:
${JSON.stringify(run.data, null, 2)}

User edit prompt:
${editPrompt}

Revise the chart-ready post data and caption according to the user edit.

Requirements:
- Preserve the existing source_metadata unless the edit requires a correction.
- Keep the data shape aligned with the selected visual template: rows for bar templates, points for single-line time series, entities for multi-line/slope/scatter, and segments for composition/distribution charts.
- Keep all numeric series compact and directly renderable by the selected visual template.
- For ranked comparisons, sort rows descending by value.
- Write a 2-3 sentence caption in Crustdata's voice with a clear hook and the key data takeaway.
- Submit the result through the submit_generated_post tool.`, {
      system: cachedRuntimeSystem(
        baseKnowledge,
        ['base'],
        "You are Stage 5 of Newsroom: revise existing chart-ready post data using the user's edit prompt."
      ),
      maxTokens: 2048,
      temperature: 0.1,
      tools: generatedPostTool('Submit revised chart-ready post data and caption for an edited Newsroom post.'),
      toolChoice: { type: 'tool', name: GENERATED_POST_TOOL_NAME },
    });

    const revised = await getGeneratedPostToolInput(
      'stage_5_regenerate',
      runId,
      revisedResponse.response
    );
    const imageArtifact = await createPostImageArtifact(
      runId,
      revised.data,
      run.selected_chart_template ||
        run.selected_candidate?.visual_template ||
        run.selected_candidate?.matched_visual ||
        ''
    );

    return writeRun({
      ...run,
      status: 'ready',
      data: revised.data,
      caption: revised.caption,
      image_path: imageArtifact.imagePath,
      image_filename: imageArtifact.filename,
      image_mime_type: imageArtifact.mimeType,
      image_model: imageArtifact.model,
      image_data_url: imageArtifact.dataUrl,
      error: undefined,
      logs: [
        ...run.logs,
        { at: now(), message: imageArtifact.logMessage },
        { at: now(), message: 'Regenerated post is ready.' },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return writeRun({
      ...run,
      status: 'ready',
      error: message,
      logs: [...run.logs, { at: now(), message: `Regeneration failed: ${message}` }],
    });
  }
}

export async function saveRun(runId: string) {
  const run = requireRun(await readRun(runId));

  if (run.status !== 'ready' && run.status !== 'saved') {
    throw new Error('Only ready runs can be saved.');
  }

  const saved = await writeRun({
    ...run,
    status: 'saved',
    saved_at: now(),
    error: undefined,
    logs: [...run.logs, { at: now(), message: 'Run saved.' }],
  });

  const usedTemplate =
    saved.visual_template?.trim() ||
    saved.selected_chart_template?.trim() ||
    saved.selected_candidate?.visual_template?.trim() ||
    saved.selected_candidate?.matched_visual?.trim() ||
    '';
  let mutated = false;
  if (usedTemplate) {
    await recordTemplateUsed(runId, usedTemplate);
    mutated = true;
  }

  const steeringInput = saved.steering_input?.trim();
  if (steeringInput) {
    await recordSteering(runId, steeringInput);
    mutated = true;
  }

  return mutated ? requireRun(await readRun(runId)) : saved;
}
