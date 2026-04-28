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
