import { NextResponse } from 'next/server';
import { discoverCandidates } from '@/lib/server/pipeline';
import { readRun } from '@/lib/server/storage';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const activeDiscoveryRuns = new Set<string>();
const terminalStatuses = new Set(['no_matches', 'awaiting_selection', 'ready', 'saved', 'failed']);

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const currentRun = await readRun(id);

  if (!currentRun) {
    return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
  }

  if (!terminalStatuses.has(currentRun.status) && !activeDiscoveryRuns.has(id)) {
    activeDiscoveryRuns.add(id);
    void discoverCandidates(id)
      .catch((error) => {
        console.error(`Discovery failed for run ${id}:`, error);
      })
      .finally(() => {
        activeDiscoveryRuns.delete(id);
      });
  }

  return NextResponse.json({ run: await readRun(id), started: activeDiscoveryRuns.has(id) }, { status: 202 });
}
