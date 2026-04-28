import { NextResponse } from 'next/server';
import { createRun } from '@/lib/server/pipeline';
import { listRuns } from '@/lib/server/storage';

export async function GET() {
  return NextResponse.json({ runs: await listRuns() });
}

export async function POST() {
  return NextResponse.json({ run: await createRun() });
}
