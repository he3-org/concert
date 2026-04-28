import * as fs from 'node:fs';
import * as path from 'node:path';
import { findModifiedMarkers } from '../../lib/markdown-section.js';
import { resolveActiveMissionPath } from '../../lib/missions.js';
import { readState } from '../../lib/state.js';
import { listModifiedSectionsInputSchema, listModifiedSectionsOutputSchema } from '../schemas.js';

export interface ListModifiedSectionsInput {
  mission?: string;
}

export interface ModifiedDocSummary {
  doc: string;
  wholeDoc: boolean;
  sectionSlugs: string[];
}

export type ListModifiedSectionsOutput = ModifiedDocSummary[];

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.list_modified_sections';
export const description =
  'List mission documents with CONCERT:MODIFIED markers and affected sections.';
export const inputSchema = listModifiedSectionsInputSchema;
export const outputSchema = listModifiedSectionsOutputSchema;

export async function handler(
  args: ListModifiedSectionsInput,
  ctx: ToolContext
): Promise<ListModifiedSectionsOutput> {
  const missionPath = args.mission
    ? path.join(ctx.cwd, '.concert', 'missions', args.mission)
    : resolveActiveMissionPath(ctx.cwd);

  if (!missionPath || !fs.existsSync(missionPath)) {
    return [];
  }

  const state = readState(ctx.cwd);
  const effectiveMissionPath = state?.mission_path
    ? path.resolve(ctx.cwd, state.mission_path)
    : missionPath;

  if (!fs.existsSync(effectiveMissionPath)) {
    return [];
  }

  const entries = fs.readdirSync(effectiveMissionPath, { withFileTypes: true });
  const results: ModifiedDocSummary[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const docPath = path.join(effectiveMissionPath, entry.name);
    const content = fs.readFileSync(docPath, 'utf-8');
    const markers = findModifiedMarkers(content);

    if (markers.wholeDoc || markers.sectionSlugs.length > 0) {
      results.push({
        doc: entry.name,
        wholeDoc: markers.wholeDoc,
        sectionSlugs: markers.sectionSlugs,
      });
    }
  }

  return results;
}
