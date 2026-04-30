import { readRun } from '@/lib/server/storage';
import { readSonnetUsageSummary } from '@/lib/pipeline/tokenLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

const terminalStatuses = ['no_matches', 'awaiting_selection', 'awaiting_chart_type_selection', 'ready', 'saved', 'failed'];

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const run = await readRun(id);
        const usageSummary = readSonnetUsageSummary(id);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ run: run ? { ...run, usage_summary: usageSummary || undefined } : run })}\n\n`));
        return run;
      };

      const firstRun = await send();
      if (!firstRun || terminalStatuses.includes(firstRun.status)) {
        controller.close();
        return;
      }

      const interval = setInterval(async () => {
        const run = await send();
        if (!run || terminalStatuses.includes(run.status)) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
