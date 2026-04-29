import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GeneratedPostData } from '../types';
import type { AnthropicResponse } from '../server/clients';
import { getRunDir } from '../server/storage';
import {
  applyCanvasPlaceholders,
  BACKGROUND_MODE,
  buildImagePrompt,
  CANVAS_SIZE,
  EXPORT_SIZE,
  ImagePromptTooLongError,
  ImagePromptValidationError,
  SAFE_AREA,
} from './imagePromptBuilder';

const data: GeneratedPostData = {
  title: 'Hiring shifts toward AI infrastructure',
  subtitle: 'Indexed job postings by category',
  rows: [{ label: 'AI infrastructure', value: 42, color: '#111111' }],
  footer: 'Data from: Crustdata',
};

const createdRuns: string[] = [];

const COMPLIANT_PROMPT = `Create a ${CANVAS_SIZE} image. Content fits inside the ${SAFE_AREA} safe area.
BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge.
HEADLINE: heavy-weight sans-serif, color #111111, ~58pt — do not crop or cut off any part of the headline.
BARS: solid #6B5BD9.
FOOTER: "Data from:" 13pt #666666, small hexagonal cube logo #333333, "Data from: Crustdata".
Do NOT use rounded bar ends.`;

const INVALID_PROMPT = 'A short prompt with no canvas, no background, no footer, no do-not-crop, no hex colors.';

afterEach(async () => {
  await Promise.all(createdRuns.map((runId) => fs.rm(getRunDir(runId), { recursive: true, force: true })));
  createdRuns.length = 0;
});

function buildResponse(
  prompt: string,
  template = 'ranked_horizontal_bar',
  hexColors: string[] = ['#E8E6F5', '#111111', '#6B5BD9', '#666666', '#333333']
): AnthropicResponse {
  return {
    model: 'claude-sonnet-4-6',
    stop_reason: 'tool_use',
    content: [
      {
        type: 'tool_use',
        name: 'submit_image_prompt',
        input: {
          prompt,
          template_used: template,
          character_count: prompt.length,
          hex_colors_used: hexColors,
        },
      },
    ],
    usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 30 },
  };
}

describe('canvas env constants', () => {
  it('expose env-driven canvas dimensions and background mode', () => {
    expect(CANVAS_SIZE).toMatch(/^\d+x\d+$/);
    expect(SAFE_AREA).toMatch(/^\d+x\d+$/);
    expect(EXPORT_SIZE).toMatch(/^\d+x\d+$/);
    expect(typeof BACKGROUND_MODE).toBe('string');
    expect(BACKGROUND_MODE.length).toBeGreaterThan(0);
  });
});

describe('applyCanvasPlaceholders', () => {
  it('substitutes both long-form and short-form placeholders', () => {
    const text =
      'long={{OPENAI_IMAGE_SIZE}} safe_long={{OPENAI_IMAGE_SAFE_AREA}} export_long={{OPENAI_IMAGE_EXPORT_SIZE}} bg_long={{OPENAI_IMAGE_BACKGROUND}} ' +
      'short={{CANVAS_SIZE}} safe_short={{SAFE_AREA}} export_short={{EXPORT_SIZE}} bg_short={{BACKGROUND_MODE}}';

    const rendered = applyCanvasPlaceholders(text);

    expect(rendered).toContain(`long=${CANVAS_SIZE}`);
    expect(rendered).toContain(`safe_long=${SAFE_AREA}`);
    expect(rendered).toContain(`export_long=${EXPORT_SIZE}`);
    expect(rendered).toContain(`bg_long=${BACKGROUND_MODE}`);
    expect(rendered).toContain(`short=${CANVAS_SIZE}`);
    expect(rendered).toContain(`safe_short=${SAFE_AREA}`);
    expect(rendered).toContain(`export_short=${EXPORT_SIZE}`);
    expect(rendered).toContain(`bg_short=${BACKGROUND_MODE}`);
    expect(rendered).not.toContain('{{');
  });
});

