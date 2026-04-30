import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { FooterOverlayError, applyFooterOverlay } from '../src/lib/pipeline/footerOverlay';

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'newsroom-footer-overlay-'));
  tempDirs.push(dir);
  return dir;
}

async function makeRawImage(filePath: string) {
  await sharp({
    create: {
      width: 108,
      height: 135,
      channels: 4,
      background: '#E8E6F5',
    },
  })
    .png()
    .toFile(filePath);
}

async function makeRawImageWithFooterLeak(filePath: string) {
  const leakSvg = `<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1350" fill="#E8E6F5"/>
    <rect x="0" y="1220" width="1080" height="130" fill="#B42318"/>
  </svg>`;
  await sharp(Buffer.from(leakSvg)).png().toFile(filePath);
}

async function makeRawImageWithLavenderDrift(filePath: string) {
  const driftSvg = `<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1350" fill="#E7E4F6"/>
    <rect x="120" y="120" width="280" height="60" fill="#111111"/>
  </svg>`;
  await sharp(Buffer.from(driftSvg)).png().toFile(filePath);
}

async function makeFooterAsset(filePath: string) {
  const svg = `<svg width="1080" height="130" viewBox="0 0 1080 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="130" fill="transparent"/>
    <text x="540" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="24">
      <tspan fill="#666666">Data from: </tspan><tspan fill="#111111" font-weight="600">Crustdata</tspan>
    </text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(filePath);
}

async function readPixel(filePath: string, left: number, top: number) {
  const pixel = await sharp(filePath)
    .extract({ left, top, width: 1, height: 1 })
    .raw()
    .toBuffer();
  return Array.from(pixel);
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('applyFooterOverlay', () => {
  it('uses the asset footer and produces the expected output dimensions', async () => {
    const dir = await makeTempDir();
    const rawPath = path.join(dir, 'raw.png');
    const outputPath = path.join(dir, 'post.png');
    const footerPath = path.join(dir, 'footer.png');
    await makeRawImage(rawPath);
    await makeFooterAsset(footerPath);

    const result = await applyFooterOverlay(rawPath, outputPath, {
      footerAssetPath: footerPath,
      exportSize: '1080x1350',
    });
    const metadata = await sharp(outputPath).metadata();
    const debugPath = path.join(dir, 'debug', 'post_base_with_ai.png');
    const debugMetadata = await sharp(debugPath).metadata();

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1350);
    expect(debugMetadata.width).toBe(1080);
    expect(debugMetadata.height).toBe(1350);
    expect(result.footerSource).toBe('asset');
    expect(result.appliedAt.y + result.appliedAt.height).toBe(1350);
    expect(result.warnings).toEqual([]);
  });

  it('falls back to a generated text-only footer when the asset is missing', async () => {
    const dir = await makeTempDir();
    const rawPath = path.join(dir, 'raw.png');
    const outputPath = path.join(dir, 'post.png');
    await makeRawImage(rawPath);

    const result = await applyFooterOverlay(rawPath, outputPath, {
      footerAssetPath: path.join(dir, 'missing-footer.png'),
      exportSize: '1080x1350',
    });
    const metadata = await sharp(outputPath).metadata();

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1350);
    expect(result.footerSource).toBe('fallback_generated');
    expect(result.warnings).toContain('footer_asset_missing_using_fallback');
  });

  it('throws FooterOverlayError when the raw image is missing', async () => {
    const dir = await makeTempDir();

    await expect(
      applyFooterOverlay(path.join(dir, 'missing-raw.png'), path.join(dir, 'post.png'), {
        footerAssetPath: path.join(dir, 'missing-footer.png'),
        exportSize: '1080x1350',
      })
    ).rejects.toBeInstanceOf(FooterOverlayError);
  });

  it('supports a custom export size', async () => {
    const dir = await makeTempDir();
    const rawPath = path.join(dir, 'raw.png');
    const outputPath = path.join(dir, 'post.png');
    const footerPath = path.join(dir, 'footer.png');
    await makeRawImage(rawPath);
    await makeFooterAsset(footerPath);

    const result = await applyFooterOverlay(rawPath, outputPath, {
      footerAssetPath: footerPath,
      exportSize: '800x1000',
    });
    const metadata = await sharp(outputPath).metadata();

    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(1000);
    expect(result.appliedAt).toMatchObject({ x: 0, width: 800 });
    expect(result.appliedAt.y + result.appliedAt.height).toBe(1000);
  });

  it('keeps the footer reserve lavender before and after footer compositing', async () => {
    const dir = await makeTempDir();
    const rawPath = path.join(dir, 'raw.png');
    const outputPath = path.join(dir, 'post.png');
    const footerPath = path.join(dir, 'footer.png');
    await makeRawImageWithFooterLeak(rawPath);
    await makeFooterAsset(footerPath);

    await applyFooterOverlay(rawPath, outputPath, {
      footerAssetPath: footerPath,
      exportSize: '1080x1350',
    });
    const debugPath = path.join(dir, 'debug', 'post_base_with_ai.png');

    expect(await readPixel(debugPath, 10, 1340)).toEqual([232, 230, 245, 255]);
    expect(await readPixel(outputPath, 10, 1340)).toEqual([232, 230, 245, 255]);
  });

  it('normalizes slight AI lavender drift at the footer boundary', async () => {
    const dir = await makeTempDir();
    const rawPath = path.join(dir, 'raw.png');
    const outputPath = path.join(dir, 'post.png');
    const footerPath = path.join(dir, 'footer.png');
    await makeRawImageWithLavenderDrift(rawPath);
    await makeFooterAsset(footerPath);

    const result = await applyFooterOverlay(rawPath, outputPath, {
      footerAssetPath: footerPath,
      exportSize: '1080x1350',
    });
    const debugPath = path.join(dir, 'debug', 'post_base_with_ai.png');
    const boundaryY = result.appliedAt.y;

    expect(await readPixel(debugPath, 10, boundaryY - 1)).toEqual([232, 230, 245, 255]);
    expect(await readPixel(debugPath, 10, boundaryY)).toEqual([232, 230, 245, 255]);
    expect(await readPixel(outputPath, 10, boundaryY - 1)).toEqual([232, 230, 245, 255]);
    expect(await readPixel(outputPath, 10, boundaryY)).toEqual([232, 230, 245, 255]);
  });
});
