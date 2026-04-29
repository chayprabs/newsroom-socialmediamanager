import { getCachedValue, setCachedValue } from './cache';
import {
  type ImageBackground,
  type ImageOutputFormat,
  isLandscapeImageTemplate,
  parseImageDimensions,
} from './image';

type OpenAiImageFormat = ImageOutputFormat;
type OpenAiImageQuality = 'low' | 'medium' | 'high' | 'auto';
type AnthropicCacheControl = {
  type: 'ephemeral';
  ttl?: '5m' | '1h';
};

export type AnthropicTextBlock = {
  type: 'text';
  text: string;
  cache_control?: AnthropicCacheControl;
};

export interface AnthropicResponse {
  id?: string;
  type?: string;
  role?: string;
  model?: string;
  content?: Array<{
    type: string;
    text?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

type AnthropicCallOptions = {
  system?: AnthropicTextBlock[];
};

const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-2';
const DEFAULT_OPENAI_IMAGE_SIZE = '1024x1536';
const LANDSCAPE_OPENAI_IMAGE_SIZE = '1536x1024';
const DEFAULT_OPENAI_IMAGE_QUALITY = 'high';
const DEFAULT_OPENAI_IMAGE_FORMAT = 'png';
const DEFAULT_OPENAI_IMAGE_BACKGROUND = 'opaque';
const DEFAULT_OPENAI_IMAGE_EXPORT_SIZE = '1080x1350';
const DEFAULT_OPENAI_IMAGE_SAFE_AREA = '1024x1280';
const API_SAFE_IMAGE_SIZES = new Set(['1024x1024', '1024x1536', '1536x1024']);
const OPENAI_IMAGE_QUALITIES = new Set<OpenAiImageQuality>(['low', 'medium', 'high', 'auto']);
const OPENAI_IMAGE_FORMATS = new Set<OpenAiImageFormat>(['png', 'webp', 'jpeg']);
const OPENAI_IMAGE_BACKGROUNDS = new Set<ImageBackground>(['opaque', 'transparent', 'auto']);

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function truncate(value: string) {
  return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
}

function shouldRetry(status: number) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, label: string, attempts = 3, timeoutMs?: number) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (timeout) clearTimeout(timeout);

      if (response.ok || !shouldRetry(response.status) || attempt === attempts) {
        return response;
      }

      await wait(700 * attempt);
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      lastError = error;
      if (attempt === attempts) {
        throw new Error(`${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      await wait(700 * attempt);
    }
  }

  throw new Error(`${label} request failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function callAnthropicWithResponse(prompt: string, options: AnthropicCallOptions = {}) {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.2,
      ...(options.system?.length ? { system: options.system } : {}),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  }, 'Anthropic');

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status} ${truncate(await response.text())}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content
    ?.filter((part): part is { type: string; text: string } => part.type === 'text' && typeof part.text === 'string')
    ?.map((part) => part.text)
    ?.join('\n');

  if (!text) {
    throw new Error('Anthropic response did not include text content.');
  }

  return { text: text as string, response: data };
}

export async function callAnthropic(prompt: string, options: AnthropicCallOptions = {}) {
  const { text } = await callAnthropicWithResponse(prompt, options);
  return text;
}

export function isOpenAiImageConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getOpenAiImageQuality(): OpenAiImageQuality {
  const quality = process.env.OPENAI_IMAGE_QUALITY || DEFAULT_OPENAI_IMAGE_QUALITY;

  if (OPENAI_IMAGE_QUALITIES.has(quality as OpenAiImageQuality)) {
    return quality as OpenAiImageQuality;
  }

  throw new Error(`OPENAI_IMAGE_QUALITY must be one of low, medium, high, or auto. Received "${quality}".`);
}

function getOpenAiImageFormat(): OpenAiImageFormat {
  const format = process.env.OPENAI_IMAGE_FORMAT || DEFAULT_OPENAI_IMAGE_FORMAT;

  if (OPENAI_IMAGE_FORMATS.has(format as OpenAiImageFormat)) {
    return format as OpenAiImageFormat;
  }

  throw new Error(`OPENAI_IMAGE_FORMAT must be one of png, jpeg, or webp. Received "${format}".`);
}

function getOpenAiImageBackground(): ImageBackground {
  const background = process.env.OPENAI_IMAGE_BACKGROUND || DEFAULT_OPENAI_IMAGE_BACKGROUND;

  if (!OPENAI_IMAGE_BACKGROUNDS.has(background as ImageBackground)) {
    throw new Error(
      `OPENAI_IMAGE_BACKGROUND must be one of opaque, transparent, or auto. Received "${background}".`
    );
  }

  if (background !== 'opaque') {
    console.warn(`OPENAI_IMAGE_BACKGROUND is "${background}". Newsroom post exports are designed for "opaque".`);
  }

  return background as ImageBackground;
}

