import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { handler as markHandler } from '../../../mcp/tools/markSectionModified.js';
import { handler as clearHandler } from '../../../mcp/tools/clearSectionModified.js';
import { writeState } from '../../../lib/state.js';
import type { ConcertState } from '../../../types.js';

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

## What We're Building

Body 2.

## Target Users

Body 3.

## Success Criteria

Body 4.
`;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-batch-marker-'));
  missionDir = path.join(tmpDir, '.concert', 'missions', 'm1');
  fs.mkdirSync(missionDir, { recursive: true });
  writeState(tmpDir, baseState);
  docPath = path.join(missionDir, 'VISION.md');
  fs.writeFileSync(docPath, SAMPLE_DOC);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('mark_section_modified — batch sections[]', () => {
  it('marks multiple sections in a single call and a single write', async () => {
    const out = await markHandler(
      { doc: 'VISION.md', sections: ['problem-statement', 'target-users', 'success-criteria'] },
      { cwd: tmpDir }
    );
    expect(out.ok).toBe(true);
    expect(out.results).toHaveLength(3);
    expect(out.results!.every((r) => r.ok)).toBe(true);

    const content = fs.readFileSync(docPath, 'utf-8');
    expect(content).toContain('CONCERT:MODIFIED:problem-statement');
    expect(content).toContain('CONCERT:MODIFIED:target-users');
    expect(content).toContain('CONCERT:MODIFIED:success-criteria');
    // Untouched section has no marker
    expect(content).not.toContain('CONCERT:MODIFIED:what-were-building');
  });

  it('reports per-section ok=false for missing slugs but still writes the rest', async () => {
    const out = await markHandler(
      { doc: 'VISION.md', sections: ['problem-statement', 'nonexistent-slug', 'target-users'] },
      { cwd: tmpDir }
    );
    expect(out.ok).toBe(false);
    const byName = Object.fromEntries(out.results!.map((r) => [r.section, r]));
    expect(byName['problem-statement']!.ok).toBe(true);
    expect(byName['nonexistent-slug']!.ok).toBe(false);
    expect(byName['nonexistent-slug']!.error).toMatch(/section not found/);
    expect(byName['target-users']!.ok).toBe(true);

    const content = fs.readFileSync(docPath, 'utf-8');
    expect(content).toContain('CONCERT:MODIFIED:problem-statement');
    expect(content).toContain('CONCERT:MODIFIED:target-users');
  });

  it('preserves single-section response shape when `section` is used', async () => {
    const out = await markHandler(
      { doc: 'VISION.md', section: 'problem-statement' },
      { cwd: tmpDir }
    );
    expect(out.ok).toBe(true);
    expect(out.section).toBe('problem-statement');
    expect(out.alreadyMarked).toBe(false);
    expect(out.results).toBeUndefined();
  });

  it('returns invalid_input error when neither section nor sections is provided', async () => {
    const out = await markHandler({ doc: 'VISION.md' }, { cwd: tmpDir });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/section or sections required/);
  });
});

describe('clear_section_modified — batch sections[]', () => {
  beforeEach(async () => {
    // Pre-mark three sections
    await markHandler(
      { doc: 'VISION.md', sections: ['problem-statement', 'target-users', 'success-criteria'] },
      { cwd: tmpDir }
    );
  });

  it('clears multiple markers in a single call', async () => {
    const out = await clearHandler(
      {
        doc: 'VISION.md',
        sections: ['problem-statement', 'target-users', 'success-criteria'],
      },
      { cwd: tmpDir }
    );
    expect(out.ok).toBe(true);
    expect(out.results).toHaveLength(3);
    expect(out.results!.every((r) => r.removed)).toBe(true);

    const content = fs.readFileSync(docPath, 'utf-8');
    expect(content).not.toContain('CONCERT:MODIFIED');
  });

  it('reports removed=false for slugs that were not marked, without erroring', async () => {
    const out = await clearHandler(
      { doc: 'VISION.md', sections: ['problem-statement', 'what-were-building'] },
      { cwd: tmpDir }
    );
    expect(out.ok).toBe(true);
    const byName = Object.fromEntries(out.results!.map((r) => [r.section, r]));
    expect(byName['problem-statement']!.removed).toBe(true);
    expect(byName['what-were-building']!.removed).toBe(false);
  });

  it('preserves single-section response shape when `section` is used', async () => {
    const out = await clearHandler(
      { doc: 'VISION.md', section: 'problem-statement' },
      { cwd: tmpDir }
    );
    expect(out.ok).toBe(true);
    expect(out.section).toBe('problem-statement');
    expect(out.removed).toBe(true);
    expect(out.results).toBeUndefined();
  });

  it('returns invalid_input error when neither section nor sections is provided', async () => {
    const out = await clearHandler({ doc: 'VISION.md' }, { cwd: tmpDir });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/section or sections required/);
  });
});
