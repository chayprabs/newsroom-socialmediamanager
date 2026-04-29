import type { GeneratedPostData } from '../types';

export type ImageDimensions = {
  width: number;
  height: number;
};

export type ImageOutputFormat = 'png' | 'jpeg' | 'webp';
export type ImageBackground = 'opaque' | 'transparent' | 'auto';

export const PORTRAIT_SAFE_AREA_INSTRUCTION =
  'Create a 4:5 portrait social data graphic centered within a 1024x1536 canvas. Keep all important content inside the centered 1024x1280 safe area. The extra top and bottom space should be plain flat lavender #E8E6F5 so the image can be safely cropped/exported to 1080x1350. Do not place title, chart labels, axes, or footer outside the safe area.';

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

export async function normalizeGeneratedPostImage(
  buffer: Buffer,
  options: NormalizeGeneratedPostImageOptions
) {
  const sharp = await loadSharp();
  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Generated image did not include readable dimensions.');
  }

  if (options.isLandscape) {
    const landscapePipeline = sharp(buffer, { failOn: 'none' });
    const flattened =
      options.background === 'transparent'
        ? landscapePipeline
        : landscapePipeline.flatten({ background: LAVENDER_BACKGROUND });

    return applyOutputFormat(flattened, options.outputFormat).toBuffer();
  }

  const generationSize = parseImageDimensions(options.generationSize, 'OPENAI_IMAGE_SIZE');
  const safeArea = parseImageDimensions(options.safeArea, 'OPENAI_IMAGE_SAFE_AREA');
  const exportSize = parseImageDimensions(options.exportSize, 'OPENAI_IMAGE_EXPORT_SIZE');

  if (safeArea.width > generationSize.width || safeArea.height > generationSize.height) {
    throw new Error(
      `OPENAI_IMAGE_SAFE_AREA (${options.safeArea}) must fit inside OPENAI_IMAGE_SIZE (${options.generationSize}).`
    );
  }

  const safeWidthRatio = Math.min(safeArea.width / generationSize.width, 1);
  const safeHeightRatio = Math.min(safeArea.height / generationSize.height, 1);
  const cropWidth = Math.max(1, Math.min(metadata.width, Math.round(metadata.width * safeWidthRatio)));
  const cropHeight = Math.max(1, Math.min(metadata.height, Math.round(metadata.height * safeHeightRatio)));
  const left = Math.max(0, Math.floor((metadata.width - cropWidth) / 2));
  const top = Math.max(0, Math.floor((metadata.height - cropHeight) / 2));

  let portraitPipeline = sharp(buffer, { failOn: 'none' })
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(exportSize.width, exportSize.height, {
      fit: 'contain',
      background: LAVENDER_BACKGROUND,
    });

  if (options.background !== 'transparent') {
    portraitPipeline = portraitPipeline.flatten({ background: LAVENDER_BACKGROUND });
  }

  return applyOutputFormat(portraitPipeline, options.outputFormat).toBuffer();
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

function formatValue(value: number) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return value > 0 ? `+${rounded}` : String(rounded);
}

function rowColor(row: GeneratedPostData['rows'][number]) {
  if (row.color) return row.color;
  if (row.value < 0) return '#D92D20';
  if (row.value > 0) return '#12B76A';
  return '#111111';
}

export function renderPostSvg(data: GeneratedPostData, template = '') {
  const width = 1080;
  const height = 1350;
  const maxValue = Math.max(...data.rows.map((row) => Math.abs(row.value)), 1);
  const rows = data.rows.slice(0, 8);
  const titleLines = wrapText(data.title || 'Untitled post', 34);
  const subtitleLines = wrapText(data.subtitle || '', 54);
  const chartTop = 430;
  const rowHeight = 84;
  const isDiverging = template.toLowerCase().includes('diverging') || rows.some((row) => row.value < 0);

  const rankedBars = rows
    .map((row, index) => {
      const y = chartTop + index * rowHeight;
      const barWidth = Math.max(8, (Math.abs(row.value) / maxValue) * 500);
      const color = rowColor(row);
      return `<text x="96" y="${y + 28}" fill="#333333" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(truncateText(row.label, 24))}</text>
    <rect x="380" y="${y}" width="500" height="36" rx="18" fill="#F1F1F1"/>
    <rect x="380" y="${y}" width="${barWidth}" height="36" rx="18" fill="${escapeXml(color)}"/>
    <text x="920" y="${y + 27}" fill="#111111" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(formatValue(row.value))}</text>`;
    })
    .join('\n    ');

  const divergingBars = rows
    .map((row, index) => {
      const y = chartTop + index * rowHeight;
      const axisX = 540;
      const maxBarWidth = 330;
      const barWidth = Math.max(8, (Math.abs(row.value) / maxValue) * maxBarWidth);
      const x = row.value < 0 ? axisX - barWidth : axisX;
      const valueX = row.value < 0 ? x - 16 : x + barWidth + 16;
      const anchor = row.value < 0 ? 'end' : 'start';
      return `<text x="96" y="${y + 28}" fill="#333333" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(truncateText(row.label, 28))}</text>
    <line x1="${axisX}" y1="${y - 12}" x2="${axisX}" y2="${y + 48}" stroke="#D5D5D5" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="${barWidth}" height="36" rx="18" fill="${escapeXml(rowColor(row))}"/>
    <text x="${valueX}" y="${y + 27}" fill="#111111" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(formatValue(row.value))}</text>`;
    })
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#F8F8F8"/>
  <rect x="52" y="52" width="976" height="1246" rx="34" fill="#FFFFFF" stroke="#E5E5E5"/>
  ${titleLines
    .map((line, index) => `<text x="96" y="${160 + index * 62}" fill="#111111" font-family="Inter, Arial, sans-serif" font-size="52" font-weight="500">${escapeXml(line)}</text>`)
    .join('\n  ')}
  ${subtitleLines
    .map((line, index) => `<text x="96" y="${330 + index * 34}" fill="#666666" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="400">${escapeXml(line)}</text>`)
    .join('\n  ')}
  <g>
    ${isDiverging ? divergingBars : rankedBars}
  </g>
  <text x="96" y="1234" fill="#888888" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="400">${escapeXml(data.footer || 'Data from: Crustdata')}</text>
</svg>`;
}
