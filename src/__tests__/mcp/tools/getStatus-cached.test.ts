import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { openCache } from '../../../cache/index.js';
import { indexMission } from '../../../cache/indexer.js';
import { handler } from '../../../mcp/tools/getStatus.js';
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

d('getStatus with cache', () => {
  let tmpDir: string;
  let missionPath: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync('/tmp/concert-getstatus-cached-test-');
    missionPath = path.join(tmpDir, '.concert', 'missions', 'm1');
    fs.mkdirSync(missionPath, { recursive: true });

    // Create DEVELOPMENT-REVIEW.md
    fs.writeFileSync(
      path.join(missionPath, 'DEVELOPMENT-REVIEW.md'),
      `# Development Review

## Gaps

- Critical: Fix security bug
- Critical: Update auth [x]
- Major: Refactor API
`
    );

    // Create REFACTOR-PLAN-2026-01.md
    fs.writeFileSync(
      path.join(missionPath, 'REFACTOR-PLAN-2026-01.md'),
      `# Refactor Plan

## Items

- P0: Database schema migration
- P0: Remove deprecated endpoint Resolved
- P1: Optimize queries
`
    );

    // Write state
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

    // Index the mission
    const handle = await openCache(tmpDir);
    if (!handle) throw new Error('Failed to open cache');
    const db = handle.db as {
      exec(sql: string): void;
      prepare(sql: string): {
        run(...args: unknown[]): unknown;
        all(...args: unknown[]): unknown[];
      };
    };
    indexMission(db, tmpDir, 'm1', missionPath);
    handle.close();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns gap counts from cache', async () => {
    const result = await handler({}, { cwd: tmpDir });
    expect(result.found).toBe(true);
    expect(result.developmentReviewGaps).not.toBeNull();
    expect(result.developmentReviewGaps?.critical.open).toBe(1);
    expect(result.developmentReviewGaps?.critical.total).toBe(2);
    expect(result.developmentReviewGaps?.major.open).toBe(1);
    expect(result.developmentReviewGaps?.major.total).toBe(1);
  });

  it('returns refactor counts from cache', async () => {
    const result = await handler({}, { cwd: tmpDir });
    expect(result.found).toBe(true);
    expect(result.refactorPlan).not.toBeNull();
    expect(result.refactorPlan?.p0.open).toBe(1);
    expect(result.refactorPlan?.p0.total).toBe(2);
    expect(result.refactorPlan?.p1.open).toBe(1);
    expect(result.refactorPlan?.p1.total).toBe(1);
  });
});
