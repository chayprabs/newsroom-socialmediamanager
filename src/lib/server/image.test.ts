import { describe, expect, it } from 'vitest';
import { normalizeGeneratedPostImage, renderPostSvg } from './image';

describe('normalizeGeneratedPostImage', () => {
  it('resizes the full portrait image without cropping to a safe area', async () => {
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

  it('preserves native generated dimensions when export size is auto', async () => {
    const sharp = (await import('sharp')).default;
    const source = await sharp({
      create: {
        width: 1024,
        height: 1536,
        channels: 4,
        background: '#E8E6F5',
      },
    })
      .png()
      .toBuffer();

    const exported = await normalizeGeneratedPostImage(source, {
      generationSize: '1024x1536',
      exportSize: 'auto',
      safeArea: '1024x1280',
      outputFormat: 'png',
      background: 'opaque',
    });
    const metadata = await sharp(exported).metadata();

    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(1536);
  });
});

describe('renderPostSvg', () => {
  it('uses the Crustdata lavender fallback style with sharp bars and branded footer', () => {
    const svg = renderPostSvg({
      title: 'OpenAI alumni destinations',
      subtitle: 'Former OpenAI employees by current employer',
      rows: [
        { label: 'Anthropic', value: 22, color: '#FF0000' },
        { label: 'Google DeepMind', value: 9, color: '#00FF00' },
        { label: 'Amazon', value: 8, color: '#0000FF' },
      ],
      footer: 'A custom footer that should not replace the required brand footer',
    });

    expect(svg).toContain('fill="#E8E6F5"');
    expect(svg).toContain('fill="#6B5BD9"');
    expect(svg).toContain('Data from:');
    expect(svg).toContain('Crustdata');
    expect(svg).toContain('fill="#333333"');
    expect(svg).not.toContain('fill="#FFFFFF"');
    expect(svg).not.toContain('fill="#F8F8F8"');
    expect(svg).not.toContain('rx=');
    expect(svg).not.toContain('A custom footer');
  });
});
