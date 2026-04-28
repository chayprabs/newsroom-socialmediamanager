import { NextRequest, NextResponse } from 'next/server';
import { regeneratePost } from '@/lib/server/pipeline';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const editPrompt = typeof body?.editPrompt === 'string' ? body.editPrompt : '';
  return NextResponse.json({ run: await regeneratePost(id, editPrompt) });
}
