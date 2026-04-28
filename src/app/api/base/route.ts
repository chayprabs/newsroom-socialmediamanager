import { NextRequest, NextResponse } from 'next/server';
import { getMarkdownPath, readMarkdown, writeMarkdown } from '@/lib/server/storage';

export async function GET() {
  return NextResponse.json({ content: await readMarkdown('base'), filePath: getMarkdownPath('base') });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const content = typeof body?.content === 'string' ? body.content : '';
  const filePath = await writeMarkdown('base', content);
  return NextResponse.json({ content, filePath });
}
