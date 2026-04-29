import { describe, expect, it } from 'vitest';
import { normalizeGeneratedPostImage } from './image';

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
