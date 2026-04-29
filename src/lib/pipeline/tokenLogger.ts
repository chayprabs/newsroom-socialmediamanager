import fs from 'node:fs';
import path from 'node:path';
import type { UsageStageSummary, UsageSummary } from '../types';
import type { AnthropicResponse } from '../server/clients';
import { getRunDir } from '../server/storage';

const PIPELINE_LOG_FILENAME = 'pipeline.log';
const USAGE_SUMMARY_FILENAME = 'usage_summary.json';

interface SonnetUsageLogEntry {
  event: 'sonnet_usage';
  stage: string;
  run_id: string;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

function numeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getPipelineLogPath(runId: string) {
  return path.join(getRunDir(runId), PIPELINE_LOG_FILENAME);
}

function getUsageSummaryPath(runId: string) {
  return path.join(getRunDir(runId), USAGE_SUMMARY_FILENAME);
}

function readUsageEntries(runId: string): SonnetUsageLogEntry[] {
  const logPath = getPipelineLogPath(runId);

  if (!fs.existsSync(logPath)) {
    return [];
  }

  return fs
    .readFileSync(logPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const entry = JSON.parse(line) as Partial<SonnetUsageLogEntry>;
        return entry.event === 'sonnet_usage' && typeof entry.stage === 'string' ? [entry as SonnetUsageLogEntry] : [];
      } catch {
        return [];
      }
    });
}

export function writeSonnetUsageSummary(runId: string): UsageSummary {
  const entries = readUsageEntries(runId);
  const byStage = new Map<string, UsageStageSummary>();

  for (const entry of entries) {
    const current =
      byStage.get(entry.stage) || {
        stage: entry.stage,
        sonnet_calls: 0,
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      };

    current.sonnet_calls += 1;
    current.input_tokens += numeric(entry.input_tokens);
    current.output_tokens += numeric(entry.output_tokens);
    current.cache_creation_input_tokens += numeric(entry.cache_creation_input_tokens);
    current.cache_read_input_tokens += numeric(entry.cache_read_input_tokens);
    byStage.set(entry.stage, current);
  }

  const stages = Array.from(byStage.values()).sort((a, b) => a.stage.localeCompare(b.stage));
  const summary: UsageSummary = {
    run_id: runId,
    generated_at: new Date().toISOString(),
    total_input_tokens: stages.reduce((total, stage) => total + stage.input_tokens, 0),
    total_output_tokens: stages.reduce((total, stage) => total + stage.output_tokens, 0),
    total_cache_reads: stages.reduce((total, stage) => total + stage.cache_read_input_tokens, 0),
    total_cache_writes: stages.reduce((total, stage) => total + stage.cache_creation_input_tokens, 0),
    total_sonnet_calls: stages.reduce((total, stage) => total + stage.sonnet_calls, 0),
    by_stage: stages,
  };

  fs.mkdirSync(getRunDir(runId), { recursive: true });
  fs.writeFileSync(getUsageSummaryPath(runId), JSON.stringify(summary, null, 2), 'utf8');
  return summary;
}

export function readSonnetUsageSummary(runId: string): UsageSummary | null {
  const summaryPath = getUsageSummaryPath(runId);

  if (!fs.existsSync(summaryPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf8')) as UsageSummary;
  } catch {
    return null;
  }
}

export function logSonnetUsage(stage: string, runId: string, response: AnthropicResponse): void {
  const usage = response.usage || {};
  const entry: SonnetUsageLogEntry = {
    event: 'sonnet_usage',
    stage,
    run_id: runId,
    timestamp: new Date().toISOString(),
    model: response.model || 'unknown',
    input_tokens: numeric(usage.input_tokens),
    output_tokens: numeric(usage.output_tokens),
  };

  if (typeof usage.cache_creation_input_tokens === 'number') {
    entry.cache_creation_input_tokens = usage.cache_creation_input_tokens;
  }
  if (typeof usage.cache_read_input_tokens === 'number') {
    entry.cache_read_input_tokens = usage.cache_read_input_tokens;
  }

  fs.mkdirSync(getRunDir(runId), { recursive: true });
  fs.appendFileSync(getPipelineLogPath(runId), `${JSON.stringify(entry)}\n`, 'utf8');
  writeSonnetUsageSummary(runId);

  console.log(
    `[sonnet-usage] run=${runId} stage=${stage} model=${entry.model} input=${entry.input_tokens} output=${entry.output_tokens} cache_read=${entry.cache_read_input_tokens ?? 0} cache_write=${entry.cache_creation_input_tokens ?? 0}`
  );
}
