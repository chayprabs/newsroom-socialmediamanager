import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { RunState, RunSummary } from '../types';

const DATA_ROOT = process.env.NEWSROOM_DATA_DIR
  ? path.resolve(process.env.NEWSROOM_DATA_DIR)
  : process.env.VERCEL
    ? path.join('/tmp', 'newsroom')
    : process.cwd();

const BASE_DIR = path.join(DATA_ROOT, 'base');
const DESIGN_DIR = path.join(DATA_ROOT, 'design');
const RUNS_DIR = path.join(DATA_ROOT, 'runs');

export const basePath = path.join(BASE_DIR, 'base.md');
export const baseDefaultPath = path.join(BASE_DIR, 'default.md');
export const designPath = path.join(DESIGN_DIR, 'design.md');
export const designDefaultPath = path.join(DESIGN_DIR, 'default.md');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readTextFile(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }

    throw error;
  }
}

export async function readMarkdown(kind: 'base' | 'design') {
  return readTextFile(kind === 'base' ? basePath : designPath);
}

export async function writeMarkdown(kind: 'base' | 'design', content: string) {
  const dir = kind === 'base' ? BASE_DIR : DESIGN_DIR;
  const filePath = kind === 'base' ? basePath : designPath;

  await ensureDir(dir);
  await fs.writeFile(filePath, content, 'utf8');
}

export async function resetMarkdown(kind: 'base' | 'design') {
  const defaultPath = kind === 'base' ? baseDefaultPath : designDefaultPath;
  const content = await readTextFile(defaultPath);
  await writeMarkdown(kind, content);
  return content;
}

export function getRunDir(runId: string) {
  return path.join(RUNS_DIR, runId);
}

export function getRunStatePath(runId: string) {
  return path.join(getRunDir(runId), 'run.json');
}

export async function readRun(runId: string) {
  const content = await readTextFile(getRunStatePath(runId));

  if (!content) {
    return null;
  }

  return JSON.parse(content) as RunState;
}

export async function writeRun(run: RunState) {
  const now = new Date().toISOString();
  const nextRun = { ...run, updated_at: now };

  await ensureDir(getRunDir(run.run_id));
  await fs.writeFile(getRunStatePath(run.run_id), JSON.stringify(nextRun, null, 2), 'utf8');
  return nextRun;
}

export async function listRuns(): Promise<RunSummary[]> {
  await ensureDir(RUNS_DIR);
  const entries = await fs.readdir(RUNS_DIR, { withFileTypes: true });
  const runs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readRun(entry.name))
  );

  return runs
    .filter((run): run is RunState => Boolean(run))
    .filter((run) => run.status === 'ready' || run.status === 'saved')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((run) => ({
      run_id: run.run_id,
      headline: run.selected_candidate?.headline ?? run.data?.title ?? 'Untitled run',
      date: new Date(run.saved_at ?? run.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: run.status,
      image_url: run.image_path ? `/api/runs/${run.run_id}/image` : undefined,
    }));
}

export async function deleteRun(runId: string) {
  await fs.rm(getRunDir(runId), { recursive: true, force: true });
}

export async function writeRunArtifact(runId: string, filename: string, content: string) {
  await ensureDir(getRunDir(runId));
  const filePath = path.join(getRunDir(runId), filename);
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

export async function readRunArtifact(runId: string, filename: string) {
  return readTextFile(path.join(getRunDir(runId), filename));
}
