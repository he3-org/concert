import * as crypto from 'node:crypto';
import { appendTelemetry as appendTelemetryToState } from '../../lib/state.js';
import { appendEventSafe } from '../../cache/cache.js';
import { appendTelemetryInputSchema, appendTelemetryOutputSchema } from '../schemas.js';
import type { TelemetryRecord } from '../../types.js';

export interface AppendTelemetryInput {
  record: TelemetryRecord;
  mission?: string;
}

export interface AppendTelemetryOutput {
  ok: boolean;
  count?: number;
  error?: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.append_telemetry';
export const description = 'Append a telemetry record to state.json.';
export const inputSchema = appendTelemetryInputSchema;
export const outputSchema = appendTelemetryOutputSchema;

export async function handler(
  args: AppendTelemetryInput,
  ctx: ToolContext
): Promise<AppendTelemetryOutput> {
  const startTime = Date.now();
  const argsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(args))
    .digest('hex')
    .slice(0, 12);

  try {
    const count = appendTelemetryToState(ctx.cwd, args.record);

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
