/**
 * Derived task status. Centralised so `list_tasks`, `render_plan`, and any
 * future consumer agree on the rule.
 *
 * Note on `total === 0`: a task with zero acceptance criteria represents an
 * incomplete plan (the planner template requires at least one criterion), so
 * we surface it as `pending` rather than `done`. Treating it as `done` would
 * silently mark unspecified work as complete in the plan tables.
 */
export type TaskStatus = 'pending' | 'in-progress' | 'done';

export function deriveTaskStatus(total: number, completed: number): TaskStatus {
  if (total === 0) return 'pending';
  if (completed === 0) return 'pending';
  if (completed >= total) return 'done';
  return 'in-progress';
}
