import * as fs from 'node:fs';
import * as path from 'node:path';
import { listMissions } from '../../lib/missions.js';
import { readState } from '../../lib/state.js';
import { withCache } from '../../cache/cache.js';
import { parseTaskFrontmatter } from '../../lib/task-frontmatter.js';
import { parseAcceptance } from '../../lib/section-edit.js';
import { parseSections } from '../../lib/markdown-section.js';
import { getTaskInputSchema, getTaskOutputSchema } from '../schemas.js';
import type { ToolDefinition, ToolContext } from '../registry.js';

export const name = 'concert.get_task';
export const description = 'Get full details of a specific task file';
export const inputSchema = getTaskInputSchema;
export const outputSchema = getTaskOutputSchema;

interface GetTaskInput {
  task: string;
  mission?: string;
}

interface GetTaskOutput {
  found: boolean;
  task?: string;
  title?: string;
  phase?: string;
  wave?: number;
  model?: 'simple' | 'average' | 'complex';
  dependsOn?: string[];
  filePath?: string;
  acceptance?: { index: number; text: string; done: boolean }[];
  body?: {
    description?: string;
    filesToModify?: string;
    testsToWrite?: string;
    skills?: string;
    notes?: string;
  };
}

export const handler: ToolDefinition<GetTaskInput, GetTaskOutput>['handler'] = async (
  args,
  ctx
) => {
  const missionSlug = args.mission ?? readState(ctx.cwd)?.mission ?? null;
  if (!missionSlug) {
    throw new Error('No active mission; specify --mission or set one via state.json');
  }

  const missions = listMissions(ctx.cwd);
  const mission = missions.find((m) => m.slug === missionSlug);
  if (!mission) {
    throw new Error(`Mission not found: ${missionSlug}`);
  }

  const result = await withCache<GetTaskOutput>(
    ctx.cwd,
    async (handle) => {
      const db = handle.db as {
        prepare(sql: string): {
          get(...args: unknown[]): unknown;
        };
      };

      type DBRow = {
        task_slug: string;
        title: string;
        phase: string | null;
        wave: number;
        model: string | null;
        depends_on: string;
        file_path: string;
      };

      const row = db
        .prepare(
          'SELECT task_slug, title, phase, wave, model, depends_on, file_path FROM tasks WHERE mission_slug = ? AND task_slug = ?'
        )
        .get(missionSlug, args.task) as DBRow | undefined;

      if (!row) {
        return { found: false };
      }

      const absPath = path.join(mission.path, row.file_path);
      if (!fs.existsSync(absPath)) {
        return { found: false };
      }

      const content = fs.readFileSync(absPath, 'utf-8');
      const parsed = parseTaskFrontmatter(content);
      if (!parsed.frontmatter) {
        return { found: false };
      }

      const acceptance = parseAcceptance(content);
      const body = extractBodySections(content);

      return {
        found: true,
        task: row.task_slug,
        title: row.title,
        phase: row.phase ?? undefined,
        wave: row.wave,
        model: row.model ? (row.model as 'simple' | 'average' | 'complex') : undefined,
        dependsOn: JSON.parse(row.depends_on) as string[],
        filePath: row.file_path,
        acceptance: acceptance.map((a) => ({ index: a.index, text: a.text, done: a.done })),
        body,
      };
    },
    async () => {
      const missionPath = mission.path;
      const phasesDir = path.join(missionPath, 'phases');
      if (!fs.existsSync(phasesDir)) return { found: false };

      const phaseEntries = fs.readdirSync(phasesDir, { withFileTypes: true });
      for (const phaseEntry of phaseEntries) {
        if (!phaseEntry.isDirectory()) continue;
        const phasePath = path.join(phasesDir, phaseEntry.name);
        const taskFiles = fs
          .readdirSync(phasePath, { withFileTypes: true })
          .filter((e) => e.isFile() && /^TASK-.*\.md$/.test(e.name));

        for (const taskFile of taskFiles) {
          const taskFilePath = path.join(phasePath, taskFile.name);
          try {
            const content = fs.readFileSync(taskFilePath, 'utf-8');
            const parsed = parseTaskFrontmatter(content);
            if (!parsed.frontmatter) continue;
            if (parsed.frontmatter.task !== args.task) continue;

            const fm = parsed.frontmatter;
            const acceptance = parseAcceptance(content);
            const body = extractBodySections(content);

            return {
              found: true,
              task: fm.task,
              title: fm.title,
              phase: fm.phase ?? phaseEntry.name,
              wave: fm.wave,
              model: fm.model,
              dependsOn: fm.depends_on,
              filePath: path.relative(missionPath, taskFilePath),
              acceptance: acceptance.map((a) => ({ index: a.index, text: a.text, done: a.done })),
              body,
            };
          } catch {
            continue;
          }
        }
      }

      return { found: false };
    }
  );

  return result;
};

function extractBodySections(md: string): {
  description?: string;
  filesToModify?: string;
  testsToWrite?: string;
  skills?: string;
  notes?: string;
} {
  const sections = parseSections(md);
  const result: {
    description?: string;
    filesToModify?: string;
    testsToWrite?: string;
    skills?: string;
    notes?: string;
  } = {};

  const slugMap: Record<string, keyof typeof result> = {
    description: 'description',
    'files-to-create-modify': 'filesToModify',
    'tests-to-write': 'testsToWrite',
    skills: 'skills',
    notes: 'notes',
  };

  for (const section of sections) {
    const key = slugMap[section.slug];
    if (key) {
      const lines = md.split('\n');
      const bodyStart = section.bodyOffset;
      const bodyEnd = bodyStart + section.bodyLength;
      const bodyText = lines.slice(bodyStart, bodyEnd).join('\n').trim();
      result[key] = bodyText;
    }
  }

  return result;
}
