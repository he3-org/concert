import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { openCache } from '../../cache/index.js';
import { indexMission } from '../../cache/indexer.js';

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

d('indexMission - gaps and refactor', () => {
  let tmpDir: string;
  let missionPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'test-gaps-'));
    missionPath = path.join(tmpDir, 'missions', 'demo');
    fs.mkdirSync(missionPath, { recursive: true });

    // DEVELOPMENT-REVIEW.md with 2 gaps (1 resolved)
    fs.writeFileSync(
      path.join(missionPath, 'DEVELOPMENT-REVIEW.md'),
      `# Development Review

## Gaps

- Critical: Missing error handling in auth module
- Major: No logging for failed requests [x]
- Minor: Update README
`
    );

    // REFACTOR-PLAN-2026-04.md with 3 items (1 resolved)
    fs.writeFileSync(
      path.join(missionPath, 'REFACTOR-PLAN-2026-04.md'),
      `# Refactor Plan

- P0: Extract database layer
- P1: Consolidate validation logic Resolved
- P1: Move constants to config
- P2: Add TypeScript types
`
    );

    // Create a stage file
    fs.writeFileSync(path.join(missionPath, 'stage.txt'), 'develop');
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('indexes gaps correctly', async () => {
    const handle = await openCache(tmpDir);
    if (!handle) throw new Error('Failed to open cache');

    try {
      const db = handle.db as {
        exec(sql: string): void;
        prepare(sql: string): {
          run(...args: unknown[]): unknown;
          all(...args: unknown[]): unknown[];
        };
      };

      const result = indexMission(db, tmpDir, 'demo', missionPath);

      expect(result.gapsIndexed).toBe(3);

      const gaps = db
        .prepare('SELECT severity, text, resolved FROM gaps WHERE mission_slug = ?')
        .all('demo') as { severity: string; text: string; resolved: number }[];

      expect(gaps).toHaveLength(3);

      const critical = gaps.find((g) => g.severity === 'critical');
      expect(critical).toBeDefined();
      expect(critical?.text).toContain('Missing error handling');
      expect(critical?.resolved).toBe(0);

      const major = gaps.find((g) => g.severity === 'major');
      expect(major).toBeDefined();
      expect(major?.resolved).toBe(1);

      const minor = gaps.find((g) => g.severity === 'minor');
      expect(minor).toBeDefined();
      expect(minor?.resolved).toBe(0);

      // Check open count
      const openGaps = gaps.filter((g) => g.resolved === 0);
      expect(openGaps).toHaveLength(2);
    } finally {
      handle.close();
    }
  });

  it('indexes refactor items correctly', async () => {
    const handle = await openCache(tmpDir);
    if (!handle) throw new Error('Failed to open cache');

    try {
      const db = handle.db as {
        exec(sql: string): void;
        prepare(sql: string): {
          run(...args: unknown[]): unknown;
          all(...args: unknown[]): unknown[];
        };
      };

      const result = indexMission(db, tmpDir, 'demo', missionPath);

      expect(result.refactorItemsIndexed).toBe(4);

      const items = db
        .prepare('SELECT priority, text, resolved FROM refactor_items WHERE mission_slug = ?')
        .all('demo') as { priority: string; text: string; resolved: number }[];

      expect(items).toHaveLength(4);

      const p0Items = items.filter((i) => i.priority === 'p0');
      expect(p0Items).toHaveLength(1);
      expect(p0Items[0].resolved).toBe(0);

      const p1Items = items.filter((i) => i.priority === 'p1');
      expect(p1Items).toHaveLength(2);
      const resolvedP1 = p1Items.filter((i) => i.resolved === 1);
      expect(resolvedP1).toHaveLength(1);

      const p2Items = items.filter((i) => i.priority === 'p2');
      expect(p2Items).toHaveLength(1);

      // Check open count
      const openItems = items.filter((i) => i.resolved === 0);
      expect(openItems).toHaveLength(3);
    } finally {
      handle.close();
    }
  });

  it('is idempotent on reindex', async () => {
    const handle = await openCache(tmpDir);
    if (!handle) throw new Error('Failed to open cache');

    try {
      const db = handle.db as {
        exec(sql: string): void;
        prepare(sql: string): {
          run(...args: unknown[]): unknown;
          all(...args: unknown[]): unknown[];
        };
      };

      const result1 = indexMission(db, tmpDir, 'demo', missionPath);
      const result2 = indexMission(db, tmpDir, 'demo', missionPath);

      expect(result1.gapsIndexed).toBe(result2.gapsIndexed);
      expect(result1.refactorItemsIndexed).toBe(result2.refactorItemsIndexed);

      const gaps = db
        .prepare('SELECT COUNT(*) as count FROM gaps WHERE mission_slug = ?')
        .all('demo') as { count: number }[];
      expect(gaps[0].count).toBe(3);

      const items = db
        .prepare('SELECT COUNT(*) as count FROM refactor_items WHERE mission_slug = ?')
        .all('demo') as { count: number }[];
      expect(items[0].count).toBe(4);
    } finally {
      handle.close();
    }
  });

  it('drops gap counts to zero when DEVELOPMENT-REVIEW.md deleted', async () => {
    const handle = await openCache(tmpDir);
    if (!handle) throw new Error('Failed to open cache');

    try {
      const db = handle.db as {
        exec(sql: string): void;
        prepare(sql: string): {
          run(...args: unknown[]): unknown;
          all(...args: unknown[]): unknown[];
        };
      };

      // Index with file present
      indexMission(db, tmpDir, 'demo', missionPath);

      // Delete file
      fs.unlinkSync(path.join(missionPath, 'DEVELOPMENT-REVIEW.md'));

      // Reindex
      const result = indexMission(db, tmpDir, 'demo', missionPath);
      expect(result.gapsIndexed).toBe(0);

      const gaps = db
        .prepare('SELECT COUNT(*) as count FROM gaps WHERE mission_slug = ?')
        .all('demo') as { count: number }[];
      expect(gaps[0].count).toBe(0);
    } finally {
      handle.close();
    }
  });
});
