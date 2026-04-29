import { describe, expect, it } from 'vitest';
import { parseSonnetJson } from './parseSonnetJson';

describe('parseSonnetJson', () => {
  it('parses fenced JSON', () => {
    expect(parseSonnetJson<{ ok: boolean }>('```json\n{ "ok": true }\n```')).toEqual({ ok: true });
  });

  it('parses JSON with prose around it', () => {
    expect(parseSonnetJson<{ value: number }>('Here is the JSON:\n{ "value": 7 }\nDone.')).toEqual({ value: 7 });
  });

  it('reports parse context for malformed JSON', () => {
    expect(() => parseSonnetJson('{ "name": "Newsroom" "ok": true }')).toThrow(/cleaned text length=.*context=.*original error=/);
  });
});
