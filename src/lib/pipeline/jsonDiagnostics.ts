import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AnthropicResponse } from '../server/clients';
import { extractJsonObject } from '../server/json';
import { getRunDir } from '../server/storage';

interface ParseFailureDiagnostic {
  stage: string;
  timestamp: string;
  parse_error_message: string;
  parse_error_position?: number;
  json_parse_error_position?: number;
  response_char_length: number;
  approximate_response_tokens: number;
  first_300_chars: string;
  last_300_chars: string;
  around_parse_error_position: string;
  stop_reason?: string;
  likely_causes: string[];
}

function debugDir(runId: string) {
  return path.join(getRunDir(runId), 'debug');
}

function safeStageName(stage: string) {
  return stage.replace(/[^a-z0-9_-]/gi, '_');
}

function parseJsonErrorPosition(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const match = error.message.match(/position\s+(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function getJsonCandidateOffset(text: string) {
  const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fencedMatch?.[1] ?? text;
  const candidateStart = fencedMatch?.index !== undefined ? fencedMatch.index + fencedMatch[0].indexOf(candidate) : 0;
  const firstBrace = candidate.indexOf('{');

  if (firstBrace === -1) {
    return 0;
  }

  return candidateStart + firstBrace;
}

function excerptAround(text: string, position?: number) {
  if (position === undefined || Number.isNaN(position)) {
    return '';
  }

  const start = Math.max(0, position - 150);
  const end = Math.min(text.length, position + 150);
  return text.slice(start, end);
}

function hasLineCommentOutsideString(text: string) {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length - 1; index += 1) {
    const char = text[index];
    const next = text[index + 1];

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

    if (!inString && char === '/' && next === '/') {
      return true;
    }
  }

  return false;
}

function hasTrailingCommaOutsideString(text: string) {
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

    if (!inString && char === ',') {
      const rest = text.slice(index + 1);
      const nextNonWhitespace = rest.match(/\S/)?.[0];
      if (nextNonWhitespace === ']' || nextNonWhitespace === '}') {
        return true;
      }
    }
  }

  return false;
}

function likelyUnescapedQuote(text: string, position?: number) {
  if (position === undefined) return false;
  const local = [position - 1, position, position + 1].find((index) => text[index] === '"');
  if (local === undefined) return false;
  const nextNonWhitespace = text.slice(local + 1).match(/\S/)?.[0];
  return Boolean(nextNonWhitespace && /[A-Za-z]/.test(nextNonWhitespace));
}

function likelyCauses(text: string, response: AnthropicResponse | undefined, position?: number) {
  const causes: string[] = [];
  const trimmed = text.trim();

  if (/^```(?:json)?/i.test(trimmed)) {
    causes.push('markdown_code_fence');
  }
  if (!trimmed.startsWith('{')) {
    causes.push('prose_preamble');
  }
  if (!trimmed.endsWith('}')) {
    causes.push('prose_postamble_or_truncation');
  }
  if (response?.stop_reason === 'max_tokens') {
    causes.push('truncated_by_max_tokens');
  }
  if (likelyUnescapedQuote(text, position)) {
    causes.push('likely_unescaped_quote_in_string');
  }
  if (hasLineCommentOutsideString(text) || hasTrailingCommaOutsideString(text)) {
    causes.push('javascript_style_invalid_json');
  }

  return causes;
}

async function writeParseFailure(stage: string, runId: string, text: string, error: unknown, response?: AnthropicResponse) {
  const stageName = safeStageName(stage);
  const jsonPosition = parseJsonErrorPosition(error);
  const rawPosition = jsonPosition === undefined ? undefined : getJsonCandidateOffset(text) + jsonPosition;
  const diagnostic: ParseFailureDiagnostic = {
    stage,
    timestamp: new Date().toISOString(),
    parse_error_message: error instanceof Error ? error.message : String(error),
    parse_error_position: rawPosition,
    json_parse_error_position: jsonPosition,
    response_char_length: text.length,
    approximate_response_tokens: Math.ceil(text.length / 4),
    first_300_chars: text.slice(0, 300),
    last_300_chars: text.slice(Math.max(0, text.length - 300)),
    around_parse_error_position: excerptAround(text, rawPosition),
    stop_reason: response?.stop_reason,
    likely_causes: likelyCauses(text, response, rawPosition),
  };

  const dir = debugDir(runId);
  await fs.mkdir(dir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(dir, `${stageName}_raw_response.txt`), text, 'utf8'),
    fs.writeFile(path.join(dir, `${stageName}_parse_failure.json`), JSON.stringify(diagnostic, null, 2), 'utf8'),
  ]);
}

export async function extractJsonObjectWithDiagnostics<T>(
  stage: string,
  runId: string,
  text: string,
  response?: AnthropicResponse
) {
  try {
    return extractJsonObject<T>(text);
  } catch (error) {
    try {
      await writeParseFailure(stage, runId, text, error, response);
    } catch (diagnosticError) {
      console.error(
        `[json-diagnostics] failed to write debug bundle for run=${runId} stage=${stage}: ${
          diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError)
        }`
      );
    }

    throw error;
  }
}
