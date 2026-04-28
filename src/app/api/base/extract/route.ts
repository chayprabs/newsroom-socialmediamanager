import { NextRequest, NextResponse } from 'next/server';
import { callAnthropic } from '@/lib/server/clients';
import { readBaseSourceCorpus, writeMarkdown } from '@/lib/server/storage';

interface CorpusSource {
  path: string;
  content: string;
}

function stripMarkdownFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const postedSources: CorpusSource[] = Array.isArray(body?.posts)
    ? body.posts
        .filter((post: unknown): post is string => typeof post === 'string' && post.trim().length > 0)
        .map((content: string, index: number) => ({ path: `request-post-${index + 1}.md`, content }))
    : typeof body?.content === 'string' && body.content.trim()
      ? [{ path: 'request-content.md', content: body.content }]
      : [];

  const fileSources: CorpusSource[] = postedSources.length ? [] : await readBaseSourceCorpus();
  const sources: CorpusSource[] = postedSources.length ? postedSources : fileSources;

  if (!sources.length) {
    return NextResponse.json(
      {
        error:
          'No source corpus found. Add .md/.txt/.json files under base/source/ or send { "posts": ["..."] } to this endpoint.',
      },
      { status: 400 }
    );
  }

  const sourceBundle = sources
    .map((source) => `SOURCE: ${source.path}\n${source.content}`)
    .join('\n\n---\n\n')
    .slice(0, 90_000);

  const extracted = await callAnthropic(`You are creating Newsroom's base.md for Crustdata.

Read this corpus of Crustdata posts and extract a concise, useful editorial DNA document. Do not invent facts. Return markdown only.

The document must include:
- Topic archetypes
- Angle patterns
- Visual conventions
- Voice guidelines
- Caption guidance
- Query/reframing hints for Crustdata API-backed posts

Corpus:
${sourceBundle}`);

  const content = stripMarkdownFence(extracted);
  const filePath = await writeMarkdown('base', content);

  return NextResponse.json({
    content,
    filePath,
    sourceCount: sources.length,
  });
}
