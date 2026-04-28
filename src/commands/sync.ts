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
            };
          },
          cwd
        );
        console.log(`Rebuilt cache: ${results.length} missions indexed`);
        for (const r of results) {
          console.log(
            `  ${r.missionSlug}: ${r.documentsIndexed} docs, ${r.sectionsIndexed} sections, ${r.markersFound} markers`
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
