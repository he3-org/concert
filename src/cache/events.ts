export interface EventRecord {
  ts: string;
  mission_slug: string | null;
  tool: string;
  args_hash: string;
  doc: string | null;
  section: string | null;
  ok: boolean;
  error_class: string | null;
  duration_ms: number;
}

export function appendEvent(
  db: {
    prepare(sql: string): {
      run(...args: unknown[]): unknown;
    };
  },
  record: EventRecord
): void {
  db.prepare(
    'INSERT INTO events (ts, mission_slug, tool, args_hash, doc, section, ok, error_class, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    record.ts,
    record.mission_slug,
    record.tool,
    record.args_hash,
    record.doc,
    record.section,
    record.ok ? 1 : 0,
    record.error_class,
    record.duration_ms
  );
}
