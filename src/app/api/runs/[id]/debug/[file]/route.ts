import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getRunDir } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string; file: string }>;
};

function contentTypeForFile(filename: string) {
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

export async function GET(_request: Request, context: RouteContext) {
  const { id, file } = await context.params;
  const safeName = path.basename(file);

  if (safeName !== file) {
    return NextResponse.json({ error: 'Invalid debug filename.' }, { status: 400 });
  }

  const runDir = getRunDir(id);
  const debugDir = path.join(runDir, 'debug');
  const filePath = safeName === 'post_raw.png' ? path.join(runDir, safeName) : path.join(debugDir, safeName);
  const resolvedDir = path.resolve(safeName === 'post_raw.png' ? runDir : debugDir);
  const resolvedFile = path.resolve(filePath);

  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    return NextResponse.json({ error: 'Invalid debug filename.' }, { status: 400 });
  }

  try {
    const content = await fs.readFile(resolvedFile);
    const disposition = safeName.endsWith('.png') ? 'inline' : 'attachment';
    return new NextResponse(new Uint8Array(content), {
      headers: {
        'Content-Type': contentTypeForFile(safeName),
        'Content-Disposition': `${disposition}; filename="${safeName}"`,
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Debug file not found.' }, { status: 404 });
    }

    throw error;
  }
}
