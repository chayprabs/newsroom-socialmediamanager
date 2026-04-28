import { NextRequest, NextResponse } from 'next/server';
import { readMarkdown, writeMarkdown } from '@/lib/server/storage';

export async function GET() {
  return NextResponse.json({ content: await readMarkdown('design') });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const content = typeof body?.content === 'string' ? body.content : '';
  await writeMarkdown('design', content);
  return NextResponse.json({ content });
}
