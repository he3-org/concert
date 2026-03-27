import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  readState,
  writeState,
  addHistoryEntry,
  resolveStatePath,
} from "../lib/state.js";
import type { ConcertState } from "../types.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-state-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeMinimalState(): ConcertState {
  return {
    mission: "test-mission",
    mission_path: "docs/concert/missions/test",
    workflow: "mission-full",
    workflow_path: "docs/concert/workflows/CONCERT-WORKFLOW-MISSION-FULL.md",
    branch: "concert/test",
    pr_number: 1,
    status_display: "wip_pr",
    feature_size: "medium",
    stage: "execution",
    pipeline: {},
    phases_completed: 0,
    phases_total: 5,
    tasks_completed: 0,
    tasks_total: 10,
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
  };
}

describe("readState", () => {
  it("returns null for non-existent file", () => {
    expect(readState(tmpDir)).toBeNull();
  });

  it("correctly parses a valid state.json", () => {
    const stateDir = path.join(tmpDir, "docs", "concert");
    fs.mkdirSync(stateDir, { recursive: true });
    const state = makeMinimalState();
    fs.writeFileSync(
      path.join(stateDir, "state.json"),
      JSON.stringify(state, null, 2),
    );
    const result = readState(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.mission).toBe("test-mission");
    expect(result?.branch).toBe("concert/test");
  });

  it("fills missing fields with defaults", () => {
    const stateDir = path.join(tmpDir, "docs", "concert");
    fs.mkdirSync(stateDir, { recursive: true });
    // Write partial state
    fs.writeFileSync(
      path.join(stateDir, "state.json"),
      JSON.stringify({ mission: "partial" }),
    );
    const result = readState(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.mission).toBe("partial");
    expect(result?.phases_completed).toBe(0);
    expect(result?.blockers).toEqual([]);
    expect(result?.telemetry).toEqual([]);
    expect(result?.history).toEqual([]);
    expect(result?.cost).toBeDefined();
    expect(result?.cost.by_stage).toEqual({});
  });
});

describe("writeState", () => {
  it("creates the file with correct JSON content", () => {
    const state = makeMinimalState();
    writeState(tmpDir, state);
    const statePath = resolveStatePath(tmpDir);
    expect(fs.existsSync(statePath)).toBe(true);
    const content = fs.readFileSync(statePath, "utf-8");
    const parsed = JSON.parse(content) as ConcertState;
    expect(parsed.mission).toBe("test-mission");
    expect(parsed.branch).toBe("concert/test");
  });

  it("creates parent directories if needed", () => {
    const state = makeMinimalState();
    const deepDir = path.join(tmpDir, "new-project");
    writeState(deepDir, state);
    const statePath = resolveStatePath(deepDir);
    expect(fs.existsSync(statePath)).toBe(true);
  });

  it("writes formatted JSON with trailing newline", () => {
    const state = makeMinimalState();
    writeState(tmpDir, state);
    const statePath = resolveStatePath(tmpDir);
    const content = fs.readFileSync(statePath, "utf-8");
    expect(content.endsWith("\n")).toBe(true);
    // Should be formatted with 2 spaces
    expect(content).toContain("  ");
  });
});

describe("addHistoryEntry", () => {
  it("appends to the history array", () => {
    const state = makeMinimalState();
    expect(state.history).toHaveLength(0);
    addHistoryEntry(state, "test_action", "test details");
    expect(state.history).toHaveLength(1);
    expect(state.history[0]?.action).toBe("test_action");
    expect(state.history[0]?.details).toBe("test details");
    expect(state.history[0]?.timestamp).toBeDefined();
  });

  it("creates entry with correct timestamp format", () => {
    const state = makeMinimalState();
    addHistoryEntry(state, "action", "details");
    const entry = state.history[0];
    expect(entry?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("can add multiple entries", () => {
    const state = makeMinimalState();
    addHistoryEntry(state, "first", "first details");
    addHistoryEntry(state, "second", "second details");
    expect(state.history).toHaveLength(2);
    expect(state.history[0]?.action).toBe("first");
    expect(state.history[1]?.action).toBe("second");
  });
});

describe("round-trip", () => {
  it("write then read produces identical state", () => {
    const state = makeMinimalState();
    state.mission = "round-trip-test";
    state.phases_completed = 3;
    state.commits = 7;
    writeState(tmpDir, state);
    const result = readState(tmpDir);
    expect(result?.mission).toBe("round-trip-test");
    expect(result?.phases_completed).toBe(3);
    expect(result?.commits).toBe(7);
  });
});
