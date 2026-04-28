import * as fs from 'node:fs';
import * as path from 'node:path';
import { listMissions } from '../lib/missions.js';
import { indexMission } from './indexer.js';
import { recordHit, recordMiss } from './stats.js';

export interface FreshnessResult {
  reindexed: number;
  cacheHits: number;
}

export function ensureFresh(
  db: {
    exec(sql: string): void;
    prepare(sql: string): {
      all(...args: unknown[]): unknown[];
      run(...args: unknown[]): unknown;
    };
  },
  cwd: string,
  missionSlug?: string
): FreshnessResult {
  const missions = missionSlug
    ? listMissions(cwd).filter((m) => m.slug === missionSlug)
    : listMissions(cwd);

  let reindexed = 0;
  let cacheHits = 0;

  for (const mission of missions) {
    const rows = db
      .prepare('SELECT path, mtime_ms FROM documents WHERE mission_slug = ?')
      .all(mission.slug) as { path: string; mtime_ms: number }[];

    const dbPaths = new Set(rows.map((r) => r.path));
    const fsPaths = new Set<string>();

    if (fs.existsSync(mission.path)) {
      const entries = fs.readdirSync(mission.path, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          fsPaths.add(entry.name);
        }
      }
    }

    // Also track task-file mtimes — task rows live in their own table but are
    // derived from `<mission>/phases/*/TASK-*.md`. Without this loop, flipping
    // an acceptance criterion never bumps the cached `tasks.completed_acceptance`,
    // so downstream reads (list_tasks, render_plan) silently use stale rows.
    //
    // Note: Gap and refactor-item rows are derived from top-level `*.md` files
    // (`DEVELOPMENT-REVIEW.md`, `REFACTOR-PLAN-*.md`), which are already tracked
    // in the documents loop above. No additional staleness check is needed for
    // gaps or refactor_items — changes to those files trigger a full reindex.
    const taskRows = db
      .prepare('SELECT file_path, mtime_ms FROM tasks WHERE mission_slug = ?')
      .all(mission.slug) as { file_path: string; mtime_ms: number }[];
    const dbTaskPaths = new Set(taskRows.map((r) => r.file_path));
    const fsTaskPaths = new Set<string>();
    const phasesDir = path.join(mission.path, 'phases');
    if (fs.existsSync(phasesDir) && fs.statSync(phasesDir).isDirectory()) {
      for (const phase of fs.readdirSync(phasesDir, { withFileTypes: true })) {
        if (!phase.isDirectory()) continue;
        const phasePath = path.join(phasesDir, phase.name);
        for (const file of fs.readdirSync(phasePath, { withFileTypes: true })) {
          if (file.isFile() && /^TASK-.*\.md$/.test(file.name)) {
            fsTaskPaths.add(path.join('phases', phase.name, file.name));
          }
        }
      }
    }

    let needsReindex = false;

    for (const row of rows) {
      if (!fsPaths.has(row.path)) {
        needsReindex = true;
        break;
      }
      const filePath = path.join(mission.path, row.path);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs !== row.mtime_ms) {
        needsReindex = true;
        recordMiss();
        break;
      }
    }

    for (const fsPath of fsPaths) {
      if (!dbPaths.has(fsPath)) {
        needsReindex = true;
        recordMiss();
        break;
      }
    }

    if (!needsReindex) {
      for (const row of taskRows) {
        if (!fsTaskPaths.has(row.file_path)) {
          needsReindex = true;
          recordMiss();
          break;
        }
        const stat = fs.statSync(path.join(mission.path, row.file_path));
        if (stat.mtimeMs !== row.mtime_ms) {
          needsReindex = true;
          recordMiss();
          break;
        }
      }
    }
    if (!needsReindex) {
      for (const fsPath of fsTaskPaths) {
        if (!dbTaskPaths.has(fsPath)) {
          needsReindex = true;
          recordMiss();
          break;
        }
      }
    }

    if (needsReindex) {
      indexMission(db, cwd, mission.slug, mission.path);
      reindexed++;
    } else {
      recordHit();
      cacheHits++;
    }
  }

  return { reindexed, cacheHits };
}
