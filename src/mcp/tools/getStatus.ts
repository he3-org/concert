import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FailureSummary } from '../../types.js';
import { readState } from '../../lib/state.js';
import { findModifiedMarkers } from '../../lib/markdown-section.js';
import { resolveActiveMissionPath } from '../../lib/missions.js';
import { getStatusInputSchema, getStatusOutputSchema } from '../schemas.js';
import { parseGapItems, parseRefactorItems } from '../../lib/review-parse.js';
import { withCache } from '../../cache/cache.js';

export interface GetStatusInput {
  mission?: string;
}

export interface SeverityCounts {
  open: number;
  total: number;
}

export interface GapCounts {
  critical: SeverityCounts;
  major: SeverityCounts;
  minor: SeverityCounts;
  nice: SeverityCounts;
}

export interface ModifiedDocument {
  doc: string;
  sectionSlugs: string[] | '*';
}

export interface GetStatusOutput {
  mission: string;
  missionPath: string;
  branch: string | null;
  stage: string;
  found: boolean;
  pipeline: Record<string, string | null>;
  modifiedDocuments: ModifiedDocument[];
  developmentReviewGaps: GapCounts | null;
  refactorPlan: {
    p0: SeverityCounts;
    p1: SeverityCounts;
    p2: SeverityCounts;
  } | null;
  recentFailures: FailureSummary[];
  nextRecommendedAction: string;
  generatedAt: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.get_status';
export const description =
  'Comprehensive mission status snapshot: stage, modified docs, gaps, refactor items, next action.';
export const inputSchema = getStatusInputSchema;
export const outputSchema = getStatusOutputSchema;

export async function handler(args: GetStatusInput, ctx: ToolContext): Promise<GetStatusOutput> {
  const state = readState(ctx.cwd);

  if (!state) {
    return {
      mission: args.mission ?? '',
      missionPath: '',
      branch: null,
      stage: '',
      found: false,
      pipeline: {},
      modifiedDocuments: [],
      developmentReviewGaps: null,
      refactorPlan: null,
      recentFailures: [],
      nextRecommendedAction:
        'No outstanding work — start a new mission with `/concert-vision create`',
      generatedAt: new Date().toISOString(),
    };
  }

  const missionSlug = path.basename(state.mission_path);
  const missionPath = path.resolve(ctx.cwd, state.mission_path);
  const branch = getCurrentBranch(ctx.cwd);
  const modifiedDocuments = scanModifiedDocuments(missionPath);

  // Cache-accelerated gap/refactor counts with file-scan fallback
  const developmentReviewGaps = await withCache(
    ctx.cwd,
    (handle) => gapsFromCache(handle.db, missionSlug),
    () => parseReviewGaps(missionPath)
  );

  const refactorPlan = await withCache(
    ctx.cwd,
    (handle) => refactorFromCache(handle.db, missionSlug),
    () => parseRefactorPlan(missionPath)
  );

  const recentFailures = state.failure_log.slice(-3);
  const nextRecommendedAction = computeNextAction(
    state,
    modifiedDocuments,
    developmentReviewGaps,
    refactorPlan
  );

  return {
    mission: state.mission,
    missionPath: state.mission_path,
    branch,
    stage: state.stage,
    found: true,
    pipeline: state.pipeline,
    modifiedDocuments,
    developmentReviewGaps,
    refactorPlan,
    recentFailures,
    nextRecommendedAction,
    generatedAt: new Date().toISOString(),
  };
}

function getCurrentBranch(cwd: string): string | null {
  try {
    const headPath = path.join(cwd, '.git', 'HEAD');
    if (!fs.existsSync(headPath)) return null;

    const content = fs.readFileSync(headPath, 'utf-8').trim();
    if (content.startsWith('ref: refs/heads/')) {
      return content.slice('ref: refs/heads/'.length);
    }
    return null;
  } catch {
    return null;
  }
}

function scanModifiedDocuments(missionPath: string): ModifiedDocument[] {
  if (!fs.existsSync(missionPath)) return [];

  const results: ModifiedDocument[] = [];
  const entries = fs.readdirSync(missionPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const docPath = path.join(missionPath, entry.name);
    const content = fs.readFileSync(docPath, 'utf-8');
    const markers = findModifiedMarkers(content);

    if (markers.wholeDoc) {
      results.push({ doc: entry.name, sectionSlugs: '*' });
    } else if (markers.sectionSlugs.length > 0) {
      results.push({ doc: entry.name, sectionSlugs: markers.sectionSlugs });
    }
  }

  return results;
}

function gapsFromCache(db: unknown, missionSlug: string): GapCounts | null {
  const typed = db as { prepare(sql: string): { all(...args: unknown[]): unknown[] } };
  const rows = typed
    .prepare('SELECT severity, resolved FROM gaps WHERE mission_slug = ?')
    .all(missionSlug) as { severity: 'critical' | 'major' | 'minor' | 'nice'; resolved: number }[];
  if (rows.length === 0) return null;
  const counts: GapCounts = {
    critical: { open: 0, total: 0 },
    major: { open: 0, total: 0 },
    minor: { open: 0, total: 0 },
    nice: { open: 0, total: 0 },
  };
  for (const row of rows) {
    counts[row.severity].total++;
    if (!row.resolved) counts[row.severity].open++;
  }
  return counts;
}

function refactorFromCache(
  db: unknown,
  missionSlug: string
): {
  p0: SeverityCounts;
  p1: SeverityCounts;
  p2: SeverityCounts;
} | null {
  const typed = db as { prepare(sql: string): { all(...args: unknown[]): unknown[] } };
  const rows = typed
    .prepare('SELECT priority, resolved FROM refactor_items WHERE mission_slug = ?')
    .all(missionSlug) as { priority: 'p0' | 'p1' | 'p2'; resolved: number }[];
  if (rows.length === 0) return null;
  const counts = {
    p0: { open: 0, total: 0 },
    p1: { open: 0, total: 0 },
    p2: { open: 0, total: 0 },
  };
  for (const row of rows) {
    counts[row.priority].total++;
    if (!row.resolved) counts[row.priority].open++;
  }
  return counts;
}

function parseReviewGaps(missionPath: string): GapCounts | null {
  const reviewPath = path.join(missionPath, 'DEVELOPMENT-REVIEW.md');
  if (!fs.existsSync(reviewPath)) return null;

  const content = fs.readFileSync(reviewPath, 'utf-8');
  const items = parseGapItems(content);

  const counts: GapCounts = {
    critical: { open: 0, total: 0 },
    major: { open: 0, total: 0 },
    minor: { open: 0, total: 0 },
    nice: { open: 0, total: 0 },
  };

  for (const item of items) {
    counts[item.severity].total++;
    if (!item.resolved) {
      counts[item.severity].open++;
    }
  }

  return counts;
}

function parseRefactorPlan(missionPath: string): {
  p0: SeverityCounts;
  p1: SeverityCounts;
  p2: SeverityCounts;
} | null {
  if (!fs.existsSync(missionPath)) return null;

  const entries = fs.readdirSync(missionPath, { withFileTypes: true });
  const refactorFiles = entries
    .filter((e) => e.isFile() && e.name.match(/^REFACTOR-PLAN-.*\.md$/))
    .map((e) => path.join(missionPath, e.name));

  if (refactorFiles.length === 0) return null;

  // Pick latest by mtime
  const latest = refactorFiles.reduce((prev, curr) => {
    const prevStat = fs.statSync(prev);
    const currStat = fs.statSync(curr);
    return currStat.mtimeMs > prevStat.mtimeMs ? curr : prev;
  });

  const content = fs.readFileSync(latest, 'utf-8');
  const items = parseRefactorItems(content);

  const counts = {
    p0: { open: 0, total: 0 },
    p1: { open: 0, total: 0 },
    p2: { open: 0, total: 0 },
  };

  for (const item of items) {
    counts[item.priority].total++;
    if (!item.resolved) {
      counts[item.priority].open++;
    }
  }

  return counts;
}

function computeNextAction(
  state: {
    quality_loop_state?: { task_file: string; iteration: number } | null;
    next_action?: { message: string } | null;
  },
  modifiedDocuments: ModifiedDocument[],
  developmentReviewGaps: GapCounts | null,
  refactorPlan: { p0: SeverityCounts; p1: SeverityCounts; p2: SeverityCounts } | null
): string {
  if (state.quality_loop_state) {
    const { task_file, iteration } = state.quality_loop_state;
    return `Resume \`/concert-develop implement\` (iteration ${iteration} of ${task_file})`;
  }

  if (modifiedDocuments.length > 0) {
    return 'Run `/concert-review-docs re-evaluate-all`';
  }

  if (developmentReviewGaps) {
    const totalOpen =
      developmentReviewGaps.critical.open +
      developmentReviewGaps.major.open +
      developmentReviewGaps.minor.open +
      developmentReviewGaps.nice.open;
    if (totalOpen > 0) {
      return 'Run `/concert-develop fix-gaps`';
    }
  }

  if (refactorPlan) {
    const totalOpen = refactorPlan.p0.open + refactorPlan.p1.open + refactorPlan.p2.open;
    if (totalOpen > 0) {
      return 'Run `/concert-refactor` or `/concert-develop refactor`';
    }
  }

  if (state.next_action?.message) {
    return state.next_action.message;
  }

  return 'No outstanding work — start a new mission with `/concert-vision create`';
}
