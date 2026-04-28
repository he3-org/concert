import type { FailureSummary } from '../../types.js';
import { readState } from '../../lib/state.js';
import { getStateInputSchema, getStateOutputSchema } from '../schemas.js';
import { withCache } from '../../cache/cache.js';
import type { EventRow } from './getEvents.js';
import * as path from 'node:path';

export interface GetStateInput {
  mission?: string;
}

export interface GetStateOutput {
  mission: string;
  missionPath: string;
  stage: string;
  branch: string;
  prNumber: number;
  statusDisplay: string;
  pipeline: Record<string, string>;
  phasesCompleted: number;
  phasesTotal: number;
  tasksCompleted: number;
  tasksTotal: number;
  commits: number;
  nextAction: string | null;
  blockers: string[];
  recentFailures: FailureSummary[];
  recentToolCalls?: EventRow[];
  found: boolean;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.get_state';
export const description =
  'Get current mission state from state.json. Returns execution progress, pipeline status, and recent failures.';
export const inputSchema = getStateInputSchema;
export const outputSchema = getStateOutputSchema;

export async function handler(args: GetStateInput, ctx: ToolContext): Promise<GetStateOutput> {
  const state = readState(ctx.cwd);

  if (!state) {
    return {
      mission: args.mission ?? '',
      missionPath: '',
      stage: '',
      branch: '',
      prNumber: 0,
      statusDisplay: '',
      pipeline: {},
      phasesCompleted: 0,
      phasesTotal: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
      commits: 0,
      nextAction: null,
      blockers: [],
      recentFailures: [],
      found: false,
    };
  }

  const recentFailures = state.failure_log.slice(-3);
  const missionSlug = path.basename(state.mission_path);

  // Get last 5 events for the active mission from cache
  const recentToolCalls = await withCache(
    ctx.cwd,
    (handle) => {
      const db = handle.db as {
        prepare(sql: string): {
          all(...args: unknown[]): unknown[];
        };
      };
      const events = db
        .prepare(
          'SELECT id, ts, mission_slug, tool, ok, error_class, duration_ms, doc, section FROM events WHERE mission_slug = ? ORDER BY id DESC LIMIT 5'
        )
        .all(missionSlug) as EventRow[];
      return events.map((e) => ({ ...e, ok: Boolean(e.ok) }));
    },
    () => undefined
  );

  const output: GetStateOutput = {
    mission: state.mission,
    missionPath: state.mission_path,
    stage: state.stage,
    branch: state.branch,
    prNumber: state.pr_number,
    statusDisplay: state.status_display,
    pipeline: state.pipeline,
    phasesCompleted: state.phases_completed,
    phasesTotal: state.phases_total,
    tasksCompleted: state.tasks_completed,
    tasksTotal: state.tasks_total,
    commits: state.commits,
    nextAction: state.next_action?.message ?? null,
    blockers: state.blockers,
    recentFailures,
    found: true,
  };

  if (recentToolCalls !== undefined) {
    output.recentToolCalls = recentToolCalls;
  }

  return output;
}
