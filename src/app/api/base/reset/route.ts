import { NextResponse } from 'next/server';
import { getMarkdownPath, resetMarkdown } from '@/lib/server/storage';

export async function POST() {
  return NextResponse.json({ content: await resetMarkdown('base'), filePath: getMarkdownPath('base') });
}
