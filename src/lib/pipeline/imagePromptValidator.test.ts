import { describe, expect, it } from 'vitest';
import {
  CANVAS_SIZE,
  EXPORT_SIZE,
  MIN_DISTINCT_HEX_COLORS,
  REQUIRED_BACKGROUND_HEX,
  REQUIRED_EMPTY_FOOTER_ZONE_TEXT,
  REQUIRED_NO_DATA_FROM_TEXT,
  SAFE_AREA,
  extractHexColors,
  validateImagePrompt,
} from './imagePromptValidator';

const COMPLIANT_PROMPT = `Create a portrait social media post using the full available portrait canvas.
BACKGROUND: Solid lavender, exact hex ${REQUIRED_BACKGROUND_HEX}, full bleed, edge to edge.
HEADLINE: heavy-weight sans-serif, color #111111, ~58pt - do not crop or cut off any part of the headline.
BARS: solid #6B5BD9.
${REQUIRED_EMPTY_FOOTER_ZONE_TEXT} (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px) MUST be empty lavender background.
${REQUIRED_NO_DATA_FROM_TEXT} text. Do NOT render any Crustdata logo or wordmark.
Do NOT use rounded bar ends.`;

describe('extractHexColors', () => {
  it('returns distinct hex codes in order of first appearance, normalized to uppercase', () => {
    const colors = extractHexColors('a #abcdef b #ABCDEF c #112233 d #112233');

    expect(colors).toEqual(['#ABCDEF', '#112233']);
  });

  it('returns an empty array when no hex codes are present', () => {
    expect(extractHexColors('no hex here, just words')).toEqual([]);
  });
});

