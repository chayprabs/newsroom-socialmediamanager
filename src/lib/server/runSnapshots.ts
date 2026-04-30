import type { RunState } from '../types';
import { readRun, writeRun } from './storage';

export type RunSnapshotBody = {
  run?: unknown;
};

function isRunSnapshot(value: unknown, runId: string): value is RunState {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<RunState>;
  return (
    candidate.run_id === runId &&
    typeof candidate.created_at === 'string' &&
    typeof candidate.updated_at === 'string' &&
    typeof candidate.status === 'string' &&
    Array.isArray(candidate.logs) &&
    Array.isArray(candidate.candidates) &&
    Array.isArray(candidate.generation_steps)
  );
}

export async function readJsonBody<T extends RunSnapshotBody>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function ensureRunFromSnapshot(runId: string, snapshot: unknown) {
  const existingRun = await readRun(runId);
  if (existingRun) return existingRun;

  if (!isRunSnapshot(snapshot, runId)) {
    return null;
  }

  return writeRun(snapshot);
}
