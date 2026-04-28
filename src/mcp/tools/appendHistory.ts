import * as crypto from 'node:crypto';
import { appendHistory as appendHistoryToState } from '../../lib/state.js';
import { appendEventSafe } from '../../cache/cache.js';
import { appendHistoryInputSchema, appendHistoryOutputSchema } from '../schemas.js';
import type { HistoryEntry } from '../../types.js';

export interface AppendHistoryInput {
  entry: HistoryEntry;
  mission?: string;
}

export interface AppendHistoryOutput {
  ok: boolean;
  count?: number;
  error?: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.append_history';
export const description = 'Append a history entry to state.json.';
export const inputSchema = appendHistoryInputSchema;
export const outputSchema = appendHistoryOutputSchema;

export async function handler(
  args: AppendHistoryInput,
  ctx: ToolContext
): Promise<AppendHistoryOutput> {
  const startTime = Date.now();
  const argsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(args))
    .digest('hex')
    .slice(0, 12);

  try {
    const count = appendHistoryToState(ctx.cwd, args.entry);

    await appendEventSafe(ctx.cwd, {
      ts: new Date().toISOString(),
      mission_slug: args.mission ?? null,
      tool: name,
      args_hash: argsHash,
      doc: null,
      section: null,
      ok: true,
      error_class: null,
      duration_ms: Date.now() - startTime,
    });

    return { ok: true, count };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    await appendEventSafe(ctx.cwd, {
      ts: new Date().toISOString(),
      mission_slug: args.mission ?? null,
      tool: name,
      args_hash: argsHash,
      doc: null,
      section: null,
      ok: false,
      error_class: 'state_error',
      duration_ms: Date.now() - startTime,
    });
    return { ok: false, error };
  }
}
