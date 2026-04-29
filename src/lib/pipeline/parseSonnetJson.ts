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

export function parseSonnetJson<T = unknown>(rawText: string): T {
  const cleaned = stripMarkdownFence(rawText);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(
      `Sonnet JSON parse failed: cleaned text length=${cleaned.length}; parse error position=unknown; context="${cleaned.slice(
        0,
        200
      )}"; original error=Model response did not contain a complete JSON object.`
    );
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonText) as T;
  } catch (error) {
    const position = parseJsonErrorPosition(error);
    throw new Error(
      `Sonnet JSON parse failed: cleaned text length=${jsonText.length}; parse error position=${
        position ?? 'unknown'
      }; context="${contextAround(jsonText, position)}"; original error=${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
