import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { handler } from '../../../mcp/tools/getState.js';
import { writeState } from '../../../lib/state.js';
import type { ConcertState, FailureSummary } from '../../../types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-getstate-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getState handler', () => {
  it('returns found: false when state.json missing', async () => {
    const result = await handler({}, { cwd: tmpDir });
    expect(result.found).toBe(false);
    expect(result.mission).toBe('');
    expect(result.missionPath).toBe('');
  });

  it('returns full state when state.json exists', async () => {
    const state: Partial<ConcertState> = {
      mission: 'test-mission',
      mission_path: '.concert/missions/test',
      stage: 'execution',
      branch: 'mission/test',
      pr_number: 42,
      status_display: 'wip_pr',
      pipeline: { vision: 'accepted' },
      phases_completed: 2,
      phases_total: 5,
      tasks_completed: 6,
      tasks_total: 15,
      commits: 3,
      blockers: ['blocker1'],
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.found).toBe(true);
    expect(result.mission).toBe('test-mission');
    expect(result.stage).toBe('execution');
    expect(result.branch).toBe('mission/test');
    expect(result.prNumber).toBe(42);
    expect(result.phasesCompleted).toBe(2);
    expect(result.phasesTotal).toBe(5);
    expect(result.commits).toBe(3);
  });

  it('slices failure_log to last 3 entries', async () => {
    const failures: FailureSummary[] = [
      {
        phase: 1,
        task_file: 'T1',
        task_index: 0,
        error_type: 'test_failure',
        error_summary: 'F1',
        occurred_at: '2024-01-01',
        resolved: false,
      },
      {
        phase: 1,
        task_file: 'T2',
        task_index: 1,
        error_type: 'build_error',
        error_summary: 'F2',
        occurred_at: '2024-01-02',
        resolved: false,
      },
      {
        phase: 2,
        task_file: 'T3',
        task_index: 0,
        error_type: 'timeout',
        error_summary: 'F3',
        occurred_at: '2024-01-03',
        resolved: false,
      },
      {
        phase: 2,
        task_file: 'T4',
        task_index: 1,
        error_type: 'unknown',
        error_summary: 'F4',
        occurred_at: '2024-01-04',
        resolved: false,
      },
      {
        phase: 3,
        task_file: 'T5',
        task_index: 0,
        error_type: 'test_failure',
        error_summary: 'F5',
        occurred_at: '2024-01-05',
        resolved: false,
      },
    ];

    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      failure_log: failures,
    };
    writeState(tmpDir, state as ConcertState);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.recentFailures).toHaveLength(3);
    expect(result.recentFailures[0]?.error_summary).toBe('F3');
    expect(result.recentFailures[2]?.error_summary).toBe('F5');
  });

  it('extracts next action message', async () => {
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      next_action: {
        type: 'run_agent',
        target: 'concert-develop',
        message: 'Resume implementation',
      },
    };
    writeState(tmpDir, state as ConcertState);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.nextAction).toBe('Resume implementation');
  });

  it('returns null nextAction when missing', async () => {
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
    };
    writeState(tmpDir, state as ConcertState);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.nextAction).toBeNull();
  });
});
