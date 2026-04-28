import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { resolveActiveMissionPath } from '../../lib/missions.js';
import { insertOrRefreshMarker, removeMarker, escapeRegExp } from '../../lib/section-edit.js';
import { atomicWriteFile } from '../../lib/atomic-write.js';
import { withMissionLock } from '../../lib/file-lock.js';
import { appendEventSafe } from '../../cache/cache.js';
import { markSectionModifiedInputSchema, markSectionModifiedOutputSchema } from '../schemas.js';

export interface MarkSectionModifiedInput {
  doc: string;
  section: string;
  source?: string;
  mission?: string;
}

export interface MarkSectionModifiedOutput {
  ok: boolean;
  doc: string;
  section: string;
  alreadyMarked?: boolean;
  error?: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.mark_section_modified';
export const description =
  'Mark a section as modified by inserting or refreshing a CONCERT:MODIFIED marker.';
export const inputSchema = markSectionModifiedInputSchema;
export const outputSchema = markSectionModifiedOutputSchema;

export async function handler(
  args: MarkSectionModifiedInput,
  ctx: ToolContext
): Promise<MarkSectionModifiedOutput> {
  const startTime = Date.now();
  const argsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(args))
    .digest('hex')
    .slice(0, 12);

  try {
    const missionPath = args.mission
      ? path.join(ctx.cwd, '.concert', 'missions', args.mission)
      : resolveActiveMissionPath(ctx.cwd);

    if (!missionPath || !fs.existsSync(missionPath)) {
      const error = 'mission not found';
      await appendEventSafe(ctx.cwd, {
        ts: new Date().toISOString(),
        mission_slug: args.mission ?? null,
        tool: name,
        args_hash: argsHash,
        doc: args.doc,
        section: args.section,
        ok: false,
        error_class: 'mission_not_found',
        duration_ms: Date.now() - startTime,
      });
      return { ok: false, doc: args.doc, section: args.section, error };
    }

    const docPath = path.resolve(missionPath, args.doc);
    if (!fs.existsSync(docPath)) {
      const error = 'doc not found';
      await appendEventSafe(ctx.cwd, {
        ts: new Date().toISOString(),
        mission_slug: args.mission ?? null,
        tool: name,
        args_hash: argsHash,
        doc: args.doc,
        section: args.section,
        ok: false,
        error_class: 'doc_not_found',
        duration_ms: Date.now() - startTime,
      });
      return { ok: false, doc: args.doc, section: args.section, error };
    }

    const result = await withMissionLock(missionPath, async () => {
      const content = fs.readFileSync(docPath, 'utf-8');
      const markerPattern = new RegExp(`CONCERT:MODIFIED:${escapeRegExp(args.section)}`, 'i');
      const alreadyMarked = markerPattern.test(content);

      let updated: string;
      try {
        updated = insertOrRefreshMarker(content, args.section, args.source);
      } catch {
        throw new Error(`section not found: ${args.section}`);
      }

      atomicWriteFile(docPath, updated);
      return { alreadyMarked };
    });

    await appendEventSafe(ctx.cwd, {
      ts: new Date().toISOString(),
      mission_slug: args.mission ?? null,
      tool: name,
      args_hash: argsHash,
      doc: args.doc,
      section: args.section,
      ok: true,
      error_class: null,
      duration_ms: Date.now() - startTime,
    });

    return { ok: true, doc: args.doc, section: args.section, alreadyMarked: result.alreadyMarked };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    const errorClass = error.includes('lock busy') ? 'lock_busy' : 'unknown';
    await appendEventSafe(ctx.cwd, {
      ts: new Date().toISOString(),
      mission_slug: args.mission ?? null,
      tool: name,
      args_hash: argsHash,
      doc: args.doc,
      section: args.section,
      ok: false,
      error_class: errorClass,
      duration_ms: Date.now() - startTime,
    });
    return { ok: false, doc: args.doc, section: args.section, error };
  }
}
