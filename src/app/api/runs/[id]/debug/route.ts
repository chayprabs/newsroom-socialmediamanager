import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getRunDir } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getDebugDir(runId: string) {
  return path.join(getRunDir(runId), 'debug');
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const dir = getDebugDir(id);
  const runDir = getRunDir(id);
  let files: Array<{ name: string; url: string }> = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        name: entry.name,
        url: `/api/runs/${encodeURIComponent(id)}/debug/${encodeURIComponent(entry.name)}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  try {
    await fs.access(path.join(runDir, 'post_raw.png'));
    files.unshift({
      name: 'post_raw.png',
      url: `/api/runs/${encodeURIComponent(id)}/debug/post_raw.png`,
    });
  } catch {
    // Older runs do not have Stage 4c raw images.
  }

  return NextResponse.json({ files });
}
