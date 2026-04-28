import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ensureDataSubdir } from './storage';

interface CacheEnvelope<T> {
  createdAt: string;
  key: string;
  value: T;
}

function cacheTtlMs() {
  const hours = Number(process.env.NEWSROOM_CACHE_TTL_HOURS ?? 24);
  return Math.max(hours, 0) * 60 * 60 * 1000;
}

function hashKey(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function safeName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

export async function getCachedValue<T>(namespace: string, input: unknown) {
  const key = hashKey(input);
  const dir = await ensureDataSubdir('research', 'api_responses', 'cache');
  const cachePath = path.join(dir, `${safeName(namespace)}-${key}.json`);

  try {
    const envelope = JSON.parse(await fs.readFile(cachePath, 'utf8')) as CacheEnvelope<T>;
    const age = Date.now() - new Date(envelope.createdAt).getTime();
    if (envelope.key === key && age <= cacheTtlMs()) {
      return { hit: true, value: envelope.value, cachePath };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return { hit: false, key, cachePath };
}

export async function setCachedValue<T>(cachePath: string, key: string, value: T) {
  const envelope: CacheEnvelope<T> = {
    createdAt: new Date().toISOString(),
    key,
    value,
  };

  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(envelope, null, 2), 'utf8');
}
