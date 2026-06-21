import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handler } from '../../../mcp/tools/listTasks.js';

describe('listTasks tool', () => {
  let tmpDir: string;
  let missionPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync('/tmp/concert-list-tasks-');
    missionPath = path.join(tmpDir, '.concert', 'missions', 'test-mission');
    const phasesDir = path.join(missionPath, 'phases', '01-start');
    fs.mkdirSync(phasesDir, { recursive: true });

    fs.writeFileSync(path.join(tmpDir, 'state.json'), JSON.stringify({ mission: 'test-mission' }));

    fs.writeFileSync(
      path.join(phasesDir, 'TASK-foo.md'),
      `---
task: foo
title: Foo
wave: 0
model: simple
depends_on: []
---

## Acceptance Criteria

- [ ] Do thing`
    );

    fs.writeFileSync(
      path.join(phasesDir, 'TASK-bar.md'),
      `---
task: bar
title: Bar
wave: 1
depends_on: ['foo']
---

## Acceptance Criteria

- [x] Done`
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists all tasks', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler({ mission: 'test-mission' }, { cwd: tmpDir });
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks.map((t) => t.task)).toEqual(['foo', 'bar']);
  });

  it('filters by status', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler({ mission: 'test-mission', status: 'done' }, { cwd: tmpDir });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]!.task).toBe('bar');
  });

  it('filters by model', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler({ mission: 'test-mission', model: 'simple' }, { cwd: tmpDir });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]!.task).toBe('foo');
  });

  it('filters by wave', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler({ mission: 'test-mission', wave: 1 }, { cwd: tmpDir });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]!.task).toBe('bar');
  });

  it('returns empty for nonexistent mission', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const emptyDir = fs.mkdtempSync('/tmp/concert-empty-');
    fs.writeFileSync(path.join(emptyDir, 'state.json'), JSON.stringify({ mission: 'missing' }));
    try {
      await expect(handler({}, { cwd: emptyDir })).rejects.toThrow();
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
