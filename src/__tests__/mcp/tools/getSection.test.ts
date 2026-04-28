import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { handler } from '../../../mcp/tools/getSection.js';
import { writeState } from '../../../lib/state.js';

let tmpDir: string;
let missionDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-getsection-test-'));
  missionDir = path.join(tmpDir, '.concert', 'missions', 'm1');
  fs.mkdirSync(missionDir, { recursive: true });
  writeState(tmpDir, {
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
  });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getSection handler', () => {
  it('returns found: false when doc does not exist', async () => {
    const r = await handler({ doc: 'missing.md', section: 'overview' }, { cwd: tmpDir });
    expect(r.found).toBe(false);
  });

  it('returns found: false when section does not exist', async () => {
    fs.writeFileSync(path.join(missionDir, 'VISION.md'), '# Title\n\n## Overview\n\nBody.\n');
    const r = await handler({ doc: 'VISION.md', section: 'missing' }, { cwd: tmpDir });
    expect(r.found).toBe(false);
  });

  it('returns the section body when found', async () => {
    fs.writeFileSync(
      path.join(missionDir, 'VISION.md'),
      '# Title\n\n## Overview\n\nBody text.\n\n## Other\n\nMore.\n'
    );
    const r = await handler({ doc: 'VISION.md', section: 'overview' }, { cwd: tmpDir });
    expect(r.found).toBe(true);
    expect(r.heading).toBe('Overview');
    expect(r.body).toContain('Body text.');
    expect(r.body).not.toContain('More.');
  });

  it('case-insensitive slug match', async () => {
    fs.writeFileSync(path.join(missionDir, 'X.md'), '## My Section\n\nb\n');
    const r = await handler({ doc: 'X.md', section: 'MY-SECTION' }, { cwd: tmpDir });
    expect(r.found).toBe(true);
  });

  it('returns found: false with no active mission', async () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-getsection-empty-'));
    try {
      const r = await handler({ doc: 'X.md', section: 's' }, { cwd: fresh });
      expect(r.found).toBe(false);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });
});
