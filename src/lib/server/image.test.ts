import { describe, expect, it } from 'vitest';
import type { GeneratedPostData } from '../types';
import {
  PORTRAIT_SAFE_AREA_INSTRUCTION,
  buildPostImagePrompt,
  normalizeGeneratedPostImage,
} from './image';

const postData: GeneratedPostData = {
  title: 'Hiring shifts toward AI infrastructure',
  subtitle: 'Indexed job postings by category',
  rows: [{ label: 'AI infrastructure', value: 42 }],
  footer: 'Data from: Crustdata',
};

describe('buildPostImagePrompt', () => {
  it('adds the portrait safe-area instruction to portrait templates', () => {
    const prompt = buildPostImagePrompt(postData, 'base', 'design', 'ranked_bar', 'caption');

    expect(prompt).toContain(PORTRAIT_SAFE_AREA_INSTRUCTION);
    expect(prompt).toContain('Create a polished vertical social media data post image for Newsroom.');
  });

  it('does not add portrait crop instructions to the landscape exception', () => {
    const prompt = buildPostImagePrompt(
      postData,
      'base',
      'design',
      'event_effect_multi_panel_line',
      'caption'
    );

    expect(prompt).not.toContain(PORTRAIT_SAFE_AREA_INSTRUCTION);
    expect(prompt).toContain('Create a polished landscape social media data post image for Newsroom.');
  });
});

describe('normalizeGeneratedPostImage', () => {
  it('exports the centered portrait safe area to 4:5', async () => {
    const sharp = (await import('sharp')).default;
    const source = await sharp({
      create: {
        width: 1024,
        height: 1536,
        channels: 4,
        background: '#E8E6F5',
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 1024,
              height: 1280,
              channels: 4,
              background: '#FFFFFF',
            },
          },
          left: 0,
          top: 128,
        },
      ])
      .png()
      .toBuffer();

    const exported = await normalizeGeneratedPostImage(source, {
      generationSize: '1024x1536',
      exportSize: '1080x1350',
      safeArea: '1024x1280',
      outputFormat: 'png',
      background: 'opaque',
    });
    const metadata = await sharp(exported).metadata();

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1350);
  });
});
