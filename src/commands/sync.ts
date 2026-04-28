import { openCache } from '../cache/index.js';
import { indexAll } from '../cache/indexer.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export async function runSync(cwd: string, args: string[]): Promise<number> {
  const isRebuild = args.includes('--rebuild');
  const isStatus = args.includes('--status') || args.length === 0;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert sync [--rebuild|--status]

Manage the SQLite read cache.

Options:
  --rebuild  Delete and rebuild the cache from mission documents
  --status   Show cache status (default)
  --help     Show this help`);
    return 0;
  }

  const handle = await openCache(cwd);
  if (!handle) {
    console.error('Error: better-sqlite3 not installed. Run: npm install --no-save better-sqlite3');
    return 1;
  }

  try {
    if (isRebuild) {
      handle.close();
      const dbPath = path.join(cwd, '.concert', 'index.sqlite');
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      const shmPath = dbPath + '-shm';
      const walPath = dbPath + '-wal';
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);

      const freshHandle = await openCache(cwd);
      if (!freshHandle) {
        console.error('Error: failed to re-open cache after rebuild');
        return 1;
      }
      try {
        const results = indexAll(
          freshHandle.db as {
            exec(sql: string): void;
            prepare(sql: string): {
              run(...args: unknown[]): unknown;
              all(...args: unknown[]): unknown[];
            };
          },
          cwd
        );
        console.log(`Rebuilt cache: ${results.length} missions indexed`);
        for (const r of results) {
          console.log(
            `  ${r.missionSlug}: ${r.documentsIndexed} docs, ${r.sectionsIndexed} sections, ${r.markersFound} markers, ${r.tasksIndexed} tasks, ${r.gapsIndexed} gaps, ${r.refactorItemsIndexed} refactor`
          );
        }
      } finally {
        freshHandle.close();
      }
      return 0;
    }

    if (isStatus) {
      const db = handle.db as {
        prepare(sql: string): {
          all(...args: unknown[]): unknown[];
          get(...args: unknown[]): unknown;
        };
      };

      const missions = db
        .prepare('SELECT slug, last_indexed_at FROM missions ORDER BY slug')
        .all() as {
        slug: string;
        last_indexed_at: string;
      }[];

      const docCount = (
        db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number }
      ).count;
      const sectionCount = (
        db.prepare('SELECT COUNT(*) as count FROM sections').get() as { count: number }
      ).count;

      const builtAt = (
        db.prepare("SELECT value FROM meta WHERE key = 'built_at'").get() as
          | { value: string }
          | undefined
      )?.value;

      console.log(`Cache status:`);
      console.log(`  Built: ${builtAt || '-'}`);
      console.log(`  Total documents: ${docCount}`);
      console.log(`  Total sections: ${sectionCount}`);
      console.log(`  Missions indexed: ${missions.length}`);
      for (const m of missions) {
        console.log(`    ${m.slug}: ${m.last_indexed_at}`);

        // Show task stats for this mission
        const tasksData = db
          .prepare('SELECT COUNT(*) as count FROM tasks WHERE mission_slug = ?')
          .all(m.slug) as { count: number }[];
        const taskCount = tasksData[0]?.count ?? 0;

        // Show gap stats
        const gapsData = db
          .prepare(
            'SELECT COUNT(*) as total, SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as open FROM gaps WHERE mission_slug = ?'
          )
          .get(m.slug) as { total: number; open: number } | undefined;
        const gapsTotal = gapsData?.total ?? 0;
        const gapsOpen = gapsData?.open ?? 0;

        // Show refactor stats
        const refactorData = db
          .prepare(
            'SELECT COUNT(*) as total, SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as open FROM refactor_items WHERE mission_slug = ?'
          )
          .get(m.slug) as { total: number; open: number } | undefined;
        const refactorTotal = refactorData?.total ?? 0;
        const refactorOpen = refactorData?.open ?? 0;

        // Show events stats
        const eventsData = db
          .prepare(
            'SELECT COUNT(*) as total, SUM(ok) as ok_count FROM events WHERE mission_slug = ?'
          )
          .get(m.slug) as { total: number; ok_count: number } | undefined;
        const eventsTotal = eventsData?.total ?? 0;
        const eventsOk = eventsData?.ok_count ?? 0;

        console.log(`      Tasks:    ${taskCount}`);
        if (gapsTotal > 0) {
          console.log(`      Gaps:     ${gapsOpen}/${gapsTotal} open`);
        }
        if (refactorTotal > 0) {
          console.log(`      Refactor: ${refactorOpen}/${refactorTotal} open`);
        }
        if (eventsTotal > 0) {
          console.log(`      Events:   ${eventsTotal} events (${eventsOk}/${eventsTotal} ok)`);
        }
      }
      return 0;
    }

    return 0;
  } finally {
    if (handle && !handle.db) {
      // Already closed
    } else if (handle) {
      handle.close();
    }
  }
}
