import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { openCache } from '../../../cache/index.js';
import { appendEvent } from '../../../cache/events.js';
import { handler } from '../../../mcp/tools/getEvents.js';

const hasSqlite = await (async () => {
  try {
    // @ts-expect-error -- optional native dep, lazy-loaded
    await import('better-sqlite3');
    return true;
  } catch {
    return false;
  }
})();
const d = hasSqlite ? describe : describe.skip;

d('getEvents tool', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync('/tmp/concert-getevents-test-');
    fs.mkdirSync(path.join(tmpDir, '.concert'), { recursive: true });

    // Open cache and insert 3 events
    const handle = await openCache(tmpDir);
    if (!handle) throw new Error('Failed to open cache');
    const db = handle.db as {
      prepare(sql: string): {
        run(...args: unknown[]): unknown;
      };
    };

    appendEvent(db, {
      ts: '2026-01-01T10:00:00Z',
      mission_slug: 'm1',
      tool: 'concert.replace_section',
      args_hash: 'hash1',
      doc: 'PLAN.md',
      section: 'overview',
      ok: true,
      error_class: null,
      duration_ms: 42,
    });

    appendEvent(db, {
      ts: '2026-01-01T10:01:00Z',
      mission_slug: 'm1',
      tool: 'concert.append_history',
      args_hash: 'hash2',
      doc: null,
      section: null,
      ok: false,
      error_class: 'ValidationError',
      duration_ms: 8,
    });

    appendEvent(db, {
      ts: '2026-01-01T10:02:00Z',
      mission_slug: 'other',
      tool: 'concert.get_status',
      args_hash: 'hash3',
      doc: null,
      section: null,
      ok: true,
      error_class: null,
      duration_ms: 15,
    });

    handle.close();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns all events with no filter', async () => {
    const result = await handler({}, { cwd: tmpDir });
    expect(result.events.length).toBe(3);
    expect(result.total).toBe(3);
    expect(result.generatedAt).toBeDefined();
  });

  it('respects limit parameter', async () => {
    const result = await handler({ limit: 2 }, { cwd: tmpDir });
    expect(result.events.length).toBe(2);
    expect(result.total).toBe(3);
  });

  it('filters by mission', async () => {
    const result = await handler({ mission: 'other' }, { cwd: tmpDir });
    expect(result.events.length).toBe(1);
    expect(result.total).toBe(1);
    expect(result.events[0].mission_slug).toBe('other');
  });

  it('returns empty result when cache disabled', async () => {
    const prev = process.env.CONCERT_CACHE_DISABLED;
    try {
      process.env.CONCERT_CACHE_DISABLED = '1';
      const result = await handler({}, { cwd: tmpDir });
      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    } finally {
      if (prev !== undefined) {
        process.env.CONCERT_CACHE_DISABLED = prev;
      } else {
        delete process.env.CONCERT_CACHE_DISABLED;
      }
    }
  });
});
