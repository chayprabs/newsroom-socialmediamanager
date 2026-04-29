import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { GeneratedPostData } from '../types';
import {
  type AnthropicResponse,
  type AnthropicTextBlock,
  callAnthropicWithResponse as defaultCallAnthropicWithResponse,
} from '../server/clients';
import { appendRunArtifact, getRunDir, readMarkdown as defaultReadMarkdown } from '../server/storage';
import { logSonnetUsage as defaultLogSonnetUsage } from './tokenLogger';
import {
  BACKGROUND_MODE,
  CANVAS_SIZE,
  EXPORT_SIZE,
  SAFE_AREA,
  type ValidationResult,
  extractHexColors,
  validateImagePrompt,
} from './imagePromptValidator';

const HARD_CAP_CHARS = 25000;
const GPT_IMAGE_2_MAX_CHARS = 32000;
const TOOL_NAME = 'submit_image_prompt';
const MAX_VALIDATION_ATTEMPTS = 3; // 1 initial attempt + 2 retries

// Re-export the env constants and validator helpers so callers and tests have one entry point.
export {
  BACKGROUND_MODE,
  CANVAS_SIZE,
  EXPORT_SIZE,
  SAFE_AREA,
  extractHexColors,
  validateImagePrompt,
  type ValidationResult,
};

const STATIC_PROJECT_CONTEXT = `Newsroom is Crustdata's internal pipeline for turning live tech/startup trend signals into API-backed data posts.
Stage 4a constructs one focused GPT-image-2 prompt per post. Use design.md as the visual specification — base.md is intentionally not loaded for this stage.`;

/**
 * Strict contract template for Sonnet's Stage 4a system prompt. Placeholders are substituted
 * with the live env values via applyCanvasPlaceholders before being sent to the model.
 */
const STAGE_4A_STRICT_CONTRACT = `You are constructing a prompt that will be sent to GPT-image-2 to generate a Crustdata-branded social post image. The image MUST match the Crustdata visual brand exactly. GPT-image-2 is extremely literal about what you specify and creative about what you leave open — therefore you must specify EVERY style element explicitly. Do not paraphrase. Do not say "in the Crustdata style" — instead, write out the literal hex values, exact positioning, exact font specifications.

Your output MUST be a complete prompt based on the matching worked-example skeleton from design.md. Find the skeleton for the requested visual_template (e.g., ranked_horizontal_bar), substitute the headline, subtitle, and data values, and return the filled prompt.

Every prompt you produce MUST contain, verbatim:
- The exact background hex #E8E6F5 and the phrase "full bleed".
- The word "portrait" and a clear instruction to use the full available portrait canvas.
- The exact heading "EMPTY FOOTER ZONE" and an instruction that the bottom 12% of the canvas is empty lavender space.
- The exact phrase "Do NOT render \"Data from:\"" so GPT-image-2 does not attempt the footer.
- Explicit hex color assignments for every chart element (no "use a nice palette," only literal hex values).
- The phrase "do not crop or cut off any part of the headline".
- At least one rule from the do_not list in design.md (section 11), transcribed verbatim, relevant to the chosen chart type.

Background mode for the GPT-image-2 API call is {{BACKGROUND_MODE}}; the prompt body still must specify the lavender background as a flat solid color, no transparency.

The OpenAI API generation size is {{CANVAS_SIZE}} and the export size is {{EXPORT_SIZE}}, but do not tell GPT-image-2 to design for a centered crop zone or fixed 4:5 frame. The final image export is handled after generation. Tell GPT-image-2 to keep every text block and chart element comfortably inside the top 88% of the visible portrait composition with generous inner margins.

The bottom 12% of the canvas must be reserved as empty lavender space. Do NOT include any 'Data from:' or 'Crustdata' branding in the prompt — these are added by a separate post-processing step. If you include them, GPT-image-2 will render them and they'll be overwritten with a duplicate, looking bad. Always instruct the image model to leave the footer zone empty.

The validator will reject prompts missing any required element. Failed validation costs us a full retry, so include every element on the first try.`;

export class ImagePromptTooLongError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImagePromptTooLongError';
  }
}

export class ImagePromptValidationError extends Error {
  readonly missing: string[];
  readonly warnings: string[];
  readonly attempts: number;

  constructor(message: string, missing: string[], warnings: string[], attempts: number) {
    super(message);
    this.name = 'ImagePromptValidationError';
    this.missing = missing;
    this.warnings = warnings;
    this.attempts = attempts;
  }
}

