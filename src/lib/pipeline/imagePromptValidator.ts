/**
 * Stage 4a prompt validator.
 *
 * Runs after Sonnet returns the filled GPT-image-2 prompt and BEFORE the hard-cap check.
 * Required substrings block (cause a retry); soft warnings are logged but do not block.
 *
 * Canvas/export env values are still surfaced for diagnostics, but validation now checks
 * for an empty footer zone contract instead of asking GPT-image-2 to render brand footer
 * text or logo assets. Stage 4c composites the real footer after image generation.
 */

const DEFAULT_CANVAS_SIZE = '1024x1536';
const DEFAULT_SAFE_AREA = '1024x1280';
const DEFAULT_EXPORT_SIZE = '1080x1350';
const DEFAULT_BACKGROUND_MODE = 'opaque';

export const CANVAS_SIZE = process.env.OPENAI_IMAGE_SIZE ?? DEFAULT_CANVAS_SIZE;
export const SAFE_AREA = process.env.OPENAI_IMAGE_SAFE_AREA ?? DEFAULT_SAFE_AREA;
export const EXPORT_SIZE = process.env.OPENAI_IMAGE_EXPORT_SIZE ?? DEFAULT_EXPORT_SIZE;
export const BACKGROUND_MODE = process.env.OPENAI_IMAGE_BACKGROUND ?? DEFAULT_BACKGROUND_MODE;

export const REQUIRED_BACKGROUND_HEX = '#E8E6F5';
export const REQUIRED_EMPTY_FOOTER_ZONE_TEXT = 'EMPTY FOOTER ZONE';
export const REQUIRED_NO_DATA_FROM_TEXT = 'Do NOT render "Data from:"';
export const MIN_DISTINCT_HEX_COLORS = 3;

const HEX_COLOR_REGEX = /#[0-9A-Fa-f]{6}/g;
const FULL_BLEED_RE = /full[-\s]bleed/i;
const DO_NOT_CROP_RE = /(do not crop|must not be cropped|not cropped)/i;
const PORTRAIT_RE = /\bportrait\b/i;
const FOOTER_ZONE_HEIGHT_RE = /(bottom 12%|bottom 184px)/;
const DATA_FROM_RE = /Data from:/;
const FOOTER_LOGO_RE = /\b(hexagon|cube logo|Crustdata logo)\b/i;

const PARAPHRASE_WORDS = ['stylish', 'modern', 'clean'] as const;
const STYLE_PARAPHRASE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /Crustdata-style/i, label: '"Crustdata-style"' },
  { pattern: /\bin the Crustdata style\b/i, label: '"in the Crustdata style"' },
  { pattern: /\bin the style of\b/i, label: '"in the style of"' },
];
const RAINBOW_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\brainbow\b/i, label: '"rainbow"' },
  { pattern: /\bvaried colors\b/i, label: '"varied colors"' },
  { pattern: /\bdifferent colors\b/i, label: '"different colors"' },
];

const NEGATION_RE = /\b(no|not|never|sharp|flat|square|don'?t|avoid)\b/;

export type ValidationResult =
  | { valid: true; warnings: string[] }
  | { valid: false; missing: string[]; warnings: string[] };

/**
 * Return all distinct hex color references in the prompt, normalized to upper case
 * and ordered by first appearance.
 */
export function extractHexColors(prompt: string): string[] {
  const matches = prompt.match(HEX_COLOR_REGEX) ?? [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of matches) {
    const upper = value.toUpperCase();
    if (!seen.has(upper)) {
      seen.add(upper);
      ordered.push(upper);
    }
  }
  return ordered;
}

/**
 * True if "rounded" appears anywhere in the prompt without a nearby negation
 * ("no rounded", "not rounded", "sharp ... rounded", etc.).
 */
function hasBareRoundedReference(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  for (const match of lower.matchAll(/\brounded\b/g)) {
    const start = match.index ?? 0;
    const before = lower.slice(Math.max(0, start - 30), start);
    if (!NEGATION_RE.test(before)) {
      return true;
    }
  }
  return false;
}

export function validateImagePrompt(prompt: string): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!prompt.includes(REQUIRED_BACKGROUND_HEX)) {
    missing.push(REQUIRED_BACKGROUND_HEX);
  }

  if (!FULL_BLEED_RE.test(prompt)) {
    missing.push('full-bleed phrase ("full bleed" or "full-bleed")');
  }

  if (!prompt.includes(REQUIRED_EMPTY_FOOTER_ZONE_TEXT)) {
    missing.push(REQUIRED_EMPTY_FOOTER_ZONE_TEXT);
  }

  if (!prompt.includes(REQUIRED_NO_DATA_FROM_TEXT)) {
    missing.push(REQUIRED_NO_DATA_FROM_TEXT);
  }

  if (!FOOTER_ZONE_HEIGHT_RE.test(prompt)) {
    missing.push('bottom 12% or bottom 184px footer-zone instruction');
  }

  if (!DO_NOT_CROP_RE.test(prompt)) {
    missing.push('do-not-crop instruction ("do not crop", "must not be cropped", or "not cropped")');
  }

  if (!PORTRAIT_RE.test(prompt)) {
    missing.push('portrait layout instruction');
  }

  const hexColors = extractHexColors(prompt);
  if (hexColors.length < MIN_DISTINCT_HEX_COLORS) {
    missing.push(
      `at least ${MIN_DISTINCT_HEX_COLORS} distinct hex colors (background + headline + chart); found ${hexColors.length}`
    );
  }

  for (const word of PARAPHRASE_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(prompt)) {
      warnings.push(`paraphrase keyword "${word}" — pin a literal hex/font/size spec instead of relying on the adjective`);
    }
  }

  for (const { pattern, label } of STYLE_PARAPHRASE_PATTERNS) {
    if (pattern.test(prompt)) {
      warnings.push(`style-paraphrase phrase ${label} — Sonnet is delegating styling to GPT-image-2; pin literal values instead`);
    }
  }

  for (const { pattern, label } of RAINBOW_PATTERNS) {
    if (pattern.test(prompt)) {
      warnings.push(`rainbow/varied-color phrase ${label} — likely violates the color encoding rule`);
    }
  }

  if (DATA_FROM_RE.test(prompt)) {
    warnings.push('"Data from:" appears in the prompt - GPT-image-2 might still render footer text accidentally');
  }

  if (FOOTER_LOGO_RE.test(prompt)) {
    warnings.push(
      'footer logo language appears in the prompt - GPT-image-2 should leave Crustdata branding to Stage 4c'
    );
  }

  if (hasBareRoundedReference(prompt)) {
    warnings.push('"rounded" appears without a nearby negation — likely violates the sharp-rectangular bar rule');
  }

  if (missing.length > 0) {
    return { valid: false, missing, warnings };
  }

  return { valid: true, warnings };
}
