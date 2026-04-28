import * as fs from 'node:fs';
import * as path from 'node:path';
import { MIGRATIONS } from './migrations/index.js';

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;

export interface CacheHandle {
  db: unknown;
  close(): void;
}

/**
 * Open the SQLite cache at .concert/index.sqlite.
 * Returns null if better-sqlite3 is not installed or if CONCERT_CACHE_DISABLED=1.
 */
export async function openCache(cwd: string): Promise<CacheHandle | null> {
  if (process.env.CONCERT_CACHE_DISABLED === '1') {
    return null;
  }

  let Database: unknown;
  try {
    // @ts-expect-error -- optional native dep, lazy-loaded
    const mod = await import('better-sqlite3');
    Database = mod.default;
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'ERR_MODULE_NOT_FOUND' || e.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw err;
  }

  const concertDir = path.join(cwd, '.concert');
  if (!fs.existsSync(concertDir)) {
    fs.mkdirSync(concertDir, { recursive: true });
  }

  const dbPath = path.join(concertDir, 'index.sqlite');
  const exists = fs.existsSync(dbPath);

  // @ts-expect-error -- optional native dep
  const db = new Database(dbPath) as {
    exec(sql: string): void;
    prepare(sql: string): { get(...args: unknown[]): unknown };
    close(): void;
  };

  if (!exists) {
    applyMigrations(db);
  } else {
    const currentVersion = getCurrentSchemaVersion(db);
    if (currentVersion !== SCHEMA_VERSION) {
      db.close();
      fs.unlinkSync(dbPath);
      const shmPath = dbPath + '-shm';
      const walPath = dbPath + '-wal';
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      console.error('Concert: rebuilding cache (schema version mismatch)');
      // @ts-expect-error -- optional native dep
      const freshDb = new Database(dbPath);
      applyMigrations(freshDb);
      return { db: freshDb, close: () => freshDb.close() };
    }
  }

  return { db, close: () => db.close() };
}

function getCurrentSchemaVersion(db: {
  prepare(sql: string): { get(...args: unknown[]): unknown };
}): number {
  try {
    const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
      | { value: string }
      | undefined;
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    return 0;
  }
}

function applyMigrations(db: {
  exec(sql: string): void;
  prepare(sql: string): { get(...args: unknown[]): unknown };
}): void {
  const currentVersion = getCurrentSchemaVersion(db);
  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    db.exec(migration.sql);
  }
  // Single-quote escape: ISO timestamps never contain apostrophes.
  db.exec(
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('built_at', '${new Date().toISOString()}')`
  );
}
