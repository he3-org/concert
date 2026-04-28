/**
 * Parity test (per S1 spec): every CLI verb run with `--json` must produce
 * the same payload that the corresponding tool handler returns when called
 * directly. This is the "single source of truth" guarantee.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { handler as getStateHandler } from '../../../mcp/tools/getState.js';
import { handler as getStatusHandler } from '../../../mcp/tools/getStatus.js';
import { handler as listMissionsHandler } from '../../../mcp/tools/listMissions.js';
import { handler as getSectionHandler } from '../../../mcp/tools/getSection.js';
import { handler as listModifiedSectionsHandler } from '../../../mcp/tools/listModifiedSections.js';

import { runGetState } from '../../../commands/getState.js';
import { runGetStatus } from '../../../commands/getStatus.js';
import { runListMissions } from '../../../commands/listMissions.js';
import { runGetSection } from '../../../commands/getSection.js';
import { runListModifiedSections } from '../../../commands/listModifiedSections.js';

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
  stage: 'develop',
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-parity-'));
  missionDir = path.join(tmpDir, '.concert', 'missions', 'm1');
  fs.mkdirSync(missionDir, { recursive: true });
  writeState(tmpDir, baseState);
  fs.writeFileSync(
    path.join(missionDir, 'VISION.md'),
    '# Vision\n\n## Overview\n\n<!-- CONCERT:MODIFIED:overview -->\nBody.\n'
  );
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Capture stdout produced by an async function invocation.
 */
async function captureStdout(fn: () => Promise<number>): Promise<{ stdout: string; code: number }> {
  const chunks: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    chunks.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
  });
  try {
    const code = await fn();
    return { stdout: chunks.join('\n'), code };
  } finally {
    spy.mockRestore();
  }
}

/**
 * Strip fields that are non-deterministic between two invocations spaced
 * milliseconds apart (e.g. ISO timestamps generated at call time).
 */
function stripNonDeterministic(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNonDeterministic);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'generatedAt') continue;
      out[k] = stripNonDeterministic(v);
    }
    return out;
  }
  return value;
}

describe('CLI ↔ MCP tool parity', () => {
  it('get-state --json equals getState handler output', async () => {
    const handlerOut = await getStateHandler({}, { cwd: tmpDir });
    const { stdout, code } = await captureStdout(() => runGetState(tmpDir, ['--json']));
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual(handlerOut);
  });

  it('get-status --json equals getStatus handler output (excluding generatedAt)', async () => {
    const handlerOut = await getStatusHandler({}, { cwd: tmpDir });
    const { stdout, code } = await captureStdout(() => runGetStatus(tmpDir, ['--json']));
    expect(code).toBe(0);
    expect(stripNonDeterministic(JSON.parse(stdout))).toEqual(stripNonDeterministic(handlerOut));
  });

  it('list-missions --json equals listMissions handler output', async () => {
    const handlerOut = await listMissionsHandler({}, { cwd: tmpDir });
    const { stdout, code } = await captureStdout(() => runListMissions(tmpDir, ['--json']));
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual(handlerOut);
  });

  it('get-section --json equals getSection handler output', async () => {
    const handlerOut = await getSectionHandler(
      { doc: 'VISION.md', section: 'overview' },
      { cwd: tmpDir }
    );
    const { stdout, code } = await captureStdout(() =>
      runGetSection(tmpDir, ['VISION.md', 'overview', '--json'])
    );
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual(handlerOut);
  });

  it('list-modified-sections --json equals listModifiedSections handler output', async () => {
    const handlerOut = await listModifiedSectionsHandler({}, { cwd: tmpDir });
    const { stdout, code } = await captureStdout(() => runListModifiedSections(tmpDir, ['--json']));
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual(handlerOut);
  });
});
