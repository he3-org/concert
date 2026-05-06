import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runMarkSectionModified } from '../../commands/markSectionModified.js';
import { runClearSectionModified } from '../../commands/clearSectionModified.js';
import { writeState } from '../../lib/state.js';
import type { ConcertState } from '../../types.js';

let tmpDir: string;
let missionDir: string;
let docPath: string;

const baseState: ConcertState = {
  mission: 'm1',
  mission_path: '.concert/missions/m1',
  workflow: '',
  workflow_path: '',
  branch: '',
  pr_number: 0,
  status_display: 'wip_pr',
  feature_size: '',
  stage: '',
  pipeline: {},
  phases_completed: 0,
  phases_total: 0,
  tasks_completed: 0,
  tasks_total: 0,
  commits: 0,
  cost: { estimated_remaining: '', spent_this_mission: '', by_stage: {} },
  blockers: [],
  telemetry: [],
  failure_log: [],
  history: [],
  next_steps: [],
};

const SAMPLE_DOC = `# Vision

## Problem Statement

Body 1.

## Target Users

Body 2.

## Success Criteria

Body 3.
`;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-cli-batch-'));
  missionDir = path.join(tmpDir, '.concert', 'missions', 'm1');
  fs.mkdirSync(missionDir, { recursive: true });
  writeState(tmpDir, baseState);
  docPath = path.join(missionDir, 'VISION.md');
  fs.writeFileSync(docPath, SAMPLE_DOC);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function captureStdout(
  fn: () => Promise<number>
): Promise<{ stdout: string; stderr: string; code: number }> {
  const out: string[] = [];
  const err: string[] = [];
  const logSpy = vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    out.push(a.map((x) => (typeof x === 'string' ? x : String(x))).join(' '));
  });
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    err.push(a.map((x) => (typeof x === 'string' ? x : String(x))).join(' '));
  });
  try {
    const code = await fn();
    return { stdout: out.join('\n'), stderr: err.join('\n'), code };
  } finally {
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
}

describe('CLI mark-section-modified — multi-slug', () => {
  it('accepts multiple positional slugs and writes the doc once', async () => {
    const { stdout, code } = await captureStdout(() =>
      runMarkSectionModified(tmpDir, ['VISION.md', 'problem-statement', 'target-users'])
    );
    expect(code).toBe(0);
    expect(stdout).toContain('Marked VISION.md#problem-statement');
    expect(stdout).toContain('Marked VISION.md#target-users');
    const content = fs.readFileSync(docPath, 'utf-8');
    expect(content).toContain('CONCERT:MODIFIED:problem-statement');
    expect(content).toContain('CONCERT:MODIFIED:target-users');
  });

  it('--json returns batch results', async () => {
    const { stdout, code } = await captureStdout(() =>
      runMarkSectionModified(tmpDir, ['VISION.md', 'problem-statement', 'target-users', '--json'])
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.results).toHaveLength(2);
  });

  it('preserves single-slug behaviour and exit code', async () => {
    const { stdout, code } = await captureStdout(() =>
      runMarkSectionModified(tmpDir, ['VISION.md', 'problem-statement'])
    );
    expect(code).toBe(0);
    expect(stdout).toBe('Marked VISION.md#problem-statement');
  });
});

describe('CLI clear-section-modified — multi-slug', () => {
  beforeEach(async () => {
    await runMarkSectionModified(tmpDir, [
      'VISION.md',
      'problem-statement',
      'target-users',
      'success-criteria',
    ]);
  });

  it('clears multiple slugs in one call', async () => {
    const { stdout, code } = await captureStdout(() =>
      runClearSectionModified(tmpDir, [
        'VISION.md',
        'problem-statement',
        'target-users',
        'success-criteria',
      ])
    );
    expect(code).toBe(0);
    expect(stdout).toContain('Cleared VISION.md#problem-statement');
    expect(stdout).toContain('Cleared VISION.md#success-criteria');
    const content = fs.readFileSync(docPath, 'utf-8');
    expect(content).not.toContain('CONCERT:MODIFIED');
  });
});
