---
task: "state-helpers"
title: "Implement state.json read/write helpers"
depends_on: ["types", "default-state-and-config"]
wave: 1
model: haiku
---

## Objective

Create helper functions for reading and writing `state.json`. These functions handle file I/O, JSON parsing, default values for missing fields, and atomic write-then-commit patterns.

## Files

- `src/lib/state.ts`
- `src/__tests__/state.test.ts`

## Requirements

- DR-001: concert-state.json Schema
- NFR-003: Crash Safety

## Detailed Instructions

### src/lib/state.ts

```typescript
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
  const parsed = JSON.parse(raw);
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
    timestamp: new Date().toISOString().split("T")[0],
    details,
  };
  state.history.push(entry);
}

/**
 * Apply default values for any missing fields (forward compatibility).
 */
function applyStateDefaults(parsed: Record<string, unknown>): ConcertState {
  return {
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
    cost: {
      estimated_remaining: "",
      spent_this_mission: "",
      by_stage: {},
    },
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
      ...(parsed.cost as Record<string, unknown> ?? {}),
    },
  } as ConcertState;
}
```

### Key behaviors

- `readState` returns `null` if file doesn't exist (not an error)
- `writeState` uses temp file + rename for atomicity
- `applyStateDefaults` merges defaults with parsed data for forward compatibility
- All paths are resolved from the provided `cwd`

## Tests

Write tests in `src/__tests__/state.test.ts`:

1. `readState` returns null for non-existent file
2. `readState` correctly parses a valid state.json
3. `readState` fills missing fields with defaults
4. `writeState` creates the file with correct JSON content
5. `writeState` creates parent directories if needed
6. `addHistoryEntry` appends to the history array
7. Round-trip: write then read produces identical state

Use a temporary directory (`os.tmpdir()`) for test files.

## Acceptance Criteria

- [ ] `readState` returns null when state.json doesn't exist
- [ ] `readState` applies defaults for missing fields
- [ ] `writeState` produces valid, formatted JSON
- [ ] `writeState` uses atomic write (temp + rename)
- [ ] `addHistoryEntry` creates correct entry format
- [ ] All tests pass
- [ ] `npm run typecheck` passes