describe('validateImagePrompt', () => {
  it('returns valid: true for a fully compliant empty-footer-zone prompt', () => {
    const result = validateImagePrompt(COMPLIANT_PROMPT);

    expect(result.valid).toBe(true);
  });

  describe('required substring checks', () => {
    it('flags a missing background hex', () => {
      const result = validateImagePrompt(COMPLIANT_PROMPT.replace(REQUIRED_BACKGROUND_HEX, '#FFFFFF'));

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing).toContain(REQUIRED_BACKGROUND_HEX);
      }
    });

    it('accepts both "full bleed" and "full-bleed"', () => {
      const dashedPrompt = COMPLIANT_PROMPT.replace('full bleed', 'full-bleed');

      expect(validateImagePrompt(dashedPrompt).valid).toBe(true);
    });

    it('flags when neither "full bleed" nor "full-bleed" is present', () => {
      const result = validateImagePrompt(COMPLIANT_PROMPT.replace('full bleed', 'edge-to-edge background'));

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing.some((m) => m.toLowerCase().includes('full-bleed'))).toBe(true);
      }
    });

    it('flags a missing empty footer zone heading', () => {
      const result = validateImagePrompt(COMPLIANT_PROMPT.replace(REQUIRED_EMPTY_FOOTER_ZONE_TEXT, 'FOOTER AREA'));

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing).toContain(REQUIRED_EMPTY_FOOTER_ZONE_TEXT);
      }
    });

    it('flags a missing no Data from instruction', () => {
      const result = validateImagePrompt(COMPLIANT_PROMPT.replace(REQUIRED_NO_DATA_FROM_TEXT, 'Do not render footer'));

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing).toContain(REQUIRED_NO_DATA_FROM_TEXT);
      }
    });

    it('flags a missing bottom zone height instruction', () => {
      const result = validateImagePrompt(
        COMPLIANT_PROMPT.replaceAll('bottom 18%', 'lower area').replaceAll('bottom 276px', 'lower pixels')
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing.some((m) => m.includes('bottom 18% or bottom 276px'))).toBe(true);
      }
    });

    it('accepts each variant of the do-not-crop phrase', () => {
      const variants = ['do not crop', 'must not be cropped', 'not cropped'];
      for (const variant of variants) {
        const prompt = COMPLIANT_PROMPT.replace('do not crop or cut off any part of the headline', variant);
        const result = validateImagePrompt(prompt);
        expect(result.valid, `expected variant "${variant}" to be accepted`).toBe(true);
      }
    });

    it('flags when no do-not-crop variant is present', () => {
      const result = validateImagePrompt(
        COMPLIANT_PROMPT.replace('do not crop or cut off any part of the headline', 'visible headline')
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing.some((m) => m.toLowerCase().includes('do-not-crop'))).toBe(true);
      }
    });

    it('flags fewer than 3 distinct hex colors', () => {
      const sparsePrompt = `portrait ${REQUIRED_BACKGROUND_HEX} full bleed ${REQUIRED_EMPTY_FOOTER_ZONE_TEXT} ${REQUIRED_NO_DATA_FROM_TEXT} bottom 18% do not crop #111111`;

      const result = validateImagePrompt(sparsePrompt);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing.some((m) => m.includes(`at least ${MIN_DISTINCT_HEX_COLORS} distinct hex colors`))).toBe(true);
      }
    });

    it('flags a missing portrait layout instruction', () => {
      const result = validateImagePrompt(COMPLIANT_PROMPT.replaceAll('portrait', 'social'));

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing).toContain('portrait layout instruction');
      }
    });
  });

  describe('warnings (do not block)', () => {
    it('flags footer text and logo language', () => {
      const result = validateImagePrompt(COMPLIANT_PROMPT);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('"Data from:"'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('footer logo language'))).toBe(true);
    });

    it('flags paraphrase keywords stylish/modern/clean', () => {
      const prompt = `${COMPLIANT_PROMPT}\nUse a stylish modern clean look.`;

      const result = validateImagePrompt(prompt);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('"stylish"'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('"modern"'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('"clean"'))).toBe(true);
    });

    it('flags Crustdata-style, "in the Crustdata style", and "in the style of" phrases', () => {
      const a = validateImagePrompt(`${COMPLIANT_PROMPT}\nMake it Crustdata-style.`);
      const b = validateImagePrompt(`${COMPLIANT_PROMPT}\nDesign in the Crustdata style.`);
      const c = validateImagePrompt(`${COMPLIANT_PROMPT}\nDesign in the style of a clean lavender post.`);

      expect(a.warnings.some((w) => w.includes('Crustdata-style'))).toBe(true);
      expect(b.valid).toBe(true);
      expect(b.warnings.some((w) => w.includes('in the Crustdata style'))).toBe(true);
      expect(c.warnings.some((w) => w.includes('in the style of'))).toBe(true);
    });

    it('flags rainbow / varied colors / different colors', () => {
      const a = validateImagePrompt(`${COMPLIANT_PROMPT}\nBars use a rainbow palette.`);
      const b = validateImagePrompt(`${COMPLIANT_PROMPT}\nBars use varied colors.`);
      const c = validateImagePrompt(`${COMPLIANT_PROMPT}\nBars use different colors.`);

      expect(a.warnings.some((w) => w.includes('rainbow'))).toBe(true);
      expect(b.warnings.some((w) => w.includes('varied colors'))).toBe(true);
      expect(c.warnings.some((w) => w.includes('different colors'))).toBe(true);
    });

    it('flags bare "rounded" but not "no rounded" / "Do NOT use rounded"', () => {
      const bare = validateImagePrompt(`${COMPLIANT_PROMPT}\nThe bars are rounded.`);
      const negated = validateImagePrompt(COMPLIANT_PROMPT);
      const explicitNo = validateImagePrompt(`${COMPLIANT_PROMPT}\nNo rounded corners anywhere.`);

      expect(bare.warnings.some((w) => w.toLowerCase().includes('rounded'))).toBe(true);
      expect(negated.warnings.some((w) => w.toLowerCase().includes('rounded'))).toBe(false);
      expect(explicitNo.warnings.some((w) => w.toLowerCase().includes('rounded'))).toBe(false);
    });
  });

  describe('env wiring', () => {
    it('exposes the env-driven canvas, safe area, export size, and background mode constants', () => {
      expect(CANVAS_SIZE).toMatch(/^\d+x\d+$/);
      expect(SAFE_AREA).toMatch(/^\d+x\d+$/);
      expect(EXPORT_SIZE === 'auto' || /^\d+x\d+$/.test(EXPORT_SIZE)).toBe(true);
    });
  });
});
