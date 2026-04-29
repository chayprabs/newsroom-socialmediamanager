import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CandidateSpec, GeneratedPostData, GenerationStep, RunErrorDetails, RunState } from '../types';
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
  type ScoredCandidate,
} from '../pipeline/scoreCandidates';
import {
  buildReframeCandidatesPrompt,
  isReframedCandidate,
  type ReframedCandidate,
} from '../pipeline/reframeCandidates';
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
};

type RuntimeKnowledgeFile = 'base' | 'design';
type RuntimeKnowledge = Partial<Record<RuntimeKnowledgeFile, string>>;

const FEASIBILITY_LOG_FILENAME = 'pipeline.log';
const MAX_DISCOVERY_CANDIDATES = 10;
const ALLOWED_VISUAL_TEMPLATES = new Set([
  'ranked_horizontal_bar',
  'ranked_horizontal_bar_with_icons',
  'vertical_bar_comparison',
  'single_line_timeseries',
  'annotated_line_timeseries',
  'event_effect_multi_panel_line',
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

  if (!capability.supported_intents.includes(intent)) {
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
    reason: `Mapped to ${normalizedEndpoint} (${intent}) in the audited Crustdata registry.`,
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

function getCandidateId(candidate: CandidateForValidation) {
  return typeof candidate.candidate_id === 'string' ? candidate.candidate_id : '';
}

function stripNonApiHelperParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([name]) => !NON_API_HELPER_PARAM_NAMES.has(name))
  );
}

function normalizeValidatedCandidate(
  candidate: CandidateForValidation,
  scoredById: Map<string, ScoredCandidate>
): CandidateSpec & CandidateForValidation {
  const candidateId = getCandidateId(candidate);
  const scoredCandidate = scoredById.get(candidateId);
  const rawEndpoint = candidate.crustdata_query?.endpoint || '';
  const endpoint = rawEndpoint.trim() ? normalizeCrustdataEndpoint(rawEndpoint) : '';

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
      intent: candidate.crustdata_query?.intent,
      params: stripNonApiHelperParams(candidate.crustdata_query?.params || {}),
    },
    visual_template: candidate.visual_template || candidate.matched_visual || scoredCandidate?.matched_visual || '',
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

export async function createRun() {
  const timestamp = now();
  const run: RunState = {
    run_id: randomUUID(),
    created_at: timestamp,
    updated_at: timestamp,
    status: 'created',
    logs: [{ at: timestamp, message: 'Run created.' }],
    candidates: [],
    generation_steps: defaultSteps(),
  };

  return writeRun(run);
}

