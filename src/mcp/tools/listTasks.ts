import * as fs from 'node:fs';
import * as path from 'node:path';
import { listMissions } from '../../lib/missions.js';
import { readState } from '../../lib/state.js';
import { withCache } from '../../cache/cache.js';
import { parseTaskFrontmatter } from '../../lib/task-frontmatter.js';
import { parseAcceptance } from '../../lib/section-edit.js';
import { listTasksInputSchema, listTasksOutputSchema } from '../schemas.js';
import type { ToolDefinition, ToolContext } from '../registry.js';

export const name = 'concert.list_tasks';
export const description = 'List task files with optional filters (phase, wave, model, status)';
export const inputSchema = listTasksInputSchema;
export const outputSchema = listTasksOutputSchema;

interface ListTasksInput {
  mission?: string;
  phase?: string;
  wave?: number;
  model?: 'haiku' | 'sonnet' | 'opus';
  status?: 'pending' | 'in-progress' | 'done';
}

interface TaskRow {
  task: string;
  title: string;
  phase: string | null;
  wave: number;
  model: string | null;
  dependsOn: string[];
  filePath: string;
  totalAcceptance: number;
  completedAcceptance: number;
  status: 'pending' | 'in-progress' | 'done';
}

interface ListTasksOutput {
  tasks: TaskRow[];
}

export const handler: ToolDefinition<ListTasksInput, ListTasksOutput>['handler'] = async (
  args,
  ctx
) => {
  const missionSlug = args.mission ?? readState(ctx.cwd)?.mission ?? null;
  if (!missionSlug) {
    throw new Error('No active mission; specify --mission or set one via state.json');
  }

  const missions = (await import('../../lib/missions.js')).listMissions(ctx.cwd);
  const mission = missions.find((m) => m.slug === missionSlug);
  if (!mission) {
    throw new Error(`Mission not found: ${missionSlug}`);
  }

  const result = await withCache<ListTasksOutput>(
    ctx.cwd,
    async (handle) => {
      const db = handle.db as {
        prepare(sql: string): {
          all(...args: unknown[]): unknown[];
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
        total_acceptance: number;
        completed_acceptance: number;
      };

      let sql =
        'SELECT task_slug, title, phase, wave, model, depends_on, file_path, total_acceptance, completed_acceptance FROM tasks WHERE mission_slug = ?';
      const params: (string | number)[] = [missionSlug];

      if (args.phase) {
        sql += ' AND phase = ?';
        params.push(args.phase);
      }
      if (args.wave !== undefined) {
        sql += ' AND wave = ?';
        params.push(args.wave);
      }
      if (args.model) {
        sql += ' AND model = ?';
        params.push(args.model);
      }

      sql += ' ORDER BY phase, wave, task_slug';

      const rows = db.prepare(sql).all(...params) as DBRow[];

      const tasks: TaskRow[] = rows.map((r) => {
        const status = deriveStatus(r.total_acceptance, r.completed_acceptance);
        return {
          task: r.task_slug,
          title: r.title,
          phase: r.phase,
          wave: r.wave,
          model: r.model,
          dependsOn: JSON.parse(r.depends_on) as string[],
          filePath: r.file_path,
          totalAcceptance: r.total_acceptance,
          completedAcceptance: r.completed_acceptance,
          status,
        };
      });

      const filtered = args.status ? tasks.filter((t) => t.status === args.status) : tasks;

      return { tasks: filtered };
    },
    async () => {
      const missionPath = mission.path;
      const tasks = await readTasksFromDisk(missionPath, mission.slug);
      let filtered = tasks;

      if (args.phase) {
        filtered = filtered.filter((t) => t.phase === args.phase);
      }
      if (args.wave !== undefined) {
        filtered = filtered.filter((t) => t.wave === args.wave);
      }
      if (args.model) {
        filtered = filtered.filter((t) => t.model === args.model);
      }
      if (args.status) {
        filtered = filtered.filter((t) => t.status === args.status);
      }

      filtered.sort((a, b) => {
        if (a.phase !== b.phase) return (a.phase ?? '').localeCompare(b.phase ?? '');
        if (a.wave !== b.wave) return a.wave - b.wave;
        return a.task.localeCompare(b.task);
      });

      return { tasks: filtered };
    }
  );

  return result;
};

function deriveStatus(total: number, completed: number): 'pending' | 'in-progress' | 'done' {
  if (total === 0 || completed === 0) return 'pending';
  if (completed === total) return 'done';
  return 'in-progress';
}

async function readTasksFromDisk(missionPath: string, missionSlug: string): Promise<TaskRow[]> {
  const tasks: TaskRow[] = [];
  const phasesDir = path.join(missionPath, 'phases');
  if (!fs.existsSync(phasesDir)) return tasks;

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

        const fm = parsed.frontmatter;
        const acceptance = parseAcceptance(content);
        const totalAcceptance = acceptance.length;
        const completedAcceptance = acceptance.filter((a) => a.done).length;

        tasks.push({
          task: fm.task,
          title: fm.title,
          phase: fm.phase ?? phaseEntry.name,
          wave: fm.wave,
          model: fm.model ?? null,
          dependsOn: fm.depends_on,
          filePath: path.relative(missionPath, taskFilePath),
          totalAcceptance,
          completedAcceptance,
          status: deriveStatus(totalAcceptance, completedAcceptance),
        });
      } catch {
        // Skip malformed files
      }
    }
  }

  return tasks;
}
