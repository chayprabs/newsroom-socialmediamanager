export function extractJsonObject<T>(text: string): T {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? text;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model response did not contain a JSON object.');
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
}
