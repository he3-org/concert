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

d('indexMission - tasks', () => {
  let tmpDir: string;
  let missionPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync('/tmp/concert-indexer-tasks-test-');
    missionPath = path.join(tmpDir, 'missions', 'demo');
    fs.mkdirSync(missionPath, { recursive: true });

    const phase1 = path.join(missionPath, 'phases', '01-foundation');
    const phase2 = path.join(missionPath, 'phases', '02-features');
    fs.mkdirSync(phase1, { recursive: true });
    fs.mkdirSync(phase2, { recursive: true });

    fs.writeFileSync(
      path.join(phase1, 'TASK-setup.md'),
      `---
task: setup
title: Setup infrastructure
phase: 01-foundation
wave: 0
model: simple
depends_on: []
---

## Acceptance Criteria

- [ ] Create database schema
- [x] Deploy to staging`
    );

    fs.writeFileSync(
      path.join(phase1, 'TASK-config.md'),
      `---
task: config
title: Configuration
wave: 1
depends_on: ['setup']
---

## Acceptance Criteria

- [ ] Add env vars`
    );

    fs.writeFileSync(
      path.join(phase2, 'TASK-feature-a.md'),
      `---
task: feature-a
title: Feature A
phase: 02-features
wave: 0
model: average
depends_on: ['config']
---

## Acceptance Criteria

- [x] Build feature
- [x] Test feature`
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('indexes tasks and counts acceptance criteria', async () => {
    const handle = await openCache(tmpDir);
    expect(handle).not.toBeNull();

    try {
      const db = handle!.db as {
        exec(sql: string): void;
        prepare(sql: string): {
          run(...args: unknown[]): unknown;
          all(...args: unknown[]): unknown[];
        };
      };

      const result = indexMission(db, tmpDir, 'demo', missionPath);
      expect(result.tasksIndexed).toBe(3);

      const rows = db
        .prepare(
          'SELECT task_slug, phase, wave, model, depends_on, total_acceptance, completed_acceptance FROM tasks WHERE mission_slug = ? ORDER BY phase, wave, task_slug'
        )
        .all('demo') as Array<{
        task_slug: string;
        phase: string | null;
        wave: number;
        model: string | null;
        depends_on: string;
        total_acceptance: number;
        completed_acceptance: number;
      }>;

      expect(rows).toHaveLength(3);

      // Check all tasks are present (order is by phase, wave, task_slug)
      const setup = rows.find((r) => r.task_slug === 'setup')!;
      expect(setup).toMatchObject({
        task_slug: 'setup',
        phase: '01-foundation',
        wave: 0,
        model: 'simple',
        total_acceptance: 2,
        completed_acceptance: 1,
      });

      const config = rows.find((r) => r.task_slug === 'config')!;
      expect(config).toMatchObject({
        task_slug: 'config',
        phase: '01-foundation',
        wave: 1,
        model: null,
        total_acceptance: 1,
        completed_acceptance: 0,
      });

      const featureA = rows.find((r) => r.task_slug === 'feature-a')!;
      expect(featureA).toMatchObject({
        task_slug: 'feature-a',
        phase: '02-features',
        wave: 0,
        model: 'average',
        total_acceptance: 2,
        completed_acceptance: 2,
      });

      const setupDeps = JSON.parse(setup.depends_on) as string[];
      expect(setupDeps).toEqual([]);

      const featureDeps = JSON.parse(featureA.depends_on) as string[];
      expect(featureDeps).toEqual(['config']);
    } finally {
      handle!.close();
    }
  });

  it('removes orphaned tasks after file deletion', async () => {
    const handle = await openCache(tmpDir);
    expect(handle).not.toBeNull();

    try {
      const db = handle!.db as {
        exec(sql: string): void;
        prepare(sql: string): {
          run(...args: unknown[]): unknown;
          all(...args: unknown[]): unknown[];
        };
      };

      indexMission(db, tmpDir, 'demo', missionPath);

      const beforeCount = (
        db.prepare('SELECT COUNT(*) as c FROM tasks WHERE mission_slug = ?').all('demo') as Array<{
          c: number;
        }>
      )[0]!.c;
      expect(beforeCount).toBe(3);

      fs.unlinkSync(path.join(missionPath, 'phases', '02-features', 'TASK-feature-a.md'));

      indexMission(db, tmpDir, 'demo', missionPath);

      const afterCount = (
        db.prepare('SELECT COUNT(*) as c FROM tasks WHERE mission_slug = ?').all('demo') as Array<{
          c: number;
        }>
      )[0]!.c;
      expect(afterCount).toBe(2);
    } finally {
      handle!.close();
    }
  });
});
