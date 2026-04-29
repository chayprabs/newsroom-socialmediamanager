import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GeneratedPostData } from '../types';
import type { AnthropicResponse } from '../server/clients';
import { getRunDir } from '../server/storage';
import { buildImagePrompt, ImagePromptTooLongError } from './imagePromptBuilder';

const data: GeneratedPostData = {
  title: 'Hiring shifts toward AI infrastructure',
  subtitle: 'Indexed job postings by category',
  rows: [{ label: 'AI infrastructure', value: 42, color: '#111111' }],
  footer: 'Data from: Crustdata',
};

const createdRuns: string[] = [];

afterEach(async () => {
  await Promise.all(createdRuns.map((runId) => fs.rm(getRunDir(runId), { recursive: true, force: true })));
  createdRuns.length = 0;
});

describe('buildImagePrompt', () => {
  it('throws and captures diagnostics when Stage 4a exceeds the hard cap', async () => {
    const runId = `test-stage-4-cap-${randomUUID()}`;
    createdRuns.push(runId);
    const longPrompt = 'x'.repeat(30000);
    const response: AnthropicResponse = {
      model: 'claude-sonnet-4-6',
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          name: 'submit_image_prompt',
          input: {
            prompt: longPrompt,
            template_used: 'ranked_horizontal_bar',
            character_count: longPrompt.length,
          },
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        cache_read_input_tokens: 30,
      },
    };

    await expect(
      buildImagePrompt(data, 'ranked_horizontal_bar', runId, {
        callAnthropicWithResponse: async () => ({ text: '', response }),
        readMarkdown: async () => 'cached markdown',
        logSonnetUsage: () => undefined,
      })
    ).rejects.toBeInstanceOf(ImagePromptTooLongError);

    const debugDir = path.join(getRunDir(runId), 'debug');
    const prompt = await fs.readFile(path.join(debugDir, 'stage_4_image_prompt.txt'), 'utf8');
    const meta = JSON.parse(
      await fs.readFile(path.join(debugDir, 'stage_4_image_prompt_meta.json'), 'utf8')
    ) as { over_cap: boolean; prompt_length_chars: number };

    expect(prompt).toHaveLength(30000);
    expect(meta.over_cap).toBe(true);
    expect(meta.prompt_length_chars).toBe(30000);
  });
});
