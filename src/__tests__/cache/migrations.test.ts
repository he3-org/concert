import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { openCache, SCHEMA_VERSION } from '../../cache/index.js';
import { MIGRATIONS } from '../../cache/migrations/index.js';

// Skip when better-sqlite3 native module isn't installed (it's an optional dep).
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

d('cache migrations (inlined)', () => {
  let cwd: string;

  beforeAll(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-cache-mig-'));
  });

  it('SCHEMA_VERSION matches the latest inlined migration', () => {
    const last = MIGRATIONS[MIGRATIONS.length - 1]!;
    expect(SCHEMA_VERSION).toBe(last.version);
    expect(MIGRATIONS.length).toBeGreaterThan(0);
  });

  it('opens a fresh cache and applies every migration', async () => {
    const handle = await openCache(cwd);
    expect(handle).not.toBeNull();
    try {
      const db = handle!.db as {
        prepare(s: string): { get(...a: unknown[]): unknown };
      };
      const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
        | { value: string }
        | undefined;
      expect(row?.value).toBe(String(SCHEMA_VERSION));

      // Every table from every migration must exist.
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
      ) as unknown as { all(): Array<{ name: string }> };
      const names = tables.all().map((t) => t.name);
      for (const expected of [
        'meta',
        'missions',
        'documents',
        'sections',
        'modified_markers',
        'events',
      ]) {
        expect(names).toContain(expected);
      }
    } finally {
      handle!.close();
    }
  });

  it('opens an existing cache without re-running migrations', async () => {
    // Reuse the cwd from the previous test — the db file is already there.
    const handle = await openCache(cwd);
    expect(handle).not.toBeNull();
    try {
      const db = handle!.db as { prepare(s: string): { get(...a: unknown[]): unknown } };
      const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
        | { value: string }
        | undefined;
      expect(row?.value).toBe(String(SCHEMA_VERSION));
    } finally {
      handle!.close();
    }
  });
});
