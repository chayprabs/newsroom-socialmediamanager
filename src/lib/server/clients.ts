import { getCachedValue, setCachedValue } from './cache';

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

async function fetchWithRetry(url: string, init: RequestInit, label: string, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok || !shouldRetry(response.status) || attempt === attempts) {
        return response;
      }

      await wait(700 * attempt);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === attempts) {
        throw new Error(`${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      await wait(700 * attempt);
    }
  }

  throw new Error(`${label} request failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function callAnthropic(prompt: string) {
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

  const data = await response.json();
  const text = data.content
    ?.filter((part: { type: string }) => part.type === 'text')
    ?.map((part: { text: string }) => part.text)
    ?.join('\n');

  if (!text) {
    throw new Error('Anthropic response did not include text content.');
  }

  return text as string;
}

export async function callGrok(prompt: string) {
  const apiKey = requireEnv('GROK_API_KEY');
  const model = process.env.GROK_MODEL || 'grok-4.20';
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
  }, 'Grok');

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