type SubmitImagePromptInput = {
  prompt: string;
  template_used: string;
  character_count: number;
  hex_colors_used: string[];
};

type BuildImagePromptOptions = {
  callAnthropicWithResponse?: typeof defaultCallAnthropicWithResponse;
  readMarkdown?: typeof defaultReadMarkdown;
  logSonnetUsage?: typeof defaultLogSonnetUsage;
};

function numeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function approxTokens(chars: number) {
  return Math.ceil(chars / 4);
}

function debugDir(runId: string) {
  return path.join(getRunDir(runId), 'debug');
}

/**
 * Substitute env-driven canvas placeholders in any text. Both the long-form
 * (`{{OPENAI_IMAGE_SIZE}}`) used in design.md and the short-form (`{{CANVAS_SIZE}}`)
 * used in the strict contract are recognized.
 */
export function applyCanvasPlaceholders(text: string) {
  return text
    .replaceAll('{{OPENAI_IMAGE_SIZE}}', CANVAS_SIZE)
    .replaceAll('{{OPENAI_IMAGE_SAFE_AREA}}', SAFE_AREA)
    .replaceAll('{{OPENAI_IMAGE_EXPORT_SIZE}}', EXPORT_SIZE)
    .replaceAll('{{OPENAI_IMAGE_BACKGROUND}}', BACKGROUND_MODE)
    .replaceAll('{{CANVAS_SIZE}}', CANVAS_SIZE)
    .replaceAll('{{SAFE_AREA}}', SAFE_AREA)
    .replaceAll('{{EXPORT_SIZE}}', EXPORT_SIZE)
    .replaceAll('{{BACKGROUND_MODE}}', BACKGROUND_MODE);
}

function stage4System(design: string): AnthropicTextBlock[] {
  return [
    {
      type: 'text',
      text: STATIC_PROJECT_CONTEXT,
    },
    {
      type: 'text',
      text: applyCanvasPlaceholders(design),
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: applyCanvasPlaceholders(STAGE_4A_STRICT_CONTRACT),
    },
  ];
}

function correctiveSystemBlock(missing: string[]): AnthropicTextBlock {
  const formatted = missing.map((entry) => `- ${entry}`).join('\n');
  return {
    type: 'text',
    text: `Your previous prompt was missing these required elements:
${formatted}

Re-construct the prompt and include them ALL — do not omit any. Return only the corrected prompt via the submit_image_prompt tool. The required elements are mandatory, not suggestions.`,
  };
}

function imagePromptTool() {
  return [
    {
      name: TOOL_NAME,
      description: 'Submit the fully-constructed GPT-image-2 prompt for this Crustdata-style post.',
      input_schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description:
              'Complete GPT-image-2 prompt, must include all required elements: the exact lavender hex #E8E6F5, the phrase "full bleed", portrait layout language, the EMPTY FOOTER ZONE contract for the bottom 12%, explicit hex color assignments, the do-not-crop-headline phrase, and at least one verbatim do_not rule from design.md.',
          },
          template_used: {
            type: 'string',
            description: 'The visual template name from design.md (e.g., ranked_horizontal_bar).',
          },
          character_count: {
            type: 'integer',
            description: 'Length of the prompt string in characters.',
          },
          hex_colors_used: {
            type: 'array',
            items: { type: 'string' },
            description:
              'All hex colors specified in the prompt, in the order they first appear (e.g., ["#E8E6F5", "#111111", "#6B5BD9", "#666666"]).',
          },
        },
        required: ['prompt', 'template_used', 'character_count', 'hex_colors_used'],
      },
    },
  ];
}

function promptBuilderUserPrompt(data: GeneratedPostData, visualTemplate: string) {
  return `Chart-ready data from Stage 3:
${JSON.stringify(data, null, 2)}

Visual template selected by Stage 2: ${visualTemplate || 'best_matching_template'}

Build the final GPT-image-2 prompt now using the matching worked-example skeleton from design.md (section 8). Substitute only the headline, subtitle, data rows/points, and bar/line color assignments. Every other value is pinned and must appear verbatim. Inline the portrait layout instruction, #E8E6F5, "full bleed", "EMPTY FOOTER ZONE", "Do NOT render \"Data from:\"", "bottom 12%", "do not crop or cut off any part of the headline", and at least one relevant do_not rule transcribed verbatim from design.md section 11. Do not describe a centered safe-area crop or fixed 4:5 export frame; use the full available portrait canvas. Do not ask GPT-image-2 to render the Crustdata footer, logo, or wordmark; Stage 4c composites the real footer after generation.

Then call submit_image_prompt with the prompt, the template name, the character count, and the full list of hex colors used.`;
}

