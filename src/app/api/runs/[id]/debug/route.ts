import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getRunDir } from '@/lib/server/storage';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getDebugDir(runId: string) {
  return path.join(getRunDir(runId), 'debug');
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const dir = getDebugDir(id);

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        name: entry.name,
        url: `/api/runs/${encodeURIComponent(id)}/debug/${encodeURIComponent(entry.name)}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ files });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ files: [] });
    }

    throw error;
  }
}
