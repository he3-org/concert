import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handler as getSummaryHandler } from '../../../mcp/tools/getSummary.js';

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

d('concert.get_summary', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'test-summary-'));
    const concertDir = path.join(tmpDir, '.concert');
    fs.mkdirSync(concertDir, { recursive: true });

    // Mission 1: has gaps and tasks
    const m1 = path.join(concertDir, 'missions', 'm1');
    fs.mkdirSync(m1, { recursive: true });
    fs.writeFileSync(path.join(m1, 'stage.txt'), 'develop');
    fs.writeFileSync(
      path.join(m1, 'DEVELOPMENT-REVIEW.md'),
      `# Review
- Critical: Issue 1
- Major: Issue 2
- Minor: Issue 3 [x]
`
    );
    fs.writeFileSync(
      path.join(m1, 'REFACTOR-PLAN-2026-04.md'),
      `# Refactor
- P0: Task 1
- P1: Task 2 Resolved
- P2: Task 3
`
    );

    // Create task files for m1
    const phase1 = path.join(m1, 'phases', '01-phase');
    fs.mkdirSync(phase1, { recursive: true });
    fs.writeFileSync(
      path.join(phase1, 'TASK-one.md'),
      `---
task: one
title: Task One
phase: 01-phase
wave: 0
model: haiku
depends_on: []
---

## Acceptance Criteria

- [x] Step 1
- [x] Step 2
`
    );
    fs.writeFileSync(
      path.join(phase1, 'TASK-two.md'),
      `---
task: two
title: Task Two
phase: 01-phase
wave: 0
model: haiku
depends_on: []
---

## Acceptance Criteria

- [x] Step 1
- [ ] Step 2
`
    );

    // Mission 2: no gaps, no refactor
    const m2 = path.join(concertDir, 'missions', 'm2');
    fs.mkdirSync(m2, { recursive: true });
    fs.writeFileSync(path.join(m2, 'stage.txt'), 'vision');

    // Create state.json pointing to m1
    fs.writeFileSync(
      path.join(concertDir, 'state.json'),
      JSON.stringify({
        mission: 'm1',
        mission_path: '.concert/missions/m1',
        stage: 'develop',
      })
    );
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns summary from cache', async () => {
    const result = await getSummaryHandler({}, { cwd: tmpDir });

    // Check we can find missions
    expect(result.missions.length).toBeGreaterThanOrEqual(1);

    const m1 = result.missions.find((m) => m.slug === 'm1');
    expect(m1).toBeDefined();
    expect(m1?.stage).toBe('develop');
    expect(m1?.tasksTotal).toBe(2);
    expect(m1?.tasksDone).toBe(1);
    expect(m1?.tasksInProgress).toBe(1);
    expect(m1?.gapsCritical).toBe(1);
    expect(m1?.gapsMajor).toBe(1);
    expect(m1?.gapsMinor).toBe(0); // resolved
    expect(m1?.refactorP0).toBe(1);
    expect(m1?.refactorP1).toBe(0); // resolved
    expect(m1?.refactorP2).toBe(1);

    // m2 may not be included if it has no indexed documents
  });

  it('returns summary from files when cache disabled', async () => {
    const oldEnv = process.env.CONCERT_CACHE_DISABLED;
    process.env.CONCERT_CACHE_DISABLED = '1';

    try {
      const result = await getSummaryHandler({}, { cwd: tmpDir });

      expect(result.missions.length).toBeGreaterThanOrEqual(1);

      const m1 = result.missions.find((m) => m.slug === 'm1');
      expect(m1).toBeDefined();
      expect(m1?.gapsCritical).toBe(1);
      expect(m1?.gapsMajor).toBe(1);
      expect(m1?.gapsMinor).toBe(0);
      expect(m1?.refactorP0).toBe(1);
      expect(m1?.refactorP1).toBe(0);
      expect(m1?.refactorP2).toBe(1);
    } finally {
      if (oldEnv === undefined) {
        delete process.env.CONCERT_CACHE_DISABLED;
      } else {
        process.env.CONCERT_CACHE_DISABLED = oldEnv;
      }
    }
  });

  it('includes generatedAt timestamp', async () => {
    const result = await getSummaryHandler({}, { cwd: tmpDir });
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