function getToolInput(response: AnthropicResponse): SubmitImagePromptInput {
  const toolUse = response.content?.find((part) => part.type === 'tool_use' && part.name === TOOL_NAME);
  const input = toolUse?.input;

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Stage 4a did not call submit_image_prompt with an object input.');
  }

  const candidate = input as Partial<SubmitImagePromptInput>;
  if (typeof candidate.prompt !== 'string' || !candidate.prompt.trim()) {
    throw new Error('Stage 4a submit_image_prompt.prompt was empty.');
  }
  if (typeof candidate.template_used !== 'string' || !candidate.template_used.trim()) {
    throw new Error('Stage 4a submit_image_prompt.template_used was empty.');
  }

  const reportedHexColors = Array.isArray(candidate.hex_colors_used)
    ? candidate.hex_colors_used.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  const hexColorsUsed = reportedHexColors.length > 0 ? reportedHexColors : extractHexColors(candidate.prompt);

  return {
    prompt: candidate.prompt,
    template_used: candidate.template_used,
    character_count:
      typeof candidate.character_count === 'number' && Number.isFinite(candidate.character_count)
        ? candidate.character_count
        : candidate.prompt.length,
    hex_colors_used: hexColorsUsed,
  };
}

async function writeStage4PromptDiagnostics(
  runId: string,
  toolInput: SubmitImagePromptInput,
  response: AnthropicResponse,
  validation: ValidationResult,
  attempts: number
) {
  const usage = response.usage || {};
  const overCap = toolInput.prompt.length > HARD_CAP_CHARS;
  const validationFailure = !validation.valid ? validation : null;
  const meta = {
    template_used: toolInput.template_used,
    prompt_length_chars: toolInput.prompt.length,
    prompt_length_approx_tokens: approxTokens(toolInput.prompt.length),
    gpt_image_2_max_chars: GPT_IMAGE_2_MAX_CHARS,
    our_hard_cap_chars: HARD_CAP_CHARS,
    over_cap: overCap,
    over_openai_limit: toolInput.prompt.length > GPT_IMAGE_2_MAX_CHARS,
    canvas_size: CANVAS_SIZE,
    safe_area: SAFE_AREA,
    export_size: EXPORT_SIZE,
    background_mode: BACKGROUND_MODE,
    hex_colors_used: toolInput.hex_colors_used,
    hex_colors_count: toolInput.hex_colors_used.length,
    validation_attempts: attempts,
    validation_ok: validation.valid,
    validation_warnings: validation.warnings,
    validation_missing: validationFailure ? validationFailure.missing : [],
    first_500_chars: toolInput.prompt.slice(0, 500),
    last_500_chars: toolInput.prompt.slice(-500),
    sub_step_4a_input_tokens: numeric(usage.input_tokens),
    sub_step_4a_output_tokens: numeric(usage.output_tokens),
    sub_step_4a_cache_read_tokens: numeric(usage.cache_read_input_tokens),
  };
  const dir = debugDir(runId);

  await fs.mkdir(dir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(dir, 'stage_4_image_prompt.txt'), toolInput.prompt, 'utf8'),
    fs.writeFile(path.join(dir, 'stage_4_image_prompt_meta.json'), JSON.stringify(meta, null, 2), 'utf8'),
  ]);

  return meta;
}

async function writeValidationFailureBundle(
  runId: string,
  attempt: number,
  toolInput: SubmitImagePromptInput,
  validation: ValidationResult & { valid: false }
) {
  const dir = debugDir(runId);
  await fs.mkdir(dir, { recursive: true });
  const bundle = {
    attempt,
    timestamp: new Date().toISOString(),
    template_used: toolInput.template_used,
    canvas_size: CANVAS_SIZE,
    safe_area: SAFE_AREA,
    validation: {
      valid: validation.valid,
      missing: validation.missing,
      warnings: validation.warnings,
    },
    hex_colors_used: toolInput.hex_colors_used,
    prompt_length_chars: toolInput.prompt.length,
    prompt: toolInput.prompt,
  };
  await fs.writeFile(
    path.join(dir, `stage_4a_validation_failure_${attempt}.json`),
    JSON.stringify(bundle, null, 2),
    'utf8'
  );
}

