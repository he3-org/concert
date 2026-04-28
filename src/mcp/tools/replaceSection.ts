import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { resolveActiveMissionPath } from '../../lib/missions.js';
import { replaceSectionBody } from '../../lib/section-edit.js';
import { atomicWriteFile } from '../../lib/atomic-write.js';
import { withMissionLock } from '../../lib/file-lock.js';
import { appendEventSafe } from '../../cache/cache.js';
import { replaceSectionInputSchema, replaceSectionOutputSchema } from '../schemas.js';

export interface ReplaceSectionInput {
  doc: string;
  section: string;
  newBody: string;
  mission?: string;
}

export interface ReplaceSectionOutput {
  ok: boolean;
  doc: string;
  section: string;
  bytesWritten?: number;
  error?: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.replace_section';
export const description =
  'Replace the body of a section while preserving its heading and surrounding sections.';
export const inputSchema = replaceSectionInputSchema;
export const outputSchema = replaceSectionOutputSchema;

export async function handler(
  args: ReplaceSectionInput,
  ctx: ToolContext
): Promise<ReplaceSectionOutput> {
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

      let updated: string;
      try {
        updated = replaceSectionBody(content, args.section, args.newBody);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(msg.includes('section not found') ? 'section not found' : msg);
      }

      atomicWriteFile(docPath, updated);
      return { bytesWritten: Buffer.byteLength(updated, 'utf-8') };
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

    return { ok: true, doc: args.doc, section: args.section, bytesWritten: result.bytesWritten };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    const errorClass = error.includes('lock busy')
      ? 'lock_busy'
      : error.includes('section not found')
        ? 'section_not_found'
        : 'unknown';
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
