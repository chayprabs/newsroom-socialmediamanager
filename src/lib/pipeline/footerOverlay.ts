import { promises as fs } from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseImageDimensions } from '../server/image';

const DEFAULT_EXPORT_SIZE = '1080x1350';
const DEFAULT_FOOTER_WIDTH = 1080;
const DEFAULT_FOOTER_HEIGHT = 130;
const DEFAULT_FOOTER_ASSET_PATH = path.join(
  process.cwd(),
  'public',
  'assets',
  'brand',
  'crustdata-footer.png'
);
const LAVENDER_BACKGROUND = '#E8E6F5';

export type FooterOverlayOptions = {
  footerAssetPath?: string;
  exportSize?: string;
  bottomMargin?: number;
};

export type FooterOverlayResult = {
  success: boolean;
  outputPath: string;
  footerSource: 'asset' | 'fallback_generated';
  appliedAt: { x: number; y: number; width: number; height: number };
  warnings: string[];
};

export class FooterOverlayError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'FooterOverlayError';
    this.cause = cause;
  }
}

function warnIfDefaultFooterMissing() {
  if (!fsSync.existsSync(DEFAULT_FOOTER_ASSET_PATH)) {
    console.warn(
      `Crustdata footer asset is missing at ${DEFAULT_FOOTER_ASSET_PATH}; Stage 4c will use a generated text-only fallback.`
    );
  }
}

warnIfDefaultFooterMissing();

function addWarning(warnings: string[], warning: string) {
  warnings.push(warning);
  console.warn(`Stage 4c footer overlay warning: ${warning}`);
}

function resolveExportDimensions(exportSize: string | undefined, warnings: string[]) {
  const configured = exportSize || process.env.OPENAI_IMAGE_EXPORT_SIZE || DEFAULT_EXPORT_SIZE;

  if (configured.trim().toLowerCase() === 'auto') {
    console.warn(
      `OPENAI_IMAGE_EXPORT_SIZE is "auto"; Stage 4c footer overlay requires a fixed export canvas, using ${DEFAULT_EXPORT_SIZE}.`
    );
    return parseImageDimensions(DEFAULT_EXPORT_SIZE, 'OPENAI_IMAGE_EXPORT_SIZE');
  }

  return parseImageDimensions(configured, 'OPENAI_IMAGE_EXPORT_SIZE');
}

function aspectRatio(width: number, height: number) {
  return width / height;
}

function svgTextOnlyFooter() {
  return Buffer.from(
    `<svg width="${DEFAULT_FOOTER_WIDTH}" height="${DEFAULT_FOOTER_HEIGHT}" viewBox="0 0 ${DEFAULT_FOOTER_WIDTH} ${DEFAULT_FOOTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${DEFAULT_FOOTER_WIDTH}" height="${DEFAULT_FOOTER_HEIGHT}" fill="transparent"/>
      <text x="${DEFAULT_FOOTER_WIDTH / 2}" y="72" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="400">
        <tspan fill="#666666">Data from: </tspan><tspan fill="#111111" font-weight="500">Crustdata</tspan>
      </text>
    </svg>`,
    'utf8'
  );
}

async function buildFallbackFooter(width: number) {
  return sharp(svgTextOnlyFooter())
    .resize({ width })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function loadFooterAsset(footerAssetPath: string, width: number, warnings: string[]) {
  const metadata = await sharp(footerAssetPath, { failOn: 'none' }).metadata();
  if (!metadata.width || !metadata.height) {
    addWarning(warnings, 'footer_asset_unreadable_dimensions');
  } else {
    if (metadata.width !== DEFAULT_FOOTER_WIDTH) {
      addWarning(warnings, `footer_asset_width_${metadata.width}_expected_${DEFAULT_FOOTER_WIDTH}`);
    }
    if (Math.abs(metadata.height - DEFAULT_FOOTER_HEIGHT) > 12) {
      addWarning(warnings, `footer_asset_height_${metadata.height}_expected_${DEFAULT_FOOTER_HEIGHT}`);
    }
  }

  return sharp(footerAssetPath, { failOn: 'none' })
    .resize({ width })
    .png()
    .toBuffer({ resolveWithObject: true });
}

export async function applyFooterOverlay(
  rawImagePath: string,
  outputImagePath: string,
  options: FooterOverlayOptions = {}
): Promise<FooterOverlayResult> {
  const warnings: string[] = [];
  const footerAssetPath = options.footerAssetPath || DEFAULT_FOOTER_ASSET_PATH;
  const bottomMargin = options.bottomMargin ?? 0;
  const exportDimensions = resolveExportDimensions(options.exportSize, warnings);

  let rawMetadata: sharp.Metadata;
  try {
    rawMetadata = await sharp(rawImagePath, { failOn: 'none' }).metadata();
  } catch (error) {
    throw new FooterOverlayError(`Stage 4c could not read raw image at ${rawImagePath}.`, error);
  }

  if (!rawMetadata.width || !rawMetadata.height) {
    throw new FooterOverlayError(`Stage 4c raw image has unreadable dimensions: ${rawImagePath}.`);
  }

  const rawRatio = aspectRatio(rawMetadata.width, rawMetadata.height);
  const exportRatio = aspectRatio(exportDimensions.width, exportDimensions.height);
  if (Math.abs(rawRatio - exportRatio) > 0.01) {
    addWarning(
      warnings,
      `raw_aspect_ratio_${rawMetadata.width}x${rawMetadata.height}_resized_cover_to_${exportDimensions.width}x${exportDimensions.height}`
    );
  }

  let footerSource: FooterOverlayResult['footerSource'] = 'asset';
  let footer: Awaited<ReturnType<typeof loadFooterAsset>>;
  try {
    if (fsSync.existsSync(footerAssetPath)) {
      footer = await loadFooterAsset(footerAssetPath, exportDimensions.width, warnings);
    } else {
      footerSource = 'fallback_generated';
      addWarning(warnings, 'footer_asset_missing_using_fallback');
      footer = await buildFallbackFooter(exportDimensions.width);
    }
  } catch (error) {
    console.error('Stage 4c footer preparation failed.', error);
    throw new FooterOverlayError(`Stage 4c failed while preparing footer asset ${footerAssetPath}.`, error);
  }

  const footerHeight = footer.info.height;
  const y = Math.max(0, exportDimensions.height - footerHeight - bottomMargin);

  try {
    await fs.mkdir(path.dirname(outputImagePath), { recursive: true });
    await sharp(rawImagePath, { failOn: 'none' })
      .resize(exportDimensions.width, exportDimensions.height, {
        fit: 'cover',
        position: 'top',
      })
      .flatten({ background: LAVENDER_BACKGROUND })
      .composite([{ input: footer.data, left: 0, top: y }])
      .png()
      .toFile(outputImagePath);
  } catch (error) {
    console.error('Stage 4c footer overlay failed.', error);
    throw new FooterOverlayError(`Stage 4c failed while compositing footer onto ${rawImagePath}.`, error);
  }

  return {
    success: true,
    outputPath: outputImagePath,
    footerSource,
    appliedAt: {
      x: 0,
      y,
      width: exportDimensions.width,
      height: footerHeight,
    },
    warnings,
  };
}
