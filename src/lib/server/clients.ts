function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export async function callAnthropic(prompt: string) {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
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
  const model = process.env.GROK_MODEL || 'grok-4-latest';
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
  });

  if (!response.ok) {
    throw new Error(`Grok request failed: ${response.status} ${await response.text()}`);
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
  const response = await fetch(`https://api.crustdata.com${normalizedEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-version': apiVersion,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Crustdata request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
