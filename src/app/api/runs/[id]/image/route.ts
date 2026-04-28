import path from 'node:path';
import { NextResponse } from 'next/server';
import { readRun, readRunArtifactBuffer } from '@/lib/server/storage';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const run = await readRun(id);
  const shouldDownload = new URL(request.url).searchParams.get('download') === '1';
  const filename = run?.image_filename || (run?.image_path ? path.basename(run.image_path) : 'post.svg');
  const image = await readRunArtifactBuffer(id, filename);

  if (!image) {
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  const mimeType =
    run?.image_mime_type ||
    (filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : filename.endsWith('.jpg') ? 'image/jpeg' : 'image/svg+xml');

  return new NextResponse(new Uint8Array(image), {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="newsroom-${id}${path.extname(filename) || '.png'}"`,
    },
  });
}
