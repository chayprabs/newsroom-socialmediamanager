import { describe, expect, it } from 'vitest';
import { parseSonnetJson } from './parseSonnetJson';

describe('parseSonnetJson', () => {
  it('parses fenced JSON', () => {
    expect(parseSonnetJson<{ ok: boolean }>('```json\n{ "ok": true }\n```')).toEqual({ ok: true });
  });

  it('parses JSON with prose around it', () => {
    expect(parseSonnetJson<{ value: number }>('Here is the JSON:\n{ "value": 7 }\nDone.')).toEqual({ value: 7 });
  });

  it('uses the last complete object when the model self-corrects after an earlier object', () => {
    expect(
      parseSonnetJson<{ value: number }>(
        '{ "value": 1, "caption": "[placeholder]" }\nWait - I need to correct that.\n{ "value": 2 }'
      )
    ).toEqual({ value: 2 });
  });

  it('does not treat braces inside strings as object boundaries', () => {
    expect(parseSonnetJson<{ text: string }>('Before { "text": "literal { brace } text" } after')).toEqual({
      text: 'literal { brace } text',
    });
  });

  it('reports parse context for malformed JSON', () => {
    expect(() => parseSonnetJson('{ "name": "Newsroom" "ok": true }')).toThrow(/cleaned text length=.*context=.*original error=/);
  });
});