export async function discoverCandidates(runId: string) {
  let run = requireRun(await readRun(runId));

  try {
    run = await writeRun({ ...run, status: 'discovering', error: undefined });
    run = await appendLog(run, 'Reading editorial base.');

    const baseKnowledge = await readRuntimeKnowledge(['base']);

    run = await appendLog(run, 'Asking Claude to construct a Grok trend discovery query.');
    const grokQuery = await callLoggedAnthropic(
      'stage_1_discovery',
      runId,
      `Write one concise Grok/X live-search prompt to find current tech/startup conversations that can become Crustdata data posts.

The downstream Crustdata key can only use these endpoint-backed post shapes:
- Hiring demand and job-posting counts via /job/search.
- Company cohorts, rankings, funding/headcount/location/taxonomy comparisons via /company/search.
- Known-company deep dives via /company/enrich.
- Founder, alumni, title, employer, skills, and location patterns via /person/search.
- Known-person enrichment via /person/enrich.
- Known-URL page fetches via /web/enrich/live.

Avoid trends that require unavailable data: professional-network live endpoints, /web/search/live, broad web discovery, sentiment analysis, comment analysis, or anything that needs values Crustdata cannot structurally return.
Prefer data-rich questions with broad cohorts, rankings, or aggregations. Return plain text only.`,
      {
        system: cachedRuntimeSystem(
          baseKnowledge,
          ['base'],
          'You are Stage 1 of Newsroom for Crustdata: create a trend-discovery prompt for Grok/X.'
        ),
      }
    );

    const grokCandidatePrompt = `Use this search intent to identify and rank the best ${MAX_DISCOVERY_CANDIDATES} current tech/startup trend candidates suitable for Crustdata data posts:

${grokQuery}

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
    let grokResponse: string;
    let candidateResponse: AnthropicResponse | undefined;
    let candidateParseStage = 'stage_1_grok_candidates';
    let discoverySource = 'Grok';
    try {
      grokResponse = await callGrok(grokCandidatePrompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      run = await appendLog(run, `Grok discovery failed (${message}). Falling back to Claude candidate generation.`);
      discoverySource = 'Claude fallback';
      candidateParseStage = 'stage_1_discovery_fallback';
      const fallbackResponse = await callLoggedAnthropicFull(
        'stage_1_discovery_fallback',
        runId,
        `Grok could not return candidates, so generate ${MAX_DISCOVERY_CANDIDATES} Crustdata-ready fallback candidates yourself.

Use the same search intent and constraints:
${grokQuery}

The candidates do not need live engagement numbers, but they must be plausible, API-backed, and broad enough for Crustdata data posts.
Use only these endpoint-backed shapes:
- /job/search hiring demand, job counts, and group_by aggregations.
- /company/search company cohorts, funding, headcount, geography, taxonomy, followers, and rankings.
- /company/enrich known-company profile comparisons.
- /person/search founder, alumni, employer, title, role, skills, education, and location patterns.

Do not include ideas requiring sentiment, comments, /web/search/live, professional-network live endpoints, or unknown APIs.

Return JSON with this exact shape:
{
  "candidates": [
    {
      "id": "c_01",
      "text": "trend text",
      "source_url": "",
      "engagement": { "likes": 0, "reposts": 0, "replies": 0 },
      "entities": ["company or topic"]
    }
  ]
}`,
        {
          system: cachedRuntimeSystem(
            baseKnowledge,
            ['base'],
            'You are Stage 1 fallback for Newsroom: produce conservative Crustdata API-ready candidate ideas when Grok is unavailable.'
          ),
        }
      );
      grokResponse = fallbackResponse.text;
      candidateResponse = fallbackResponse.response;
    }

    const rawCandidates = await extractJsonObjectWithDiagnostics<{ candidates?: unknown[] }>(
      candidateParseStage,
      runId,
      grokResponse,
      candidateResponse
    );
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
      buildScoreCandidatesPrompt(rawCandidateList, formatEndpointCapabilitiesForPrompt()),
      {
        system: cachedRuntimeSystem(
          baseKnowledge,
          ['base'],
          'You are Stage 2 pass 1 of Newsroom: score all trend candidates and decide initial Crustdata feasibility. Return compact valid JSON only.'
        ),
        maxTokens: 4096,
      }
    );

    const scored = await extractJsonObjectWithDiagnostics<{ scored_candidates?: unknown[] }>(
      'stage_2_score',
      runId,
      scoredResponse.text,
      scoredResponse.response
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
    run = await appendLog(run, `Reframing top ${topScoredCandidates.length} feasible candidate(s).`);
    const reframeResponse = await callLoggedAnthropicFull(
      'stage_2_reframe',
      runId,
      buildReframeCandidatesPrompt(topScoredCandidates, formatEndpointCapabilitiesForPrompt()),
      {
        system: cachedRuntimeSystem(
          reframeKnowledge,
          ['base', 'design'],
          `You are Stage 2 pass 2 of Newsroom: fully reframe only the supplied feasible candidates into deterministic Crustdata query specs. Only use these currently usable endpoints:\n${formatUsableEndpoints()}`
        ),
        maxTokens: 4096,
      }
    );

    const reframed = await extractJsonObjectWithDiagnostics<{ candidates?: unknown[] }>(
      'stage_2_reframe',
      runId,
      reframeResponse.text,
      reframeResponse.response
    );
    const reframedCandidates = (Array.isArray(reframed.candidates) ? reframed.candidates : []).filter(
      isReframedCandidate
    );
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
        feasibleCandidates.push(normalizedCandidate);
      }
    }

    const topCandidates = feasibleCandidates.sort((a, b) => scoreTotal(b) - scoreTotal(a)).slice(0, 3);

    if (!topCandidates.length) {
      run = { ...run, logs: [...run.logs, ...validationLogs] };
      return noMatches(run, 'No candidates passed the Crustdata feasibility validator. Try finding new ideas again.');
    }

    return writeRun({
      ...run,
      status: 'awaiting_selection',
      candidates: topCandidates,
      logs: [
        ...run.logs,
        ...validationLogs,
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
    generation_steps: defaultSteps(),
    logs: [...run.logs, { at: now(), message: `Selected candidate: ${selected.headline}` }],
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
    const selectedCandidate = run.selected_candidate;
    const endpoint = normalizeCrustdataEndpoint(selectedCandidate.crustdata_query.endpoint);
    if (!isUsableCrustdataEndpoint(endpoint)) {
      throw new Error(`Crustdata endpoint ${endpoint} has not been verified for this API key.`);
    }

    run = await writeRun({ ...run, status: 'generating', error: undefined });
    run = await writeRun(updateStep(run, 'fetching_data', 'running', 'Calling Crustdata API.'));

    const rawData = await callCrustdata(
      endpoint,
      selectedCandidate.crustdata_query.params
    );

    await writeRunArtifact(runId, 'crustdata-response.json', JSON.stringify(rawData, null, 2));
    if (!hasCrustdataUsableData(endpoint, rawData)) {
      throw new Error(noUsableDataMessage(endpoint));
    }

    run = await writeRun(updateStep(run, 'fetching_data', 'done'));
    run = await writeRun(updateStep(run, 'finalizing_data', 'running', 'Asking Claude to normalize chart data.'));

    const baseKnowledge = await readRuntimeKnowledge(['base']);
    const shapedResponse = await callLoggedAnthropicFull('stage_5_caption', runId, `Selected candidate:
${JSON.stringify(selectedCandidate, null, 2)}

Raw Crustdata response:
${JSON.stringify(rawData, null, 2)}

Return JSON:
{
  "data": {
    "title": "post title",
    "subtitle": "post subtitle",
    "rows": [{ "label": "label", "value": 0, "color": "#111111" }],
    "footer": "Data from: Crustdata",
    "source_metadata": { "endpoint": "endpoint hit", "fetched_at": "ISO timestamp" }
  },
  "caption": "2-3 sentence caption"
}`, {
      system: cachedRuntimeSystem(
        baseKnowledge,
        ['base'],
        'You are Stage 5 of Newsroom: normalize Crustdata API output into chart-ready post data and a caption.'
      ),
    });

    const shaped = await extractJsonObjectWithDiagnostics<{ data: GeneratedPostData; caption: string }>(
      'stage_5_caption',
      runId,
      shapedResponse.text,
      shapedResponse.response
    );
    if (!shaped.data?.rows?.length) {
      throw new Error('Finalized data did not include chart rows.');
    }

    await writeRunArtifact(runId, 'data.json', JSON.stringify(shaped.data, null, 2));
    run = await writeRun({ ...updateStep(run, 'finalizing_data', 'done'), data: shaped.data, caption: shaped.caption });
    run = await writeRun(updateStep(run, 'generating_image', 'running', 'Generating the post image.'));

    const imageArtifact = await createPostImageArtifact(
      runId,
      shaped.data,
      selectedCandidate.visual_template || selectedCandidate.matched_visual || ''
    );

    return writeRun({
      ...updateStep(run, 'generating_image', 'done'),
      status: 'ready',
      image_path: imageArtifact.imagePath,
      image_filename: imageArtifact.filename,
      image_mime_type: imageArtifact.mimeType,
      image_model: imageArtifact.model,
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

Return JSON:
{
  "data": {
    "title": "post title",
    "subtitle": "post subtitle",
    "rows": [{ "label": "label", "value": 0, "color": "#111111" }],
    "footer": "Data from: Crustdata",
    "source_metadata": {}
  },
  "caption": "2-3 sentence caption"
}`, {
      system: cachedRuntimeSystem(
        baseKnowledge,
        ['base'],
        "You are Stage 5 of Newsroom: revise existing chart-ready post data using the user's edit prompt."
      ),
    });

    const revised = await extractJsonObjectWithDiagnostics<{ data: GeneratedPostData; caption: string }>(
      'stage_5_regenerate',
      runId,
      revisedResponse.text,
      revisedResponse.response
    );
    const imageArtifact = await createPostImageArtifact(
      runId,
      revised.data,
      run.selected_candidate?.visual_template || run.selected_candidate?.matched_visual || ''
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

  return writeRun({
    ...run,
    status: 'saved',
    saved_at: now(),
    error: undefined,
    logs: [...run.logs, { at: now(), message: 'Run saved.' }],
  });
}
