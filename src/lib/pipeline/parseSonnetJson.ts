function parseJsonErrorPosition(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const match = error.message.match(/position\s+(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function stripMarkdownFence(rawText: string) {
  let cleaned = rawText.trim();

  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').trimStart();

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3).trimEnd();
  }

  return cleaned;
}

function contextAround(text: string, position?: number) {
  if (position === undefined || Number.isNaN(position)) return '';
  const start = Math.max(0, position - 100);
  const end = Math.min(text.length, position + 100);
  return text.slice(start, end);
}

function collectJsonObjectCandidates(text: string) {
  const candidates: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        candidates.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return candidates;
}

export function parseSonnetJson<T = unknown>(rawText: string): T {
  const cleaned = stripMarkdownFence(rawText);
  const candidates = collectJsonObjectCandidates(cleaned);

  if (!candidates.length) {
    throw new Error(
      `Sonnet JSON parse failed: cleaned text length=${cleaned.length}; parse error position=unknown; context="${cleaned.slice(
        0,
        200
      )}"; original error=Model response did not contain a complete JSON object.`
    );
  }

  let lastError: unknown;
  let lastJsonText = candidates[candidates.length - 1];

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const jsonText = candidates[index];
    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      lastError = error;
      lastJsonText = jsonText;
    }
  }

  const position = parseJsonErrorPosition(lastError);
  throw new Error(
    `Sonnet JSON parse failed: cleaned text length=${lastJsonText.length}; parse error position=${
      position ?? 'unknown'
    }; context="${contextAround(lastJsonText, position)}"; original error=${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
