import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { handler } from '../../../mcp/tools/listModifiedSections.js';
import { writeState } from '../../../lib/state.js';
import type { ConcertState } from '../../../types.js';

let tmpDir: string;
let missionDir: string;

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

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-listmod-test-'));
  missionDir = path.join(tmpDir, '.concert', 'missions', 'm1');
  fs.mkdirSync(missionDir, { recursive: true });
  writeState(tmpDir, baseState);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('listModifiedSections handler', () => {
  it('returns [] when no docs have markers', async () => {
    fs.writeFileSync(path.join(missionDir, 'VISION.md'), '# Title\n\n## Overview\n\nBody.\n');
    const r = await handler({}, { cwd: tmpDir });
    expect(r).toEqual([]);
  });

  it('returns [] when mission missing', async () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-listmod-empty-'));
    try {
      const r = await handler({}, { cwd: fresh });
      expect(r).toEqual([]);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('reports per-section markers', async () => {
    fs.writeFileSync(
      path.join(missionDir, 'VISION.md'),
      '# T\n\n## Overview\n\n<!-- CONCERT:MODIFIED:overview -->\nBody.\n'
    );
    const r = await handler({}, { cwd: tmpDir });
    expect(r).toHaveLength(1);
    expect(r[0]!.doc).toBe('VISION.md');
    expect(r[0]!.wholeDoc).toBe(false);
    expect(r[0]!.sectionSlugs).toContain('overview');
  });

  it('reports whole-doc marker', async () => {
    fs.writeFileSync(
      path.join(missionDir, 'REQUIREMENTS.md'),
      '<!-- CONCERT:MODIFIED -->\n# T\n\n## S\n\nBody.\n'
    );
    const r = await handler({}, { cwd: tmpDir });
    expect(r).toHaveLength(1);
    expect(r[0]!.wholeDoc).toBe(true);
  });

  it('aggregates across multiple docs', async () => {
    fs.writeFileSync(path.join(missionDir, 'A.md'), '## S1\n\n<!-- CONCERT:MODIFIED:s1 -->\nx\n');
    fs.writeFileSync(path.join(missionDir, 'B.md'), '<!-- CONCERT:MODIFIED -->\n## S\n\ny\n');
    fs.writeFileSync(path.join(missionDir, 'C.md'), '## Clean\n\nz\n');
    const r = await handler({}, { cwd: tmpDir });
    const docs = r.map((x) => x.doc).sort();
    expect(docs).toEqual(['A.md', 'B.md']);
  });
});
