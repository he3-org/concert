import { openCache, type CacheHandle } from './index.js';
import { ensureFresh } from './invalidate.js';
import { appendEvent, type EventRecord } from './events.js';
import { recordMiss } from './stats.js';

export async function withCache<T>(
  cwd: string,
  withDb: (handle: CacheHandle) => Promise<T> | T,
  fallback: () => Promise<T> | T
): Promise<T> {
  const handle = await openCache(cwd);
  if (!handle) {
    recordMiss();
    return await fallback();
  }

  try {
    ensureFresh(
      handle.db as {
        exec(sql: string): void;
        prepare(sql: string): {
          all(...args: unknown[]): unknown[];
          run(...args: unknown[]): unknown;
        };
      },
      cwd
    );
    const result = await withDb(handle);
    return result;
  } finally {
    handle.close();
  }
}

export async function appendEventSafe(cwd: string, record: EventRecord): Promise<void> {
  try {
    const handle = await openCache(cwd);
    if (!handle) return;
    try {
      appendEvent(
        handle.db as {
          prepare(sql: string): {
            run(...args: unknown[]): unknown;
          };
        },
        record
      );
    } finally {
      handle.close();
    }
  } catch {
    // Silent no-op on cache failure
  }
}
