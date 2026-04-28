import { getSummaryInputSchema, getSummaryOutputSchema } from '../schemas.js';
import { listMissions } from '../../lib/missions.js';
import { withCache } from '../../cache/cache.js';
import { parseGapItems, parseRefactorItems } from '../../lib/review-parse.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface GetSummaryInput {
  // No required fields
}

export interface MissionRow {
  slug: string;
  stage: string | null;
  tasksTotal: number;
  tasksDone: number;
  tasksInProgress: number;
  tasksPending: number;
  gapsCritical: number;
  gapsMajor: number;
  gapsMinor: number;
  gapsNice: number;
  refactorP0: number;
  refactorP1: number;
  refactorP2: number;
}

export interface GetSummaryOutput {
  missions: MissionRow[];
  generatedAt: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.get_summary';
export const description =
  'Cross-mission summary: task counts, open gaps by severity, open refactor items by priority.';
export const inputSchema = getSummaryInputSchema;
export const outputSchema = getSummaryOutputSchema;

export async function handler(args: GetSummaryInput, ctx: ToolContext): Promise<GetSummaryOutput> {
  const generatedAt = new Date().toISOString();

  const missions = await withCache(
    ctx.cwd,
    (handle) => buildFromCache(handle.db as DbHandle, ctx.cwd),
    () => buildFromFiles(ctx.cwd)
  );

  return { missions, generatedAt };
}

interface DbHandle {
  prepare(sql: string): {
    all(...args: unknown[]): unknown[];
  };
}

function buildFromCache(db: DbHandle, cwd: string): MissionRow[] {
  const missionsData = db.prepare('SELECT slug, stage FROM missions ORDER BY slug').all() as {
    slug: string;
    stage: string | null;
  }[];

  const rows: MissionRow[] = [];

  for (const mission of missionsData) {
    const tasksData = db
      .prepare(
        'SELECT total_acceptance, completed_acceptance FROM tasks WHERE mission_slug = ? AND total_acceptance > 0'
      )
      .all(mission.slug) as { total_acceptance: number; completed_acceptance: number }[];

    let tasksDone = 0;
    let tasksInProgress = 0;
    let tasksPending = 0;

    for (const task of tasksData) {
      if (task.completed_acceptance >= task.total_acceptance) {
        tasksDone++;
      } else if (task.completed_acceptance > 0) {
        tasksInProgress++;
      } else {
        tasksPending++;
      }
    }

    const gapsData = db
      .prepare('SELECT severity FROM gaps WHERE mission_slug = ? AND resolved = 0')
      .all(mission.slug) as { severity: string }[];

    let gapsCritical = 0;
    let gapsMajor = 0;
    let gapsMinor = 0;
    let gapsNice = 0;

    for (const gap of gapsData) {
      if (gap.severity === 'critical') gapsCritical++;
      else if (gap.severity === 'major') gapsMajor++;
      else if (gap.severity === 'minor') gapsMinor++;
      else if (gap.severity === 'nice') gapsNice++;
    }

    const refactorData = db
      .prepare('SELECT priority FROM refactor_items WHERE mission_slug = ? AND resolved = 0')
      .all(mission.slug) as { priority: string }[];

    let refactorP0 = 0;
    let refactorP1 = 0;
    let refactorP2 = 0;

    for (const item of refactorData) {
      if (item.priority === 'p0') refactorP0++;
      else if (item.priority === 'p1') refactorP1++;
      else if (item.priority === 'p2') refactorP2++;
    }

    rows.push({
      slug: mission.slug,
      stage: mission.stage,
      tasksTotal: tasksData.length,
      tasksDone,
      tasksInProgress,
      tasksPending,
      gapsCritical,
      gapsMajor,
      gapsMinor,
      gapsNice,
      refactorP0,
      refactorP1,
      refactorP2,
    });
  }

  return rows;
}

function buildFromFiles(cwd: string): MissionRow[] {
  const missions = listMissions(cwd);
  const rows: MissionRow[] = [];

  for (const mission of missions) {
    const stageFile = path.join(mission.path, 'stage.txt');
    const stage = fs.existsSync(stageFile) ? fs.readFileSync(stageFile, 'utf-8').trim() : null;

    // Count tasks
    let tasksTotal = 0;
    let tasksDone = 0;
    let tasksInProgress = 0;
    let tasksPending = 0;

    const phasesDir = path.join(mission.path, 'phases');
    if (fs.existsSync(phasesDir) && fs.statSync(phasesDir).isDirectory()) {
      for (const phase of fs.readdirSync(phasesDir, { withFileTypes: true })) {
        if (!phase.isDirectory()) continue;
        const phasePath = path.join(phasesDir, phase.name);
        for (const file of fs.readdirSync(phasePath, { withFileTypes: true })) {
          if (!file.isFile() || !/^TASK-.*\.md$/.test(file.name)) continue;

          const taskPath = path.join(phasePath, file.name);
          try {
            const content = fs.readFileSync(taskPath, 'utf-8');
            const acceptanceLines = content.split('\n').filter((l) => /^\s*-\s*\[/.test(l));
            if (acceptanceLines.length === 0) continue;

            tasksTotal++;
            const completed = acceptanceLines.filter((l) => /\[x\]/i.test(l)).length;
            if (completed >= acceptanceLines.length) {
              tasksDone++;
            } else if (completed > 0) {
              tasksInProgress++;
            } else {
              tasksPending++;
            }
          } catch {
            // Skip unparseable task files
          }
        }
      }
    }

    // Count gaps
    let gapsCritical = 0;
    let gapsMajor = 0;
    let gapsMinor = 0;
    let gapsNice = 0;

    const reviewPath = path.join(mission.path, 'DEVELOPMENT-REVIEW.md');
    if (fs.existsSync(reviewPath)) {
      const content = fs.readFileSync(reviewPath, 'utf-8');
      const gapItems = parseGapItems(content);
      for (const item of gapItems) {
        if (item.resolved) continue;
        if (item.severity === 'critical') gapsCritical++;
        else if (item.severity === 'major') gapsMajor++;
        else if (item.severity === 'minor') gapsMinor++;
        else if (item.severity === 'nice') gapsNice++;
      }
    }

    // Count refactor items
    let refactorP0 = 0;
    let refactorP1 = 0;
    let refactorP2 = 0;

    const refactorFiles = fs.existsSync(mission.path)
      ? fs
          .readdirSync(mission.path, { withFileTypes: true })
          .filter((e) => e.isFile() && e.name.match(/^REFACTOR-PLAN-.*\.md$/))
          .map((e) => ({ name: e.name, stat: fs.statSync(path.join(mission.path, e.name)) }))
      : [];

    if (refactorFiles.length > 0) {
      const latest = refactorFiles.reduce((prev, curr) =>
        curr.stat.mtimeMs > prev.stat.mtimeMs ? curr : prev
      );
      const refactorPath = path.join(mission.path, latest.name);
      const content = fs.readFileSync(refactorPath, 'utf-8');
      const refactorItems = parseRefactorItems(content);
      for (const item of refactorItems) {
        if (item.resolved) continue;
        if (item.priority === 'p0') refactorP0++;
        else if (item.priority === 'p1') refactorP1++;
        else if (item.priority === 'p2') refactorP2++;
      }
    }

    rows.push({
      slug: mission.slug,
      stage,
      tasksTotal,
      tasksDone,
      tasksInProgress,
      tasksPending,
      gapsCritical,
      gapsMajor,
      gapsMinor,
      gapsNice,
      refactorP0,
      refactorP1,
      refactorP2,
    });
  }

  return rows;
}
