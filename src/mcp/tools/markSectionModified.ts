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
  section?: string;
  sections?: string[];
  source?: string;
  mission?: string;
}

export interface MarkSectionModifiedResult {
  section: string;
  alreadyMarked: boolean;
  ok: boolean;
  error?: string;
}

export interface MarkSectionModifiedOutput {
  ok: boolean;
  doc: string;
  section?: string;
  alreadyMarked?: boolean;
  results?: MarkSectionModifiedResult[];
  error?: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.mark_section_modified';
export const description =
  'Insert or refresh CONCERT:MODIFIED markers on one or more sections. Pass `section` for a single slug or `sections` for a batch (single lock + write).';
export const inputSchema = markSectionModifiedInputSchema;
export const outputSchema = markSectionModifiedOutputSchema;

function resolveSections(args: MarkSectionModifiedInput): string[] {
  if (args.sections && args.sections.length > 0) return args.sections;
  if (args.section) return [args.section];
  return [];
}

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

  const sections = resolveSections(args);
  const isBatch = !!(args.sections && args.sections.length > 0);
  const sectionForEvent = sections.length === 0 ? null : sections.join(',').slice(0, 200);
  const sectionForResult = isBatch ? undefined : args.section;

  if (sections.length === 0) {
    const error = 'section or sections required';
    await appendEventSafe(ctx.cwd, {
      ts: new Date().toISOString(),
      mission_slug: args.mission ?? null,
      tool: name,
      args_hash: argsHash,
      doc: args.doc,
      section: null,
      ok: false,
      error_class: 'invalid_input',
      duration_ms: Date.now() - startTime,
    });
    return { ok: false, doc: args.doc, section: sectionForResult, error };
  }

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
        section: sectionForEvent,
        ok: false,
        error_class: 'mission_not_found',
        duration_ms: Date.now() - startTime,
      });
      return { ok: false, doc: args.doc, section: sectionForResult, error };
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
        section: sectionForEvent,
        ok: false,
        error_class: 'doc_not_found',
        duration_ms: Date.now() - startTime,
      });
      return { ok: false, doc: args.doc, section: sectionForResult, error };
    }

    const result = await withMissionLock(missionPath, async () => {
      let content = fs.readFileSync(docPath, 'utf-8');
      const results: MarkSectionModifiedResult[] = [];
      let dirty = false;
      for (const slug of sections) {
        const markerPattern = new RegExp(`CONCERT:MODIFIED:${escapeRegExp(slug)}`, 'i');
        const alreadyMarked = markerPattern.test(content);
        try {
          content = insertOrRefreshMarker(content, slug, args.source);
          dirty = true;
          results.push({ section: slug, alreadyMarked, ok: true });
        } catch {
          if (!isBatch) {
            // Preserve historical single-slug behaviour: throw so the outer
            // catch returns the structured error and no write occurs.
            throw new Error(`section not found: ${slug}`);
          }
          results.push({
            section: slug,
            alreadyMarked,
            ok: false,
            error: `section not found: ${slug}`,
          });
        }
      }
      if (dirty) {
        atomicWriteFile(docPath, content);
      }
      return { results };
    });

    const allOk = result.results.every((r) => r.ok);
    await appendEventSafe(ctx.cwd, {
      ts: new Date().toISOString(),
      mission_slug: args.mission ?? null,
      tool: name,
      args_hash: argsHash,
      doc: args.doc,
      section: sectionForEvent,
      ok: allOk,
      error_class: allOk ? null : 'section_not_found',
      duration_ms: Date.now() - startTime,
    });

    if (isBatch) {
      return { ok: allOk, doc: args.doc, results: result.results };
    }
    const single = result.results[0]!;
    return {
      ok: single.ok,
      doc: args.doc,
      section: single.section,
      alreadyMarked: single.alreadyMarked,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    const errorClass = error.includes('lock busy') ? 'lock_busy' : 'unknown';
    await appendEventSafe(ctx.cwd, {
      ts: new Date().toISOString(),
      mission_slug: args.mission ?? null,
      tool: name,
      args_hash: argsHash,
      doc: args.doc,
      section: sectionForEvent,
      ok: false,
      error_class: errorClass,
      duration_ms: Date.now() - startTime,
    });
    return { ok: false, doc: args.doc, section: sectionForResult, error };
  }
}
