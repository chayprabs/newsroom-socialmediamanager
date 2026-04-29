import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOpenAiImageConfig } from './clients';

const ENV_KEYS = [
  'OPENAI_IMAGE_MODEL',
  'OPENAI_IMAGE_SIZE',
  'OPENAI_IMAGE_QUALITY',
  'OPENAI_IMAGE_FORMAT',
  'OPENAI_IMAGE_BACKGROUND',
  'OPENAI_IMAGE_EXPORT_SIZE',
  'OPENAI_IMAGE_SAFE_AREA',
] as const;

const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]])
);

function setImageEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const originalValue = originalEnv.get(key);
    if (originalValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalValue;
    }
  }

  vi.restoreAllMocks();
});

describe('getOpenAiImageConfig', () => {
  it('defaults to the GPT-image-2 portrait generation config', () => {
    setImageEnv({});

    expect(getOpenAiImageConfig()).toEqual({
      model: 'gpt-image-2',
      size: '1024x1536',
      quality: 'high',
      outputFormat: 'png',
      background: 'opaque',
      exportSize: '1080x1350',
      safeArea: '1024x1280',
      isLandscape: false,
    });
  });

  it('rejects custom non API-safe generation sizes', () => {
    setImageEnv({ OPENAI_IMAGE_SIZE: '1088x1360' });

    expect(() => getOpenAiImageConfig()).toThrow(/Do not use 1088x1360/);
  });

  it('uses landscape generation only for the TBPN-style template', () => {
    setImageEnv({ OPENAI_IMAGE_SIZE: '1024x1536' });

    expect(getOpenAiImageConfig('event_effect_multi_panel_line').size).toBe('1536x1024');
  });

  it('rejects landscape generation for normal portrait templates', () => {
    setImageEnv({ OPENAI_IMAGE_SIZE: '1536x1024' });

    expect(() => getOpenAiImageConfig('ranked_bar')).toThrow(/landscape-only/);
  });

  it('rejects a portrait safe area larger than the generation canvas', () => {
    setImageEnv({ OPENAI_IMAGE_SIZE: '1024x1024', OPENAI_IMAGE_SAFE_AREA: '1024x1280' });

    expect(() => getOpenAiImageConfig('ranked_bar')).toThrow(/must fit inside/);
  });

  it('validates quality, format, and background', () => {
    setImageEnv({ OPENAI_IMAGE_QUALITY: 'ultra' });
    expect(() => getOpenAiImageConfig()).toThrow(/OPENAI_IMAGE_QUALITY/);

    setImageEnv({ OPENAI_IMAGE_FORMAT: 'gif' });
    expect(() => getOpenAiImageConfig()).toThrow(/OPENAI_IMAGE_FORMAT/);

    setImageEnv({ OPENAI_IMAGE_BACKGROUND: 'checkerboard' });
    expect(() => getOpenAiImageConfig()).toThrow(/OPENAI_IMAGE_BACKGROUND/);
  });

  it('warns when background is not opaque', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setImageEnv({ OPENAI_IMAGE_BACKGROUND: 'auto' });

    expect(getOpenAiImageConfig().background).toBe('auto');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('designed for "opaque"'));
  });
});
