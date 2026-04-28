import { withCache } from '../../cache/cache.js';
import { getEventsInputSchema, getEventsOutputSchema } from '../schemas.js';

export interface GetEventsInput {
  mission?: string;
  limit?: number;
}

export interface EventRow {
  id: number;
  ts: string;
  mission_slug: string | null;
  tool: string;
  ok: boolean;
  error_class: string | null;
  duration_ms: number;
  doc: string | null;
  section: string | null;
}

export interface GetEventsOutput {
  events: EventRow[];
  total: number;
  generatedAt: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.get_events';
export const description =
  'Get recent tool call events from cache. Supports mission filter and limit.';
export const inputSchema = getEventsInputSchema;
export const outputSchema = getEventsOutputSchema;

export async function handler(args: GetEventsInput, ctx: ToolContext): Promise<GetEventsOutput> {
  const limit = Math.min(args.limit ?? 20, 100);

  const result = await withCache(
    ctx.cwd,
    (handle) => {
      const db = handle.db as {
        prepare(sql: string): {
          all(...args: unknown[]): unknown[];
          get(...args: unknown[]): unknown;
        };
      };

      let sql =
        'SELECT id, ts, mission_slug, tool, ok, error_class, duration_ms, doc, section FROM events';
      const params: unknown[] = [];

      if (args.mission) {
        sql += ' WHERE mission_slug = ?';
        params.push(args.mission);
      }

      sql += ' ORDER BY id DESC LIMIT ?';
      params.push(limit);

      const events = db.prepare(sql).all(...params) as EventRow[];

      // Get total count with same filter
      let countSql = 'SELECT COUNT(*) as count FROM events';
      const countParams: unknown[] = [];
      if (args.mission) {
        countSql += ' WHERE mission_slug = ?';
        countParams.push(args.mission);
      }
      const countRow = db.prepare(countSql).get(...countParams) as { count: number };

      return {
        events: events.map((e) => ({
          ...e,
          ok: Boolean(e.ok),
        })),
        total: countRow.count,
        generatedAt: new Date().toISOString(),
      };
    },
    () => ({
      events: [],
      total: 0,
      generatedAt: new Date().toISOString(),
    })
  );

  return result;
}
