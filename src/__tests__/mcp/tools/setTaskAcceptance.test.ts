import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handler } from '../../../mcp/tools/setTaskAcceptance.js';

describe('setTaskAcceptance tool', () => {
  let tmpDir: string;
  let missionPath: string;
  let taskPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync('/tmp/concert-set-accept-');
    missionPath = path.join(tmpDir, '.concert', 'missions', 'test');
    const phasesDir = path.join(missionPath, 'phases', '01-p');
    fs.mkdirSync(phasesDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'state.json'), JSON.stringify({ mission: 'test' }));

    taskPath = path.join(phasesDir, 'TASK-example.md');
    fs.writeFileSync(
      taskPath,
      `---
task: example
title: Example
---

## Acceptance Criteria

- [ ] First item
- [ ] Second item`
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('flips acceptance by index', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler(
      { mission: 'test', task: 'example', index: 0, checked: true },
      { cwd: tmpDir }
    );
    expect(result.ok).toBe(true);
    expect(result.previous).toBe(false);
    expect(result.current).toBe(true);
    expect(result.completedAcceptance).toBe(1);

    const content = fs.readFileSync(taskPath, 'utf-8');
    expect(content).toContain('- [x] First item');
  });

  it('flips acceptance by text', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler(
      { mission: 'test', task: 'example', text: 'Second', checked: true },
      { cwd: tmpDir }
    );
    expect(result.ok).toBe(true);
    const content = fs.readFileSync(taskPath, 'utf-8');
    expect(content).toContain('- [x] Second item');
  });

  it('rejects ambiguous text', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler(
      { mission: 'test', task: 'example', text: 'item', checked: true },
      { cwd: tmpDir }
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ambiguous');
  });

  it('rejects no match', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler(
      { mission: 'test', task: 'example', index: 99, checked: true },
      { cwd: tmpDir }
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('no matching');
  });

  it('is idempotent', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    await handler({ mission: 'test', task: 'example', index: 0, checked: true }, { cwd: tmpDir });
    const result2 = await handler(
      { mission: 'test', task: 'example', index: 0, checked: true },
      { cwd: tmpDir }
    );
    expect(result2.ok).toBe(true);
    expect(result2.previous).toBe(true);
    expect(result2.current).toBe(true);
  });
});
