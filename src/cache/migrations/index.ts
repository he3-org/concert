/**
 * Forward-only SQL migrations for the Concert cache.
 *
 * Inlined as TS string constants so they ship inside the bundled `dist/`
 * output — `tsup` does not copy `.sql` sidecar files, and resolving them
 * relative to `import.meta.url` only works in the source tree, not in the
 * published package.
 *
 * Each migration's `version` becomes the new `schema_version` in `meta`.
 * On any version mismatch the cache is rebuilt from sources, never
 * migrated in place — so down-migrations are intentionally absent.
 */
export interface Migration {
  version: number;
  sql: string;
}

const M0001_INIT = `
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO meta (key, value) VALUES ('schema_version', '1');
INSERT INTO meta (key, value) VALUES ('built_at', '');

CREATE TABLE missions (
  slug TEXT PRIMARY KEY,
  stage TEXT,
  branch TEXT,
  mission_path TEXT NOT NULL,
  last_indexed_at TEXT NOT NULL
);

CREATE TABLE documents (
  mission_slug TEXT NOT NULL,
  doc_kind TEXT NOT NULL,
  path TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  PRIMARY KEY (mission_slug, path)
);

CREATE TABLE sections (
  mission_slug TEXT NOT NULL,
  doc_kind TEXT NOT NULL,
  doc_path TEXT NOT NULL,
  slug TEXT NOT NULL,
  heading TEXT NOT NULL,
  body_offset INTEGER NOT NULL,
  body_length INTEGER NOT NULL,
  modified_marker INTEGER NOT NULL DEFAULT 0,
  mtime_ms INTEGER NOT NULL,
  PRIMARY KEY (mission_slug, doc_path, slug)
);

CREATE TABLE modified_markers (
  mission_slug TEXT NOT NULL,
  doc_path TEXT NOT NULL,
  section_slug TEXT NOT NULL,
  marked_at TEXT NOT NULL,
  source_section TEXT,
  PRIMARY KEY (mission_slug, doc_path, section_slug)
);

CREATE INDEX idx_sections_mission ON sections(mission_slug);
CREATE INDEX idx_modified_mission ON modified_markers(mission_slug);
`;

const M0002_EVENTS = `
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  mission_slug TEXT,
  tool TEXT NOT NULL,
  args_hash TEXT NOT NULL,
  doc TEXT,
  section TEXT,
  ok INTEGER NOT NULL,
  error_class TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_events_mission ON events(mission_slug, ts);
CREATE INDEX idx_events_tool ON events(tool, ts);

INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2');
`;

export const MIGRATIONS: Migration[] = [
  { version: 1, sql: M0001_INIT },
  { version: 2, sql: M0002_EVENTS },
];
