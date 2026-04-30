import { NextResponse } from 'next/server';
import { discoverCandidates } from '@/lib/server/pipeline';
import { readRun } from '@/lib/server/storage';
import { ensureRunFromSnapshot, readJsonBody, type RunSnapshotBody } from '@/lib/server/runSnapshots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

const activeDiscoveryRuns = new Map<string, ReturnType<typeof discoverCandidates>>();
const terminalStatuses = new Set([
  'no_matches',
  'awaiting_selection',
  'awaiting_chart_type_selection',
  'ready',
  'saved',
  'failed',
]);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await readJsonBody<RunSnapshotBody>(request);
  const currentRun = await ensureRunFromSnapshot(id, body.run);

  if (!currentRun) {
    return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
  }

  if (terminalStatuses.has(currentRun.status)) {
    return NextResponse.json({ run: currentRun, started: false });
  }

  let discoveryRun = activeDiscoveryRuns.get(id);
  if (!discoveryRun) {
    discoveryRun = discoverCandidates(id).finally(() => {
      activeDiscoveryRuns.delete(id);
    });
    activeDiscoveryRuns.set(id, discoveryRun);
  }

  try {
    return NextResponse.json({ run: await discoveryRun, started: true });
  } catch (error) {
    console.error(`Discovery failed for run ${id}:`, error);
    return NextResponse.json(
      { run: await readRun(id), error: errorMessage(error) },
      { status: 500 }
    );
  }
}
