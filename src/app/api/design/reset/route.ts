import { NextResponse } from 'next/server';
import { resetMarkdown } from '@/lib/server/storage';

export async function POST() {
  return NextResponse.json({ content: await resetMarkdown('design') });
}
