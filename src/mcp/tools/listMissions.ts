import { listMissions } from '../../lib/missions.js';
import type { MissionSummary } from '../../lib/missions.js';
import { listMissionsInputSchema, listMissionsOutputSchema } from '../schemas.js';

export type ListMissionsInput = Record<string, never>;
export type ListMissionsOutput = MissionSummary[];

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.list_missions';
export const description =
  'List all missions in .concert/missions/ with their status and metadata.';
export const inputSchema = listMissionsInputSchema;
export const outputSchema = listMissionsOutputSchema;

export async function handler(
  _args: ListMissionsInput,
  ctx: ToolContext
): Promise<ListMissionsOutput> {
  return listMissions(ctx.cwd);
}
