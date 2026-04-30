import { NextResponse } from 'next/server';
import { generatePost } from '@/lib/server/pipeline';
import { ensureRunFromSnapshot, readJsonBody, type RunSnapshotBody } from '@/lib/server/runSnapshots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await readJsonBody<RunSnapshotBody>(request);
  const run = await ensureRunFromSnapshot(id, body.run);
  if (!run) {
    return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
  }

  return NextResponse.json({ run: await generatePost(id) });
}
