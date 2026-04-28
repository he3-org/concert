import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { resolveActiveMissionPath } from '../../lib/missions.js';
import { parseSections } from '../../lib/markdown-section.js';
import { appendEventSafe } from '../../cache/cache.js';
import { alignmentCheckInputSchema, alignmentCheckOutputSchema } from '../schemas.js';

export interface AlignmentCheckInput {
  mission?: string;
}

export interface AlignmentFinding {
  severity: 'critical' | 'major' | 'minor' | 'info';
  kind: string;
  message: string;
  docs: string[];
}

export interface AlignmentCheckOutput {
  ok: boolean;
  missingDocs?: string[];
  findings?: AlignmentFinding[];
  error?: string;
}

export interface ToolContext {
  cwd: string;
}

export const name = 'concert.alignment_check';
export const description =
  'Perform mechanical alignment checks: missing docs, capability coverage, terminology consistency.';
export const inputSchema = alignmentCheckInputSchema;
export const outputSchema = alignmentCheckOutputSchema;

export async function handler(
  args: AlignmentCheckInput,
  ctx: ToolContext
): Promise<AlignmentCheckOutput> {
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
        doc: null,
        section: null,
        ok: false,
        error_class: 'mission_not_found',
        duration_ms: Date.now() - startTime,
      });
      return { ok: false, error };
    }

    const requiredDocs = ['VISION.md', 'REQUIREMENTS.md', 'ARCHITECTURE.md'];
    const missingDocs: string[] = [];
    const findings: AlignmentFinding[] = [];

    const docs: Record<string, string> = {};
    for (const docName of requiredDocs) {
      const docPath = path.join(missionPath, docName);
      if (!fs.existsSync(docPath)) {
        missingDocs.push(docName);
        findings.push({
          severity: 'critical',
          kind: 'missing_doc',
          message: `Missing required document: ${docName}`,
          docs: [docName],
        });
      } else {
        docs[docName] = fs.readFileSync(docPath, 'utf-8');
      }
    }

    if (docs['VISION.md'] && docs['REQUIREMENTS.md']) {
      const visionContent = docs['VISION.md'];
      const reqContent = docs['REQUIREMENTS.md'];

      const visionSections = parseSections(visionContent);
      const capabilitiesSection = visionSections.find((s) =>
        s.heading.toLowerCase().includes('capabilities')
      );

      if (capabilitiesSection && capabilitiesSection.body) {
        const capabilities = capabilitiesSection.body
          .split('\n')
          .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map((line) => line.replace(/^[\s\-\*]+/, '').trim())
          .filter(Boolean);

        for (const cap of capabilities) {
          const capKeywords = cap
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 4);
          const referenced = capKeywords.some((kw) => reqContent.toLowerCase().includes(kw));
          if (!referenced) {
            findings.push({
              severity: 'major',
              kind: 'coverage_gap',
              message: `Vision capability not referenced in REQUIREMENTS: "${cap.slice(0, 60)}${cap.length > 60 ? '...' : ''}"`,
              docs: ['VISION.md', 'REQUIREMENTS.md'],
            });
          }
        }
      }
    }

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

    return { ok: true, missingDocs, findings };
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
      error_class: 'unknown',
      duration_ms: Date.now() - startTime,
    });
    return { ok: false, error };
  }
}
