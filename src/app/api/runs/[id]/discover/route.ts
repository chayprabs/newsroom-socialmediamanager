import { NextResponse } from 'next/server';
import { discoverCandidates } from '@/lib/server/pipeline';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json({ run: await discoverCandidates(id) });
}