function getOpenAiImageSize(template = '') {
  const isLandscape = isLandscapeImageTemplate(template);
  const size = isLandscape ? LANDSCAPE_OPENAI_IMAGE_SIZE : process.env.OPENAI_IMAGE_SIZE || DEFAULT_OPENAI_IMAGE_SIZE;

  if (!API_SAFE_IMAGE_SIZES.has(size)) {
    throw new Error(
      `OPENAI_IMAGE_SIZE must be an API-safe generation size for this project: 1024x1024, 1024x1536, or 1536x1024. Received "${size}". Do not use 1088x1360 as the API generation size.`
    );
  }

  if (!isLandscape && size === LANDSCAPE_OPENAI_IMAGE_SIZE) {
    throw new Error(
      `OPENAI_IMAGE_SIZE=${LANDSCAPE_OPENAI_IMAGE_SIZE} is landscape-only. Landscape generation is only allowed for event_effect_multi_panel_line.`
    );
  }

  return size;
}

function mimeTypeForFormat(format: OpenAiImageFormat) {
  if (format === 'webp') return 'image/webp';
  if (format === 'jpeg') return 'image/jpeg';
  return 'image/png';
}

export function getOpenAiImageConfig(template = '') {
  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL;
  const size = getOpenAiImageSize(template);
  const quality = getOpenAiImageQuality();
  const outputFormat = getOpenAiImageFormat();
  const background = getOpenAiImageBackground();
  const exportSize = process.env.OPENAI_IMAGE_EXPORT_SIZE || DEFAULT_OPENAI_IMAGE_EXPORT_SIZE;
  const safeArea = process.env.OPENAI_IMAGE_SAFE_AREA || DEFAULT_OPENAI_IMAGE_SAFE_AREA;
  const isLandscape = isLandscapeImageTemplate(template);
  const generationDimensions = parseImageDimensions(size, 'OPENAI_IMAGE_SIZE');
  const safeAreaDimensions = parseImageDimensions(safeArea, 'OPENAI_IMAGE_SAFE_AREA');

  parseImageDimensions(exportSize, 'OPENAI_IMAGE_EXPORT_SIZE');

  if (!isLandscape && (safeAreaDimensions.width > generationDimensions.width || safeAreaDimensions.height > generationDimensions.height)) {
    throw new Error(`OPENAI_IMAGE_SAFE_AREA (${safeArea}) must fit inside OPENAI_IMAGE_SIZE (${size}).`);
  }

  return {
    model,
    size,
    quality,
    outputFormat,
    background,
    exportSize,
    safeArea,
    isLandscape,
  };
}

type OpenAiImageGenerationOptions = {
  template?: string;
};

export async function generateOpenAiImage(prompt: string, options: OpenAiImageGenerationOptions = {}) {
  const apiKey = requireEnv('OPENAI_API_KEY');
  const config = getOpenAiImageConfig(options.template);

  const response = await fetchWithRetry('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      size: config.size,
      quality: config.quality,
      output_format: config.outputFormat,
      background: config.background,
    }),
  }, 'OpenAI image generation');

  if (!response.ok) {
    throw new Error(
      `OpenAI image generation failed for model "${config.model}": ${response.status} ${truncate(await response.text())}`
    );
  }

  const data = await response.json();
  const image = data.data?.[0];
  const b64Json = image?.b64_json;

  if (!b64Json) {
    throw new Error('OpenAI image generation did not return base64 image data.');
  }

  return {
    buffer: Buffer.from(b64Json, 'base64'),
    extension: config.outputFormat === 'jpeg' ? 'jpg' : config.outputFormat,
    mimeType: mimeTypeForFormat(config.outputFormat),
    model: config.model,
    size: config.size,
    quality: config.quality,
    outputFormat: config.outputFormat,
    background: config.background,
    exportSize: config.exportSize,
    safeArea: config.safeArea,
    isLandscape: config.isLandscape,
    revisedPrompt: image.revised_prompt as string | undefined,
  };
}

export async function callGrok(prompt: string) {
  const apiKey = requireEnv('GROK_API_KEY');
  const model = process.env.GROK_MODEL || 'grok-4.20-reasoning';
  const response = await fetchWithRetry('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'Return concise, valid JSON only. Do not include markdown fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  }, 'Grok', 1);

  if (!response.ok) {
    throw new Error(`Grok request failed: ${response.status} ${truncate(await response.text())}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Grok response did not include message content.');
  }

  return text as string;
}

export async function callCrustdata(endpoint: string, params: Record<string, unknown>) {
  const apiKey = requireEnv('CRUSTDATA_API_KEY');
  const apiVersion = requireEnv('CRUSTDATA_API_VERSION');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cacheInput = { endpoint: normalizedEndpoint, apiVersion, params };
  const cache = process.env.NEWSROOM_DISABLE_API_CACHE === '1'
    ? { hit: false as const, key: '', cachePath: '' }
    : await getCachedValue<unknown>(normalizedEndpoint, cacheInput);

  if (cache.hit) {
    return cache.value;
  }

  const response = await fetchWithRetry(`https://api.crustdata.com${normalizedEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-version': apiVersion,
    },
    body: JSON.stringify(params),
  }, 'Crustdata');

  if (!response.ok) {
    throw new Error(`Crustdata request failed: ${response.status} ${truncate(await response.text())}`);
  }

  const data = await response.json();
  if (cache.cachePath && cache.key) {
    await setCachedValue(cache.cachePath, cache.key, data);
  }

  return data;
}
