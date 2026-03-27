import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { runUpdate } from "../../commands/update.js";
import { runInit } from "../../commands/init.js";

let tmpDir: string;

function initGitRepo(dir: string): void {
  execFileSync("git", ["init"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: dir });
  execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: dir });
}

function silenceOutput(): () => void {
  const origStdout = process.stdout.write.bind(process.stdout);
  const origStderr = process.stderr.write.bind(process.stderr);
  process.stdout.write = () => true;
  process.stderr.write = () => true;
  return () => {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-update-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("runUpdate", () => {
  it("fails with code 2 when not initialized", async () => {
    initGitRepo(tmpDir);
    const stderrOutput: string[] = [];
    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = () => true;
    process.stderr.write = (data: string | Uint8Array) => {
      stderrOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    try {
      const code = await runUpdate(tmpDir);
      expect(code).toBe(2);
      expect(stderrOutput.join("")).toContain("not installed");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
  });

  it("succeeds after init", async () => {
    initGitRepo(tmpDir);
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
      const code = await runUpdate(tmpDir);
      expect(code).toBe(0);
    } finally {
      restore();
    }
  });

  it("preserves user values in concert.jsonc", async () => {
    initGitRepo(tmpDir);
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
      // Modify project_name
      const { readConfigRaw, writeConfig } = await import("../../lib/config.js");
      const { modifyConfigField } = await import("../../lib/config.js");
      const raw = readConfigRaw(tmpDir);
      if (raw) {
        const modified = modifyConfigField(raw, ["project_name"], "my-custom-name");
        writeConfig(tmpDir, modified);
      }
      await runUpdate(tmpDir);
      const { readConfig } = await import("../../lib/config.js");
      const config = readConfig(tmpDir);
      expect(config?.project_name).toBe("my-custom-name");
    } finally {
      restore();
    }
  });

  it("preserves existing state data", async () => {
    initGitRepo(tmpDir);
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
      // Add a history entry to state
      const { readState, writeState, addHistoryEntry } = await import("../../lib/state.js");
      const state = readState(tmpDir);
      if (state) {
        state.mission = "test-mission";
        addHistoryEntry(state, "test_action", "test details");
        writeState(tmpDir, state);
      }
      await runUpdate(tmpDir);
      const updatedState = readState(tmpDir);
      expect(updatedState?.mission).toBe("test-mission");
      expect(
        updatedState?.history.some((h) => h.action === "test_action"),
      ).toBe(true);
    } finally {
      restore();
    }
  });
});
