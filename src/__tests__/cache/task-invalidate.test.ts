import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { openCache } from '../../cache/index.js';
import { ensureFresh } from '../../cache/invalidate.js';

const hasSqlite = await (async () => {
  try {
    // @ts-expect-error -- optional native dep, lazy-loaded
    await import('better-sqlite3');
    return true;
  } catch {
    return false;
  }
})();
const d = hasSqlite ? describe : describe.skip;

/**
 * Regression: a manual edit to a TASK file (acceptance flip, body change,
 * etc.) must invalidate the corresponding `tasks` cache row. Before this
 * test was added, `ensureFresh` only walked the top-level mission `*.md`
 * documents, so any change to a task file silently kept the stale row.
 */
d('ensureFresh - task mtime invalidation', () => {
  it('reindexes when a task file mtime changes', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-task-invalidate-'));
    const missionPath = path.join(cwd, '.concert', 'missions', 'demo');
    const phase = path.join(missionPath, 'phases', '01-foo');
    fs.mkdirSync(phase, { recursive: true });
    fs.writeFileSync(
      path.join(cwd, '.concert', 'state.json'),
      JSON.stringify({ mission: 'demo', mission_path: '.concert/missions/demo' })
    );
    const taskFile = path.join(phase, 'TASK-bar.md');
    fs.writeFileSync(
      taskFile,
      [
        '---',
        "task: 'bar'",
        "title: 'Bar'",
        "phase: '01-foo'",
        'wave: 1',
        'model: haiku',
        'depends_on: []',
        '---',
        '',
        '## Acceptance Criteria',
        '',
        '- [ ] First',
        '- [ ] Second',
        '',
      ].join('\n')
    );

    return openCache(cwd).then((handle) => {
      expect(handle).not.toBeNull();
      try {
        ensureFresh(handle!.db as Parameters<typeof ensureFresh>[0], cwd, 'demo');
        const before = (
          handle!.db as {
            prepare(s: string): { get(...a: unknown[]): unknown };
          }
        )
          .prepare('SELECT completed_acceptance, total_acceptance FROM tasks WHERE task_slug = ?')
          .get('bar') as { completed_acceptance: number; total_acceptance: number };
        expect(before).toEqual({ completed_acceptance: 0, total_acceptance: 2 });

        // Flip a checkbox by hand and bump mtime ≥ 1 ms forward.
        const flipped = fs.readFileSync(taskFile, 'utf-8').replace('- [ ] First', '- [x] First');
        fs.writeFileSync(taskFile, flipped);
        const future = new Date(Date.now() + 1000);
        fs.utimesSync(taskFile, future, future);

        ensureFresh(handle!.db as Parameters<typeof ensureFresh>[0], cwd, 'demo');
        const after = (
          handle!.db as {
            prepare(s: string): { get(...a: unknown[]): unknown };
          }
        )
          .prepare('SELECT completed_acceptance, total_acceptance FROM tasks WHERE task_slug = ?')
          .get('bar') as { completed_acceptance: number; total_acceptance: number };
        expect(after).toEqual({ completed_acceptance: 1, total_acceptance: 2 });
      } finally {
        handle!.close();
      }
    });
  });
});
