import { NextResponse } from 'next/server';
import { readRunArtifact } from '@/lib/server/storage';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const image = await readRunArtifact(id, 'post.svg');
  const shouldDownload = new URL(request.url).searchParams.get('download') === '1';

  if (!image) {
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  return new NextResponse(image, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="newsroom-${id}.svg"`,
    },
  });
}
