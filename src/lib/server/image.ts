import type { GeneratedPostData } from '../types';

export type ImageDimensions = {
  width: number;
  height: number;
};

export type ImageOutputFormat = 'png' | 'jpeg' | 'webp';
export type ImageBackground = 'opaque' | 'transparent' | 'auto';

export const PORTRAIT_SAFE_AREA_INSTRUCTION =
  'Create a portrait social data graphic on a full-bleed lavender #E8E6F5 canvas. Use generous inner margins and keep the full headline and chart visible in the top 88% of the canvas. Leave the bottom 12% empty lavender for the deterministic footer overlay. Do not draw a crop box, safe-area guide, border, frame, or white card.';

const LAVENDER_BACKGROUND = '#E8E6F5';
const LANDSCAPE_TEMPLATE = 'event_effect_multi_panel_line';

export function isLandscapeImageTemplate(template = '') {
  return template.trim().toLowerCase() === LANDSCAPE_TEMPLATE;
}

export function parseImageDimensions(value: string, label = 'image size'): ImageDimensions {
  const match = /^(\d+)x(\d+)$/.exec(value.trim());

  if (!match) {
    throw new Error(`${label} must be formatted as WIDTHxHEIGHT. Received "${value}".`);
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`${label} must use positive integer dimensions. Received "${value}".`);
  }

  return { width, height };
}

type NormalizeGeneratedPostImageOptions = {
  generationSize: string;
  exportSize: string;
  safeArea: string;
  outputFormat: ImageOutputFormat;
  background: ImageBackground;
  isLandscape?: boolean;
};

async function loadSharp() {
  try {
    const sharpModule = await import('sharp');
    return sharpModule.default;
  } catch (error) {
    throw new Error(
      `Image export normalization requires the sharp package. ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function applyOutputFormat(
  pipeline: import('sharp').Sharp,
  outputFormat: ImageOutputFormat
): import('sharp').Sharp {
  if (outputFormat === 'jpeg') {
    return pipeline.jpeg({ quality: 95 });
  }

  if (outputFormat === 'webp') {
    return pipeline.webp({ quality: 95 });
  }

  return pipeline.png();
}

function flattenIfNeeded(pipeline: import('sharp').Sharp, background: ImageBackground) {
  return background === 'transparent' ? pipeline : pipeline.flatten({ background: LAVENDER_BACKGROUND });
}

export async function normalizeGeneratedPostImage(
  buffer: Buffer,
  options: NormalizeGeneratedPostImageOptions
) {
  const sharp = await loadSharp();
  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Generated image did not include readable dimensions.');
  }

  const shouldAutoExport = options.exportSize.trim().toLowerCase() === 'auto';

  if (options.isLandscape || shouldAutoExport) {
    return applyOutputFormat(
      flattenIfNeeded(sharp(buffer, { failOn: 'none' }), options.background),
      options.outputFormat
    ).toBuffer();
  }

  const exportSize = parseImageDimensions(options.exportSize, 'OPENAI_IMAGE_EXPORT_SIZE');

  const portraitPipeline = sharp(buffer, { failOn: 'none' })
    .resize(exportSize.width, exportSize.height, {
      fit: 'contain',
      background: LAVENDER_BACKGROUND,
    });

  return applyOutputFormat(flattenIfNeeded(portraitPipeline, options.background), options.outputFormat).toBuffer();
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

function truncateText(text: string, maxChars: number) {
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

function formatValue(value: number, signed = false) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return signed && value > 0 ? `+${rounded}` : String(rounded);
}

function rowColor(row: GeneratedPostData['rows'][number], isDiverging: boolean) {
  if (!isDiverging) return '#6B5BD9';
  if (row.value < 0) return '#D92D20';
  if (row.value > 0) return '#12B76A';
  return '#111111';
}

export function renderPostSvg(data: GeneratedPostData, template = '') {
  const width = 1080;
  const height = 1350;
  const maxValue = Math.max(...data.rows.map((row) => Math.abs(row.value)), 1);
  const rows = data.rows.slice(0, 12);
  const titleLines = wrapText(data.title || 'Untitled post', 27).slice(0, 2);
  const subtitleLines = wrapText(data.subtitle || '', 52).slice(0, 2);
  const chartTop = 360;
  const chartBottom = 1120;
  const rowHeight = Math.min(72, Math.floor((chartBottom - chartTop) / Math.max(rows.length, 1)));
  const barHeight = Math.max(24, Math.min(38, Math.floor(rowHeight * 0.52)));
  const labelX = 86;
  const barX = 380;
  const maxBarWidth = 560;
  const axisY = chartTop + rows.length * rowHeight + 18;
  const isDiverging = template.toLowerCase().includes('diverging') || rows.some((row) => row.value < 0);

  const rankedBars = rows
    .map((row, index) => {
      const y = chartTop + index * rowHeight + Math.floor((rowHeight - barHeight) / 2);
      const barWidth = Math.max(8, (Math.abs(row.value) / maxValue) * maxBarWidth);
      const color = rowColor(row, false);
      const valueX = Math.min(barX + barWidth + 18, width - 70);
      return `<text x="${labelX}" y="${y + Math.floor(barHeight * 0.72)}" fill="#1A1A1A" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="500">${escapeXml(truncateText(row.label, 25))}</text>
    <rect x="${barX}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${escapeXml(color)}"/>
    <text x="${valueX}" y="${y + Math.floor(barHeight * 0.72)}" fill="#111111" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(formatValue(row.value))}</text>`;
    })
    .join('\n    ');

  const divergingBars = rows
    .map((row, index) => {
      const y = chartTop + index * rowHeight + Math.floor((rowHeight - barHeight) / 2);
      const axisX = 540;
      const maxBarWidth = 330;
      const barWidth = Math.max(8, (Math.abs(row.value) / maxValue) * maxBarWidth);
      const x = row.value < 0 ? axisX - barWidth : axisX;
      const valueX = row.value < 0 ? x - 16 : x + barWidth + 16;
      const anchor = row.value < 0 ? 'end' : 'start';
      return `<text x="${labelX}" y="${y + Math.floor(barHeight * 0.72)}" fill="#1A1A1A" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="500">${escapeXml(truncateText(row.label, 28))}</text>
    <line x1="${axisX}" y1="${y - 10}" x2="${axisX}" y2="${y + barHeight + 10}" stroke="#CCCCCC" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${escapeXml(rowColor(row, true))}"/>
    <text x="${valueX}" y="${y + Math.floor(barHeight * 0.72)}" fill="#111111" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(formatValue(row.value, true))}</text>`;
    })
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#E8E6F5"/>
  ${titleLines
    .map((line, index) => `<text x="${width / 2}" y="${104 + index * 62}" fill="#111111" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="800">${escapeXml(line)}</text>`)
    .join('\n  ')}
  ${subtitleLines
    .map((line, index) => `<text x="${width / 2}" y="${238 + index * 31}" fill="#555555" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="500">${escapeXml(line)}</text>`)
    .join('\n  ')}
  <g>
    ${isDiverging ? divergingBars : rankedBars}
    ${!isDiverging ? `<line x1="${barX}" y1="${axisY}" x2="${barX + maxBarWidth}" y2="${axisY}" stroke="#CCCCCC" stroke-width="2"/>
    <text x="${barX}" y="${axisY + 30}" fill="#888888" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="400">0</text>
    <text x="${barX + maxBarWidth}" y="${axisY + 30}" fill="#888888" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="400">${escapeXml(formatValue(maxValue))}</text>` : ''}
  </g>
</svg>`;
}
