import * as fs from "node:fs";
import * as path from "node:path";
import type { ConcertState, HistoryEntry } from "../types.js";

const STATE_PATH = "docs/concert/state.json";

/**
 * Resolve the absolute path to state.json from the given working directory.
 */
export function resolveStatePath(cwd: string): string {
  return path.resolve(cwd, STATE_PATH);
}

/**
 * Read state.json from disk. Returns null if the file does not exist.
 * Missing fields are filled with defaults for forward compatibility.
 */
export function readState(cwd: string): ConcertState | null {
  const statePath = resolveStatePath(cwd);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  const raw = fs.readFileSync(statePath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return applyStateDefaults(parsed);
}

/**
 * Write state.json to disk. Writes atomically (write to temp, rename).
 */
export function writeState(cwd: string, state: ConcertState): void {
  const statePath = resolveStatePath(cwd);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content = JSON.stringify(state, null, 2) + "\n";
  const tmpPath = statePath + ".tmp";
  fs.writeFileSync(tmpPath, content, "utf-8");
  fs.renameSync(tmpPath, statePath);
}

/**
 * Add a history entry to state.
 */
export function addHistoryEntry(
  state: ConcertState,
  action: string,
  details: string,
): void {
  const entry: HistoryEntry = {
    action,
    timestamp: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),
    details,
  };
  state.history.push(entry);
}

/**
 * Apply default values for any missing fields (forward compatibility).
 */
function applyStateDefaults(parsed: Record<string, unknown>): ConcertState {
  const costParsed = (parsed.cost as Record<string, unknown> | undefined) ?? {};
  const merged = {
    mission: "",
    mission_path: "",
    workflow: "",
    workflow_path: "",
    branch: "",
    pr_number: 0,
    status_display: "wip_pr",
    feature_size: "",
    stage: "",
    pipeline: {},
    phases_completed: 0,
    phases_total: 0,
    tasks_completed: 0,
    tasks_total: 0,
    commits: 0,
    blockers: [],
    telemetry: [],
    failure_log: [],
    history: [],
    next_steps: [],
    ...parsed,
    cost: {
      estimated_remaining: "",
      spent_this_mission: "",
      by_stage: {},
      ...costParsed,
    },
  };
  return merged as ConcertState;
}
