import * as fs from 'node:fs';
import * as path from 'node:path';
import { getSection as getSectionFromMd } from '../../lib/markdown-section.js';
import { resolveActiveMissionPath } from '../../lib/missions.js';
import { readState } from '../../lib/state.js';
import { getSectionInputSchema, getSectionOutputSchema } from '../schemas.js';

export interface GetSectionInput {
  doc: string;
  section: string;
  mission?: string;
}

export interface GetSectionOutput {
  found: boolean;
  doc: string;
  section: string;
  heading?: string;
  body?: string;
  modifiedMarker?: boolean;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.get_section';
export const description = 'Get a specific markdown section from a mission document by slug.';
export const inputSchema = getSectionInputSchema;
export const outputSchema = getSectionOutputSchema;

export async function handler(args: GetSectionInput, ctx: ToolContext): Promise<GetSectionOutput> {
  const missionPath = args.mission
    ? path.join(ctx.cwd, '.concert', 'missions', args.mission)
    : resolveActiveMissionPath(ctx.cwd);

  if (!missionPath) {
    return { found: false, doc: args.doc, section: args.section };
  }

  const state = readState(ctx.cwd);
  const effectiveMissionPath = state?.mission_path
    ? path.resolve(ctx.cwd, state.mission_path)
    : missionPath;

  // Resolve doc path
  const docPath = args.doc.startsWith('.concert/')
    ? path.resolve(ctx.cwd, args.doc)
    : path.resolve(effectiveMissionPath, args.doc);

  if (!fs.existsSync(docPath)) {
    return { found: false, doc: args.doc, section: args.section };
  }

  const content = fs.readFileSync(docPath, 'utf-8');
  const section = getSectionFromMd(content, args.section);

  if (!section) {
    return { found: false, doc: args.doc, section: args.section };
  }

  return {
    found: true,
    doc: args.doc,
    section: args.section,
    heading: section.heading,
    body: section.body,
    modifiedMarker: section.modifiedMarker,
  };
}
