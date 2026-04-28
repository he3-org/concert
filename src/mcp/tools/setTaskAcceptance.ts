import * as fs from 'node:fs';
import * as path from 'node:path';
import { listMissions } from '../../lib/missions.js';
import { readState } from '../../lib/state.js';
import { withCache } from '../../cache/cache.js';
import { parseTaskFrontmatter } from '../../lib/task-frontmatter.js';
import { setAcceptance, parseAcceptance } from '../../lib/section-edit.js';
import { atomicWriteFile } from '../../lib/atomic-write.js';
import { withMissionLock } from '../../lib/file-lock.js';
import { appendEventSafe } from '../../cache/cache.js';
import { setTaskAcceptanceInputSchema, setTaskAcceptanceOutputSchema } from '../schemas.js';
import type { ToolDefinition, ToolContext } from '../registry.js';

export const name = 'concert.set_task_acceptance';
export const description = 'Toggle an acceptance criterion in a task file';
export const inputSchema = setTaskAcceptanceInputSchema;
export const outputSchema = setTaskAcceptanceOutputSchema;

interface SetTaskAcceptanceInput {
  task: string;
  index?: number;
  text?: string;
  checked: boolean;
  mission?: string;
}

interface SetTaskAcceptanceOutput {
  ok: boolean;
  task: string;
  filePath?: string;
  previous?: boolean;
  current?: boolean;
  totalAcceptance?: number;
  completedAcceptance?: number;
  error?: string;
}

export const handler: ToolDefinition<
  SetTaskAcceptanceInput,
  SetTaskAcceptanceOutput
>['handler'] = async (args, ctx) => {
  const missionSlug = args.mission ?? readState(ctx.cwd)?.mission ?? null;
  if (!missionSlug) {
    throw new Error('No active mission; specify --mission or set one via state.json');
  }

  const missions = listMissions(ctx.cwd);
  const mission = missions.find((m) => m.slug === missionSlug);
  if (!mission) {
    throw new Error(`Mission not found: ${missionSlug}`);
  }

  let taskFilePath: string | null = null;

  const cacheResult = await withCache<string | null>(
    ctx.cwd,
    async (handle) => {
      const db = handle.db as {
        prepare(sql: string): {
          get(...args: unknown[]): unknown;
        };
      };

      type DBRow = { file_path: string };
      const row = db
        .prepare('SELECT file_path FROM tasks WHERE mission_slug = ? AND task_slug = ?')
        .get(missionSlug, args.task) as DBRow | undefined;
      return row ? row.file_path : null;
    },
    async () => null
  );

  if (cacheResult) {
    taskFilePath = path.join(mission.path, cacheResult);
  } else {
    const phasesDir = path.join(mission.path, 'phases');
    if (fs.existsSync(phasesDir)) {
      const phaseEntries = fs.readdirSync(phasesDir, { withFileTypes: true });
      for (const phaseEntry of phaseEntries) {
        if (!phaseEntry.isDirectory()) continue;
        const phasePath = path.join(phasesDir, phaseEntry.name);
        const taskFiles = fs
          .readdirSync(phasePath, { withFileTypes: true })
          .filter((e) => e.isFile() && /^TASK-.*\.md$/.test(e.name));

        for (const taskFile of taskFiles) {
          const absPath = path.join(phasePath, taskFile.name);
          try {
            const content = fs.readFileSync(absPath, 'utf-8');
            const parsed = parseTaskFrontmatter(content);
            if (parsed.frontmatter && parsed.frontmatter.task === args.task) {
              taskFilePath = absPath;
              break;
            }
          } catch {
            continue;
          }
        }
        if (taskFilePath) break;
      }
    }
  }

  if (!taskFilePath || !fs.existsSync(taskFilePath)) {
    return {
      ok: false,
      task: args.task,
      error: `Task not found: ${args.task}`,
    };
  }

  let result: SetTaskAcceptanceOutput;

  await withMissionLock(mission.path, async () => {
    const content = fs.readFileSync(taskFilePath!, 'utf-8');
    const itemsBefore = parseAcceptance(content);
    const selector = { index: args.index, text: args.text };

    let targetIndex: number | undefined;
    if (args.index !== undefined) {
      targetIndex = args.index;
    } else if (args.text) {
      const lowerText = args.text.toLowerCase();
      const matches = itemsBefore.filter((it) => it.text.toLowerCase().includes(lowerText));
      if (matches.length === 0) {
        result = {
          ok: false,
          task: args.task,
          filePath: path.relative(mission.path, taskFilePath!),
          error: 'no matching acceptance criterion',
        };
        await appendEventSafe(ctx.cwd, {
          ts: new Date().toISOString(),
          mission_slug: missionSlug,
          tool: 'concert.set_task_acceptance',
          args_hash: JSON.stringify(args),
          doc: path.relative(mission.path, taskFilePath!),
          section: args.task,
          ok: false,
          error_class: 'not_found',
          duration_ms: 0,
        });
        return;
      }
      if (matches.length > 1) {
        result = {
          ok: false,
          task: args.task,
          filePath: path.relative(mission.path, taskFilePath!),
          error: 'ambiguous acceptance criterion text',
        };
        await appendEventSafe(ctx.cwd, {
          ts: new Date().toISOString(),
          mission_slug: missionSlug,
          tool: 'concert.set_task_acceptance',
          args_hash: JSON.stringify(args),
          doc: path.relative(mission.path, taskFilePath!),
          section: args.task,
          ok: false,
          error_class: 'ambiguous',
          duration_ms: 0,
        });
        return;
      }
      targetIndex = matches[0]!.index;
    }

    const targetItem = itemsBefore.find((it) => it.index === targetIndex);
    const previousState = targetItem ? targetItem.done : false;

    try {
      const updated = setAcceptance(content, selector, args.checked);
      atomicWriteFile(taskFilePath!, updated);

      const itemsAfter = parseAcceptance(updated);
      const totalAcceptance = itemsAfter.length;
      const completedAcceptance = itemsAfter.filter((a) => a.done).length;

      result = {
        ok: true,
        task: args.task,
        filePath: path.relative(mission.path, taskFilePath!),
        previous: previousState,
        current: args.checked,
        totalAcceptance,
        completedAcceptance,
      };

      await appendEventSafe(ctx.cwd, {
        ts: new Date().toISOString(),
        mission_slug: missionSlug,
        tool: 'concert.set_task_acceptance',
        args_hash: JSON.stringify(args),
        doc: path.relative(mission.path, taskFilePath!),
        section: args.task,
        ok: true,
        error_class: null,
        duration_ms: 0,
      });
    } catch (err: unknown) {
      const e = err as Error;
      result = {
        ok: false,
        task: args.task,
        filePath: path.relative(mission.path, taskFilePath!),
        error: e.message,
      };
      await appendEventSafe(ctx.cwd, {
        ts: new Date().toISOString(),
        mission_slug: missionSlug,
        tool: 'concert.set_task_acceptance',
        args_hash: JSON.stringify(args),
        doc: path.relative(mission.path, taskFilePath!),
        section: args.task,
        ok: false,
        error_class: e.message,
        duration_ms: 0,
      });
    }
  });

  return result!;
};
