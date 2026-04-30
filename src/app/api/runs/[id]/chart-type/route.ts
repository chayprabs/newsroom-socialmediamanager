import { NextRequest, NextResponse } from 'next/server';
import { selectChartType } from '@/lib/server/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const selectedTemplate = typeof body?.selected_template === 'string' ? body.selected_template : '';

  if (!selectedTemplate) {
    return NextResponse.json({ error: 'selected_template is required.' }, { status: 400 });
  }

  return NextResponse.json({ run: await selectChartType(id, selectedTemplate) });
}
