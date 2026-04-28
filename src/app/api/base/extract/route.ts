import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Seed extraction is scaffolded but waits for the source corpus.' },
    { status: 501 }
  );
}