type AttemptHistoryEntry = {
  attempt: number;
  valid: boolean;
  missing: string[];
  warnings: string[];
  prompt_length_chars: number;
  hex_colors_used: string[];
};

/**
 * Snapshot every OPENAI_IMAGE_* env var active during the run plus the resolved
 * constants the builder is using. Proves the env was read correctly.
 */
async function writeEnvSnapshot(runId: string) {
  const dir = debugDir(runId);
  await fs.mkdir(dir, { recursive: true });

  const raw: Record<string, string> = {};
  for (const key of Object.keys(process.env).sort()) {
    if (!key.startsWith('OPENAI_IMAGE_')) continue;
    const value = process.env[key];
    if (typeof value === 'string') {
      raw[key] = value;
    }
  }

  const snapshot = {
    captured_at: new Date().toISOString(),
    raw_env: raw,
    resolved: {
      CANVAS_SIZE,
      SAFE_AREA,
      EXPORT_SIZE,
      BACKGROUND_MODE,
    },
  };

  await fs.writeFile(
    path.join(dir, 'stage_4a_env_snapshot.json'),
    JSON.stringify(snapshot, null, 2),
    'utf8'
  );
}

/**
 * Persist the prompt produced by Sonnet on attempt {n}, regardless of whether it
 * passed validation. Provides a complete, auditable retry history.
 */
async function writeAttemptPrompt(runId: string, attempt: number, prompt: string) {
  const dir = debugDir(runId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `stage_4a_attempt_${attempt}.txt`), prompt, 'utf8');
}

/**
 * Final validation summary. Includes per-attempt history (so warnings on a successful
 * first attempt are surfaced too, not only the missing-required-element list).
 */
async function writeValidationResult(
  runId: string,
  templateUsed: string,
  history: AttemptHistoryEntry[]
) {
  const dir = debugDir(runId);
  await fs.mkdir(dir, { recursive: true });
  const final = history[history.length - 1] ?? null;
  const result = {
    captured_at: new Date().toISOString(),
    template_used: templateUsed,
    total_attempts: history.length,
    final_attempt: final?.attempt ?? 0,
    final: final
      ? {
          valid: final.valid,
          missing: final.missing,
          warnings: final.warnings,
        }
      : null,
    attempt_history: history,
  };
  await fs.writeFile(
    path.join(dir, 'stage_4a_validation_result.json'),
    JSON.stringify(result, null, 2),
    'utf8'
  );
}

async function logStage4PromptCapViolation(runId: string, prompt: string, templateUsed: string) {
  await appendRunArtifact(
    runId,
    'pipeline.log',
    `${JSON.stringify({
      event: 'stage_4_prompt_cap_violation',
      run_id: runId,
      timestamp: new Date().toISOString(),
      promptLength: prompt.length,
      cap: HARD_CAP_CHARS,
      templateUsed,
      firstChars: prompt.slice(0, 500),
      lastChars: prompt.slice(-500),
    })}\n`
  );
}

async function logStage4PromptValidationFailure(
  runId: string,
  toolInput: SubmitImagePromptInput,
  validation: ValidationResult & { valid: false },
  attempts: number
) {
  await appendRunArtifact(
    runId,
    'pipeline.log',
    `${JSON.stringify({
      event: 'stage_4_prompt_validation_failed',
      run_id: runId,
      timestamp: new Date().toISOString(),
      attempts,
      templateUsed: toolInput.template_used,
      missing: validation.missing,
      warnings: validation.warnings,
      firstChars: toolInput.prompt.slice(0, 500),
      lastChars: toolInput.prompt.slice(-500),
    })}\n`
  );
}

async function logStage4PromptValidationWarnings(
  runId: string,
  toolInput: SubmitImagePromptInput,
  validation: ValidationResult & { valid: true }
) {
  if (validation.warnings.length === 0) return;
  await appendRunArtifact(
    runId,
    'pipeline.log',
    `${JSON.stringify({
      event: 'stage_4_prompt_validation_warnings',
      run_id: runId,
      timestamp: new Date().toISOString(),
      templateUsed: toolInput.template_used,
      warnings: validation.warnings,
    })}\n`
  );
}

