import { NextResponse } from 'next/server';
import { deleteRun, readRun } from '@/lib/server/storage';
import { readSonnetUsageSummary } from '@/lib/pipeline/tokenLogger';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const run = await readRun(id);

  if (!run) {
    return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
  }

  return NextResponse.json({ run: { ...run, usage_summary: readSonnetUsageSummary(id) || undefined } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await deleteRun(id);
  return NextResponse.json({ ok: true });
}