describe('buildImagePrompt validation flow', () => {
  it('returns the prompt on the first attempt when Stage 4a is compliant', async () => {
    const runId = `test-stage-4-ok-${randomUUID()}`;
    createdRuns.push(runId);
    let calls = 0;

    const prompt = await buildImagePrompt(data, 'ranked_horizontal_bar', runId, {
      callAnthropicWithResponse: async () => {
        calls += 1;
        return { text: '', response: buildResponse(COMPLIANT_PROMPT) };
      },
      readMarkdown: async () => 'cached markdown',
      logSonnetUsage: () => undefined,
    });

    expect(prompt).toBe(COMPLIANT_PROMPT);
    expect(calls).toBe(1);

    const debugDir = path.join(getRunDir(runId), 'debug');
    const meta = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4_image_prompt_meta.json'), 'utf8')
    ) as {
      validation_ok: boolean;
      validation_attempts: number;
      canvas_size: string;
      safe_area: string;
      export_size: string;
      background_mode: string;
      hex_colors_used: string[];
    };

    expect(meta.validation_ok).toBe(true);
    expect(meta.validation_attempts).toBe(1);
    expect(meta.canvas_size).toBe(CANVAS_SIZE);
    expect(meta.safe_area).toBe(SAFE_AREA);
    expect(meta.export_size).toBe(EXPORT_SIZE);
    expect(meta.background_mode).toBe(BACKGROUND_MODE);
    expect(meta.hex_colors_used).toContain('#E8E6F5');

    await expect(fs.access(path.join(debugDir, 'stage_4a_validation_failure_1.json'))).rejects.toBeTruthy();
  });

  it('captures env snapshot, attempt prompt, and validation result on a successful first attempt', async () => {
    const runId = `test-stage-4-diagnostics-${randomUUID()}`;
    createdRuns.push(runId);

    await buildImagePrompt(data, 'ranked_horizontal_bar', runId, {
      callAnthropicWithResponse: async () => ({ text: '', response: buildResponse(COMPLIANT_PROMPT) }),
      readMarkdown: async () => 'cached markdown',
      logSonnetUsage: () => undefined,
    });

    const debugDir = path.join(getRunDir(runId), 'debug');

    const envSnapshot = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4a_env_snapshot.json'), 'utf8')
    ) as {
      captured_at: string;
      raw_env: Record<string, string>;
      resolved: { CANVAS_SIZE: string; SAFE_AREA: string; EXPORT_SIZE: string; BACKGROUND_MODE: string };
    };

    expect(typeof envSnapshot.captured_at).toBe('string');
    expect(envSnapshot.captured_at.length).toBeGreaterThan(0);
    expect(envSnapshot.resolved).toEqual({
      CANVAS_SIZE,
      SAFE_AREA,
      EXPORT_SIZE,
      BACKGROUND_MODE,
    });
    for (const key of Object.keys(envSnapshot.raw_env)) {
      expect(key.startsWith('OPENAI_IMAGE_')).toBe(true);
    }

    const attempt1 = await fs.readFile(path.join(debugDir, 'stage_4a_attempt_1.txt'), 'utf8');
    expect(attempt1).toBe(COMPLIANT_PROMPT);
    await expect(fs.access(path.join(debugDir, 'stage_4a_attempt_2.txt'))).rejects.toBeTruthy();

    const validationResult = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4a_validation_result.json'), 'utf8')
    ) as {
      template_used: string;
      total_attempts: number;
      final: { valid: boolean; missing: string[]; warnings: string[] } | null;
      attempt_history: Array<{ attempt: number; valid: boolean; missing: string[]; warnings: string[] }>;
    };

    expect(validationResult.template_used).toBe('ranked_horizontal_bar');
    expect(validationResult.total_attempts).toBe(1);
    expect(validationResult.final).toEqual({ valid: true, missing: [], warnings: [] });
    expect(validationResult.attempt_history).toHaveLength(1);
    expect(validationResult.attempt_history[0].attempt).toBe(1);
    expect(validationResult.attempt_history[0].valid).toBe(true);
  });

  it('persists warnings in the validation result even when validation passes', async () => {
    const runId = `test-stage-4-warnings-${randomUUID()}`;
    createdRuns.push(runId);
    const warnPrompt = `${COMPLIANT_PROMPT}\nUse a stylish modern look.`;

    await buildImagePrompt(data, 'ranked_horizontal_bar', runId, {
      callAnthropicWithResponse: async () => ({ text: '', response: buildResponse(warnPrompt) }),
      readMarkdown: async () => 'cached markdown',
      logSonnetUsage: () => undefined,
    });

    const validationResult = JSON.parse(
      await fs.readFile(
        path.join(getRunDir(runId), 'debug', 'stage_4a_validation_result.json'),
        'utf8'
      )
    ) as { final: { valid: boolean; warnings: string[] }; attempt_history: Array<{ warnings: string[] }> };

    expect(validationResult.final?.valid).toBe(true);
    expect(validationResult.final?.warnings.length).toBeGreaterThan(0);
    expect(validationResult.attempt_history[0].warnings.length).toBeGreaterThan(0);
  });

  it('retries with a corrective system message and succeeds on attempt 2', async () => {
    const runId = `test-stage-4-retry-${randomUUID()}`;
    createdRuns.push(runId);
    const responses = [buildResponse(INVALID_PROMPT, 'ranked_horizontal_bar', []), buildResponse(COMPLIANT_PROMPT)];
    const systemSnapshots: unknown[] = [];

    const prompt = await buildImagePrompt(data, 'ranked_horizontal_bar', runId, {
      callAnthropicWithResponse: async (_userPrompt, opts) => {
        systemSnapshots.push(opts?.system);
        const next = responses.shift();
        if (!next) throw new Error('Unexpected extra Anthropic call');
        return { text: '', response: next };
      },
      readMarkdown: async () => 'cached markdown',
      logSonnetUsage: () => undefined,
    });

    expect(prompt).toBe(COMPLIANT_PROMPT);
    expect(systemSnapshots).toHaveLength(2);
    expect(JSON.stringify(systemSnapshots[0])).not.toContain('Your previous prompt was missing');
    expect(JSON.stringify(systemSnapshots[1])).toContain('Your previous prompt was missing these required elements');

    const debugDir = path.join(getRunDir(runId), 'debug');
    const failure = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4a_validation_failure_1.json'), 'utf8')
    ) as {
      attempt: number;
      template_used: string;
      validation: { valid: boolean; missing: string[] };
      prompt: string;
    };

    expect(failure.attempt).toBe(1);
    expect(failure.validation.valid).toBe(false);
    expect(failure.validation.missing.length).toBeGreaterThan(0);
    expect(failure.prompt).toBe(INVALID_PROMPT);
    expect(failure.template_used).toBe('ranked_horizontal_bar');

    const meta = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4_image_prompt_meta.json'), 'utf8')
    ) as { validation_ok: boolean; validation_attempts: number };

    expect(meta.validation_ok).toBe(true);
    expect(meta.validation_attempts).toBe(2);

    const attempt1 = await fs.readFile(path.join(debugDir, 'stage_4a_attempt_1.txt'), 'utf8');
    const attempt2 = await fs.readFile(path.join(debugDir, 'stage_4a_attempt_2.txt'), 'utf8');
    expect(attempt1).toBe(INVALID_PROMPT);
    expect(attempt2).toBe(COMPLIANT_PROMPT);

    const validationResult = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4a_validation_result.json'), 'utf8')
    ) as {
      total_attempts: number;
      final: { valid: boolean } | null;
      attempt_history: Array<{ attempt: number; valid: boolean; missing: string[] }>;
    };

    expect(validationResult.total_attempts).toBe(2);
    expect(validationResult.final?.valid).toBe(true);
    expect(validationResult.attempt_history.map((entry) => entry.valid)).toEqual([false, true]);
    expect(validationResult.attempt_history[0].missing.length).toBeGreaterThan(0);
  });

  it('throws ImagePromptValidationError after 3 failed attempts and preserves all debug bundles', async () => {
    const runId = `test-stage-4-fail-${randomUUID()}`;
    createdRuns.push(runId);
    let calls = 0;

    await expect(
      buildImagePrompt(data, 'ranked_horizontal_bar', runId, {
        callAnthropicWithResponse: async () => {
          calls += 1;
          return { text: '', response: buildResponse(INVALID_PROMPT, 'ranked_horizontal_bar', []) };
        },
        readMarkdown: async () => 'cached markdown',
        logSonnetUsage: () => undefined,
      })
    ).rejects.toBeInstanceOf(ImagePromptValidationError);

    expect(calls).toBe(3);

    const debugDir = path.join(getRunDir(runId), 'debug');
    for (const attempt of [1, 2, 3]) {
      const bundle = JSON.parse(
        await fs.readFile(path.join(debugDir, `stage_4a_validation_failure_${attempt}.json`), 'utf8')
      ) as { attempt: number; validation: { valid: boolean; missing: string[] } };
      expect(bundle.attempt).toBe(attempt);
      expect(bundle.validation.valid).toBe(false);
      expect(bundle.validation.missing.length).toBeGreaterThan(0);

      const attemptText = await fs.readFile(path.join(debugDir, `stage_4a_attempt_${attempt}.txt`), 'utf8');
      expect(attemptText).toBe(INVALID_PROMPT);
    }

    const meta = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4_image_prompt_meta.json'), 'utf8')
    ) as { validation_ok: boolean; validation_attempts: number };

    expect(meta.validation_ok).toBe(false);
    expect(meta.validation_attempts).toBe(3);

    const validationResult = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4a_validation_result.json'), 'utf8')
    ) as {
      total_attempts: number;
      final: { valid: boolean; missing: string[] } | null;
      attempt_history: Array<{ attempt: number; valid: boolean }>;
    };

    expect(validationResult.total_attempts).toBe(3);
    expect(validationResult.final?.valid).toBe(false);
    expect(validationResult.final?.missing.length).toBeGreaterThan(0);
    expect(validationResult.attempt_history).toHaveLength(3);
    expect(validationResult.attempt_history.map((entry) => entry.valid)).toEqual([false, false, false]);

    const envSnapshot = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4a_env_snapshot.json'), 'utf8')
    ) as { resolved: { CANVAS_SIZE: string; SAFE_AREA: string } };
    expect(envSnapshot.resolved.CANVAS_SIZE).toBe(CANVAS_SIZE);
    expect(envSnapshot.resolved.SAFE_AREA).toBe(SAFE_AREA);
  });

  it('checks the hard cap only AFTER validation passes', async () => {
    const runId = `test-stage-4-cap-${randomUUID()}`;
    createdRuns.push(runId);
    // Build a 26000-char prompt that includes every required validation element.
    const padding = 'x'.repeat(26000 - COMPLIANT_PROMPT.length);
    const longCompliantPrompt = `${COMPLIANT_PROMPT}\n${padding}`;

    await expect(
      buildImagePrompt(data, 'ranked_horizontal_bar', runId, {
        callAnthropicWithResponse: async () => ({ text: '', response: buildResponse(longCompliantPrompt) }),
        readMarkdown: async () => 'cached markdown',
        logSonnetUsage: () => undefined,
      })
    ).rejects.toBeInstanceOf(ImagePromptTooLongError);

    const meta = JSON.parse(
      await fs.readFile(path.join(getRunDir(runId), 'debug', 'stage_4_image_prompt_meta.json'), 'utf8')
    ) as { over_cap: boolean; validation_ok: boolean; prompt_length_chars: number };

    expect(meta.over_cap).toBe(true);
    expect(meta.validation_ok).toBe(true);
    expect(meta.prompt_length_chars).toBeGreaterThanOrEqual(25001);
  });
});
