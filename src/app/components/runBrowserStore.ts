'use client';

import type { RunState } from '@/lib/types';

const RUN_STORAGE_PREFIX = 'newsroom:run:';
const CHART_TYPE_STORAGE_PREFIX = 'newsroom:chart-type:';

function storageTargets() {
  if (typeof window === 'undefined') return [];
  return [window.sessionStorage, window.localStorage];
}

function runStorageKey(runId: string) {
  return `${RUN_STORAGE_PREFIX}${runId}`;
}

function chartTypeStorageKey(runId: string) {
  return `${CHART_TYPE_STORAGE_PREFIX}${runId}`;
}

function clearOtherRuns(storage: Storage, runId: string) {
  const keepKey = runStorageKey(runId);
  const keepChartTypeKey = chartTypeStorageKey(runId);
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (
      (key?.startsWith(RUN_STORAGE_PREFIX) && key !== keepKey) ||
      (key?.startsWith(CHART_TYPE_STORAGE_PREFIX) && key !== keepChartTypeKey)
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

function withoutInlineImage(run: RunState): RunState {
  const { image_data_url: _imageDataUrl, ...rest } = run;
  return rest;
}

function parseStoredRun(value: string | null, runId: string): RunState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as RunState;
    return parsed?.run_id === runId ? parsed : null;
  } catch {
    return null;
  }
}

export function getStoredRun(runId: string | null) {
  if (!runId) return null;

  for (const storage of storageTargets()) {
    const run = parseStoredRun(storage.getItem(runStorageKey(runId)), runId);
    if (run) return run;
  }

  return null;
}

export function storeRun(run: RunState | null) {
  if (!run) return;

  for (const storage of storageTargets()) {
    clearOtherRuns(storage, run.run_id);

    try {
      storage.setItem(runStorageKey(run.run_id), JSON.stringify(run));
      continue;
    } catch {
      // A rendered image can be several MB. Keep the workflow state even if the
      // inline image is too large for browser storage.
    }

    try {
      storage.setItem(runStorageKey(run.run_id), JSON.stringify(withoutInlineImage(run)));
    } catch {
      // Browser storage is best-effort; the server snapshot still travels with
      // the immediate request body when callers have an in-memory run.
    }
  }
}

export function requestRunSnapshot(runId: string | null, run: RunState | null) {
  const snapshot = run ?? getStoredRun(runId);
  return snapshot ? withoutInlineImage(snapshot) : undefined;
}

export function getPendingChartType(runId: string | null) {
  if (!runId) return '';

  for (const storage of storageTargets()) {
    const value = storage.getItem(chartTypeStorageKey(runId));
    if (value) return value;
  }

  return '';
}

export function setPendingChartType(runId: string | null, chartType: string) {
  if (!runId) return;

  for (const storage of storageTargets()) {
    try {
      storage.setItem(chartTypeStorageKey(runId), chartType);
    } catch {
      // Best-effort only. The selected chart type also travels in the URL.
    }
  }
}

export function clearPendingChartType(runId: string | null) {
  if (!runId) return;

  for (const storage of storageTargets()) {
    storage.removeItem(chartTypeStorageKey(runId));
  }
}