export async function buildImagePrompt(
  data: GeneratedPostData,
  visualTemplate: string,
  runId: string,
  options: BuildImagePromptOptions = {}
) {
  const callAnthropicWithResponse = options.callAnthropicWithResponse || defaultCallAnthropicWithResponse;
  const readMarkdown = options.readMarkdown || defaultReadMarkdown;
  const logSonnetUsage = options.logSonnetUsage || defaultLogSonnetUsage;

  const design = await readMarkdown('design');
  const baseSystem = stage4System(design);
  const userPrompt = promptBuilderUserPrompt(data, visualTemplate);

  await writeEnvSnapshot(runId);

  const history: AttemptHistoryEntry[] = [];
  let lastTemplateUsed = visualTemplate;
  let lastFailure:
    | {
        validation: ValidationResult & { valid: false };
        toolInput: SubmitImagePromptInput;
        response: AnthropicResponse;
      }
    | null = null;

  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt += 1) {
    const system = lastFailure
      ? [...baseSystem, correctiveSystemBlock(lastFailure.validation.missing)]
      : baseSystem;
    const stageLabel = attempt === 1 ? 'stage_4_prompt_build' : `stage_4_prompt_build_retry_${attempt - 1}`;

    const { response } = await callAnthropicWithResponse(userPrompt, {
      system,
      maxTokens: 4096,
      temperature: 0.1,
      tools: imagePromptTool(),
      toolChoice: { type: 'tool', name: TOOL_NAME },
    });
    logSonnetUsage(stageLabel, runId, response);

    const toolInput = getToolInput(response);
    const filledPrompt = toolInput.prompt.trim();
    const normalizedToolInput: SubmitImagePromptInput = {
      ...toolInput,
      prompt: filledPrompt,
      character_count: filledPrompt.length,
      hex_colors_used:
        toolInput.hex_colors_used.length > 0 ? toolInput.hex_colors_used : extractHexColors(filledPrompt),
    };
    lastTemplateUsed = normalizedToolInput.template_used;

    await writeAttemptPrompt(runId, attempt, filledPrompt);

    const validation = validateImagePrompt(filledPrompt);
    history.push({
      attempt,
      valid: validation.valid,
      missing: validation.valid ? [] : validation.missing,
      warnings: validation.warnings,
      prompt_length_chars: filledPrompt.length,
      hex_colors_used: normalizedToolInput.hex_colors_used,
    });

    if (validation.valid) {
      const meta = await writeStage4PromptDiagnostics(
        runId,
        normalizedToolInput,
        response,
        validation,
        attempt
      );
      await logStage4PromptValidationWarnings(runId, normalizedToolInput, validation);
      await writeValidationResult(runId, normalizedToolInput.template_used, history);

      // The hard cap is checked AFTER validation passes, per the Stage 4a contract.
      if (meta.over_cap) {
        await logStage4PromptCapViolation(runId, filledPrompt, normalizedToolInput.template_used);
        throw new ImagePromptTooLongError(
          `Stage 4a produced a prompt of ${filledPrompt.length} chars, exceeding the ${HARD_CAP_CHARS} cap. ` +
            'This indicates a regression in template construction. See debug bundle.'
        );
      }

      return filledPrompt;
    }

    await writeValidationFailureBundle(runId, attempt, normalizedToolInput, validation);
    lastFailure = { validation, toolInput: normalizedToolInput, response };
  }

  // All retries exhausted — preserve diagnostics for the final attempt and fail loudly.
  if (lastFailure) {
    await writeStage4PromptDiagnostics(
      runId,
      lastFailure.toolInput,
      lastFailure.response,
      lastFailure.validation,
      MAX_VALIDATION_ATTEMPTS
    );
    await logStage4PromptValidationFailure(
      runId,
      lastFailure.toolInput,
      lastFailure.validation,
      MAX_VALIDATION_ATTEMPTS
    );
    await writeValidationResult(runId, lastFailure.toolInput.template_used, history);

    const issues = [
      lastFailure.validation.missing.length ? `missing: ${lastFailure.validation.missing.join('; ')}` : '',
      lastFailure.validation.warnings.length ? `warnings: ${lastFailure.validation.warnings.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    throw new ImagePromptValidationError(
      `Stage 4a prompt failed canvas-spec validation after ${MAX_VALIDATION_ATTEMPTS} attempts. ${issues}.`,
      lastFailure.validation.missing,
      lastFailure.validation.warnings,
      MAX_VALIDATION_ATTEMPTS
    );
  }

  // Defensive: should be unreachable because the loop always either returns or sets lastFailure.
  await writeValidationResult(runId, lastTemplateUsed, history);
  throw new ImagePromptValidationError(
    'Stage 4a prompt construction failed without a captured validation result.',
    [],
    [],
    MAX_VALIDATION_ATTEMPTS
  );
}
