import { NextResponse, type NextRequest } from 'next/server';
import { createRun, MAX_STEERING_INPUT_CHARS } from '@/lib/server/pipeline';
import { listRuns } from '@/lib/server/storage';
import { getRecentSteerings } from '@/lib/pipeline/topicHistory';

const RECENT_STEERINGS_LOOKBACK_RUNS = 5;

export async function GET() {
  const [runs, recentSteerings] = await Promise.all([
    listRuns(),
    getRecentSteerings(RECENT_STEERINGS_LOOKBACK_RUNS),
  ]);
  return NextResponse.json({ runs, recent_steerings: recentSteerings });
}

export async function POST(request: NextRequest) {
  let steeringInput: string | undefined;
  let steeringInputTruncatedFromChars: number | undefined;

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { steering_input?: unknown };
      const raw = body?.steering_input;

      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.length > MAX_STEERING_INPUT_CHARS) {
          steeringInputTruncatedFromChars = trimmed.length;
          console.warn(
            `[POST /api/runs] steering_input is ${trimmed.length} chars; truncating to ${MAX_STEERING_INPUT_CHARS}.`,
          );
          steeringInput = trimmed.slice(0, MAX_STEERING_INPUT_CHARS);
        } else if (trimmed.length > 0) {
          steeringInput = trimmed;
        }
      }
    }
  } catch {
    // Empty/invalid bodies are fine — fall through to an unsteered run.
  }

  return NextResponse.json({
    run: await createRun({ steeringInput, steeringInputTruncatedFromChars }),
  });
}
