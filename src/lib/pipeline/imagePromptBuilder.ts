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

const HARD_CAP_CHARS = 25000;
const GPT_IMAGE_2_MAX_CHARS = 32000;
const TOOL_NAME = 'submit_image_prompt';
const STATIC_PROJECT_CONTEXT = `Newsroom is Crustdata's internal pipeline for turning live tech/startup trend signals into API-backed data posts.
Use the cached knowledge files as the source of truth for editorial fit, topic scope, voice, visual conventions, and pipeline constraints.
Keep stage outputs concise, structured, and faithful to the supplied runtime data.
Do not invent data, endpoints, sources, companies, metrics, or claims.`;

export class ImagePromptTooLongError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImagePromptTooLongError';
  }
}

type SubmitImagePromptInput = {
  prompt: string;
  template_used: string;
  character_count: number;
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

function stage4System(base: string, design: string): AnthropicTextBlock[] {
  return [
    {
      type: 'text',
      text: STATIC_PROJECT_CONTEXT,
    },
    {
      type: 'text',
      text: base,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: design,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: `You are Stage 4a of Newsroom: construct exactly one focused GPT-image-2 prompt from the supplied chart-ready data and visual template.

Use design.md only as reference context. Do not paste design.md wholesale into your answer.
Find the matching worked-example prompt template for the requested visual_template and fill it with the actual title, subtitle, rows, colors, footer, and layout constraints.
Apply only global style rules and negative-example constraints relevant to this one chart type.
The prompt must be self-contained, focused on a single chart type, and normally 2000-8000 characters.
Do not include specs for any other chart types.`,
    },
  ];
}

function imagePromptTool() {
  return [
    {
      name: TOOL_NAME,
      description: 'Submit the fully-constructed GPT-image-2 prompt for this specific post.',
      input_schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description:
              'The complete prompt to send to GPT-image-2. Must be self-contained, focused on a single chart type, and under 25000 characters.',
          },
          template_used: {
            type: 'string',
            description: 'The visual template name from design.md that was used as the base.',
          },
          character_count: {
            type: 'integer',
            description: 'Length of the prompt string in characters.',
          },
        },
        required: ['prompt', 'template_used', 'character_count'],
      },
    },
  ];
}

function promptBuilderUserPrompt(data: GeneratedPostData, visualTemplate: string) {
  return `Chart-ready data from Stage 3:
${JSON.stringify(data, null, 2)}

Visual template selected by Stage 2:
${visualTemplate || 'best_matching_template'}

Build the final GPT-image-2 prompt now. It must:
- Render only this one post.
- Preserve every label, value, hex color, title, subtitle, and footer exactly.
- Include canvas/safe-area instructions appropriate for the selected template.
- Include relevant typography, spacing, color, and composition constraints from design.md.
- Exclude unrelated design.md sections, other chart templates, and implementation notes.
- Avoid 3D bars, gradients, photorealistic scenes, invented logos, invented annotations, and invented sources unless the selected design template explicitly requires them.`;
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

  return {
    prompt: candidate.prompt,
    template_used: candidate.template_used,
    character_count:
      typeof candidate.character_count === 'number' && Number.isFinite(candidate.character_count)
        ? candidate.character_count
        : candidate.prompt.length,
  };
}

async function writeStage4PromptDiagnostics(
  runId: string,
  prompt: string,
  templateUsed: string,
  response: AnthropicResponse
) {
  const usage = response.usage || {};
  const overCap = prompt.length > HARD_CAP_CHARS;
  const meta = {
    template_used: templateUsed,
    prompt_length_chars: prompt.length,
    prompt_length_approx_tokens: approxTokens(prompt.length),
    gpt_image_2_max_chars: GPT_IMAGE_2_MAX_CHARS,
    our_hard_cap_chars: HARD_CAP_CHARS,
    over_cap: overCap,
    over_openai_limit: prompt.length > GPT_IMAGE_2_MAX_CHARS,
    first_500_chars: prompt.slice(0, 500),
    last_500_chars: prompt.slice(-500),
    sub_step_4a_input_tokens: numeric(usage.input_tokens),
    sub_step_4a_output_tokens: numeric(usage.output_tokens),
    sub_step_4a_cache_read_tokens: numeric(usage.cache_read_input_tokens),
  };
  const dir = debugDir(runId);

  await fs.mkdir(dir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(dir, 'stage_4_image_prompt.txt'), prompt, 'utf8'),
    fs.writeFile(path.join(dir, 'stage_4_image_prompt_meta.json'), JSON.stringify(meta, null, 2), 'utf8'),
  ]);

  return meta;
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

export async function buildImagePrompt(
  data: GeneratedPostData,
  visualTemplate: string,
  runId: string,
  options: BuildImagePromptOptions = {}
) {
  const callAnthropicWithResponse = options.callAnthropicWithResponse || defaultCallAnthropicWithResponse;
  const readMarkdown = options.readMarkdown || defaultReadMarkdown;
  const logSonnetUsage = options.logSonnetUsage || defaultLogSonnetUsage;
  const [base, design] = await Promise.all([readMarkdown('base'), readMarkdown('design')]);

  const { response } = await callAnthropicWithResponse(promptBuilderUserPrompt(data, visualTemplate), {
    system: stage4System(base, design),
    maxTokens: 4096,
    temperature: 0.1,
    tools: imagePromptTool(),
    toolChoice: { type: 'tool', name: TOOL_NAME },
  });
  logSonnetUsage('stage_4_prompt_build', runId, response);

  const toolInput = getToolInput(response);
  const filledPrompt = toolInput.prompt.trim();
  const meta = await writeStage4PromptDiagnostics(runId, filledPrompt, toolInput.template_used, response);

  if (meta.over_cap) {
    await logStage4PromptCapViolation(runId, filledPrompt, toolInput.template_used);
    throw new ImagePromptTooLongError(
      `Stage 4a produced a prompt of ${filledPrompt.length} chars, exceeding the ${HARD_CAP_CHARS} cap. ` +
        'This indicates a regression in template construction. See debug bundle.'
    );
  }

  return filledPrompt;
}
