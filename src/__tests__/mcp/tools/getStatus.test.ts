import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { handler } from '../../../mcp/tools/getStatus.js';
import { writeState } from '../../../lib/state.js';
import type { ConcertState } from '../../../types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-getstatus-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeMissionDir(slug: string): string {
  const dir = path.join(tmpDir, '.concert', 'missions', slug);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe('getStatus handler', () => {
  it('returns found: false when state.json missing', async () => {
    const result = await handler({}, { cwd: tmpDir });
    expect(result.found).toBe(false);
    expect(result.nextRecommendedAction).toContain('start a new mission');
  });

  it('scans for modified documents', async () => {
    const missionDir = makeMissionDir('test');
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      stage: 'planning',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    fs.writeFileSync(path.join(missionDir, 'VISION.md'), `## Vision\n<!-- CONCERT:MODIFIED -->`);
    fs.writeFileSync(
      path.join(missionDir, 'REQUIREMENTS.md'),
      `## Req\n<!-- CONCERT:MODIFIED:req -->`
    );

    const result = await handler({}, { cwd: tmpDir });
    expect(result.modifiedDocuments).toHaveLength(2);
    const visionDoc = result.modifiedDocuments.find((d) => d.doc === 'VISION.md');
    expect(visionDoc?.sectionSlugs).toBe('*');
    const reqDoc = result.modifiedDocuments.find((d) => d.doc === 'REQUIREMENTS.md');
    expect(reqDoc?.sectionSlugs).toEqual(['req']);
  });

  it('parses development review gaps', async () => {
    const missionDir = makeMissionDir('test');
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      stage: 'execution',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    const review = `## Gaps
- Critical gap 1
- Major gap 2 [x]
- Minor gap 3
- Nice gap 4 (Resolved)`;
    fs.writeFileSync(path.join(missionDir, 'DEVELOPMENT-REVIEW.md'), review);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.developmentReviewGaps).not.toBeNull();
    expect(result.developmentReviewGaps?.critical.total).toBe(1);
    expect(result.developmentReviewGaps?.critical.open).toBe(1);
    expect(result.developmentReviewGaps?.major.total).toBe(1);
    expect(result.developmentReviewGaps?.major.open).toBe(0);
    expect(result.developmentReviewGaps?.nice.total).toBe(1);
    expect(result.developmentReviewGaps?.nice.open).toBe(0);
  });

  it('parses refactor plan', async () => {
    const missionDir = makeMissionDir('test');
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      stage: 'refactor',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    const refactor = `## Items
- P0 item 1
- P1 item 2 [x]
- P2 item 3`;
    fs.writeFileSync(path.join(missionDir, 'REFACTOR-PLAN-001.md'), refactor);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.refactorPlan).not.toBeNull();
    expect(result.refactorPlan?.p0.total).toBe(1);
    expect(result.refactorPlan?.p0.open).toBe(1);
    expect(result.refactorPlan?.p1.total).toBe(1);
    expect(result.refactorPlan?.p1.open).toBe(0);
  });

  it('computes next action: quality_loop_state takes precedence', async () => {
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      quality_loop_state: {
        task_file: 'TASK-001.md',
        task_index: 0,
        iteration: 2,
        phase: 'coder',
        prior_findings: [],
        coder_commits: [],
      },
      stage: 'execution',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.nextRecommendedAction).toContain('iteration 2');
    expect(result.nextRecommendedAction).toContain('TASK-001.md');
  });

  it('computes next action: modified docs second', async () => {
    const missionDir = makeMissionDir('test');
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      stage: 'planning',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    fs.writeFileSync(path.join(missionDir, 'VISION.md'), `<!-- CONCERT:MODIFIED -->`);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.nextRecommendedAction).toContain('review-docs');
  });

  it('computes next action: open gaps third', async () => {
    const missionDir = makeMissionDir('test');
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      stage: 'execution',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    fs.writeFileSync(path.join(missionDir, 'DEVELOPMENT-REVIEW.md'), `- Critical gap`);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.nextRecommendedAction).toContain('fix-gaps');
  });

  it('computes next action: refactor items fourth', async () => {
    const missionDir = makeMissionDir('test');
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      stage: 'refactor',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    fs.writeFileSync(path.join(missionDir, 'REFACTOR-PLAN-001.md'), `- P0 item`);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.nextRecommendedAction).toContain('refactor');
  });

  it('reads git branch from .git/HEAD', async () => {
    const gitDir = path.join(tmpDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/mission/test-branch\n');

    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      stage: 'planning',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.branch).toBe('mission/test-branch');
  });

  it('returns null branch when .git/HEAD missing', async () => {
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
      stage: 'planning',
      pipeline: {},
      failure_log: [],
    };
    writeState(tmpDir, state as ConcertState);

    const result = await handler({}, { cwd: tmpDir });
    expect(result.branch).toBeNull();
  });
});
