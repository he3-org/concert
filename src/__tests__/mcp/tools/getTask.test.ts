import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handler } from '../../../mcp/tools/getTask.js';

describe('getTask tool', () => {
  let tmpDir: string;
  let missionPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync('/tmp/concert-get-task-');
    missionPath = path.join(tmpDir, '.concert', 'missions', 'test');
    const phasesDir = path.join(missionPath, 'phases', '01-phase');
    fs.mkdirSync(phasesDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'state.json'), JSON.stringify({ mission: 'test' }));

    fs.writeFileSync(
      path.join(phasesDir, 'TASK-demo.md'),
      `---
task: demo
title: Demo Task
wave: 0
model: sonnet
depends_on: ['prereq']
---

## Description

Build the feature.

## Acceptance Criteria

- [ ] Create file
- [x] Write test

## Notes

Use the API.`
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('fetches task details with body sections', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler({ mission: 'test', task: 'demo' }, { cwd: tmpDir });
    expect(result.found).toBe(true);
    expect(result.task).toBe('demo');
    expect(result.title).toBe('Demo Task');
    expect(result.model).toBe('sonnet');
    expect(result.dependsOn).toEqual(['prereq']);
    expect(result.acceptance).toHaveLength(2);
    expect(result.acceptance?.[0]).toMatchObject({ index: 0, text: 'Create file', done: false });
    expect(result.acceptance?.[1]).toMatchObject({ index: 1, text: 'Write test', done: true });
    expect(result.body?.description).toContain('Build the feature.');
    expect(result.body?.notes).toContain('Use the API.');
  });

  it('returns not found for missing task', async () => {
    process.env.CONCERT_CACHE_DISABLED = '1';
    const result = await handler({ mission: 'test', task: 'missing' }, { cwd: tmpDir });
    expect(result.found).toBe(false);
  });
});
