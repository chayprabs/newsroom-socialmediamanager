import { NextRequest, NextResponse } from 'next/server';
import { selectCandidate } from '@/lib/server/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const candidateId = typeof body?.candidateId === 'string' ? body.candidateId : '';

  if (!candidateId) {
    return NextResponse.json({ error: 'candidateId is required.' }, { status: 400 });
  }

  return NextResponse.json({ run: await selectCandidate(id, candidateId) });
}
