import { NextResponse } from 'next/server';
import { generatePost } from '@/lib/server/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json({ run: await generatePost(id) });
}
