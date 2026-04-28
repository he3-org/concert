import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { openCache } from '../../../cache/index.js';
import { appendEvent } from '../../../cache/events.js';
import { handler } from '../../../mcp/tools/getState.js';
import { writeState } from '../../../lib/state.js';

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

d('getState with events', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync('/tmp/concert-getstate-events-test-');
    fs.mkdirSync(path.join(tmpDir, '.concert', 'missions', 'm1'), { recursive: true });

    writeState(tmpDir, {
      mission: 'm1',
      mission_path: '.concert/missions/m1',
      workflow: '',
      workflow_path: '',
      branch: 'main',
      pr_number: 0,
      status_display: 'active',
      feature_size: '',
      stage: 'development',
      pipeline: {},
      phases_completed: 0,
      phases_total: 1,
      tasks_completed: 0,
      tasks_total: 3,
      commits: 0,
      cost: { estimated_remaining: '', spent_this_mission: '', by_stage: {} },
      blockers: [],
      telemetry: [],
      failure_log: [],
      history: [],
      next_steps: [],
    });

    // Insert 2 events
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

    handle.close();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('includes recentToolCalls when cache available', async () => {
    const result = await handler({}, { cwd: tmpDir });
    expect(result.found).toBe(true);
    expect(result.recentToolCalls).toBeDefined();
    expect(result.recentToolCalls!.length).toBeLessThanOrEqual(5);
    expect(result.recentToolCalls!.length).toBeGreaterThan(0);
  });

  it('omits recentToolCalls when cache disabled', async () => {
    const prev = process.env.CONCERT_CACHE_DISABLED;
    try {
      process.env.CONCERT_CACHE_DISABLED = '1';
      const result = await handler({}, { cwd: tmpDir });
      expect(result.found).toBe(true);
      expect(result.recentToolCalls).toBeUndefined();
    } finally {
      if (prev !== undefined) {
        process.env.CONCERT_CACHE_DISABLED = prev;
      } else {
        delete process.env.CONCERT_CACHE_DISABLED;
      }
    }
  });
});
