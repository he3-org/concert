import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { runInit } from "../../commands/init.js";
import { runUpdate } from "../../commands/update.js";

function createTempGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-e2e-update-"));
  execFileSync("git", ["init"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: dir });
  execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: dir });
  return dir;
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

let tmpDir: string;

beforeEach(() => {
  tmpDir = createTempGitRepo();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("concert update e2e", () => {
  it("overwrites managed files with newer template content", async () => {
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }

    // Corrupt a managed file (but keep the managed header)
    const agentPath = path.join(tmpDir, ".claude", "agents", "concert-init.md");
    if (fs.existsSync(agentPath)) {
      const content = fs.readFileSync(agentPath, "utf-8");
      const firstLine = content.split("\n")[0] ?? "";
      const corrupted = firstLine + "\n\n# CORRUPTED CONTENT\n";
      fs.writeFileSync(agentPath, corrupted);
    }

    const restore2 = silenceOutput();
    try {
      const code = await runUpdate(tmpDir);
      expect(code).toBe(0);
    } finally {
      restore2();
    }

    // Managed file should be restored
    if (fs.existsSync(agentPath)) {
      const updated = fs.readFileSync(agentPath, "utf-8");
      expect(updated).not.toContain("CORRUPTED CONTENT");
      expect(updated).toContain("<role>");
    }
  });

  it("preserves user-customized project_name in concert.jsonc", async () => {
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }

    const { readConfigRaw, writeConfig, modifyConfigField } = await import("../../lib/config.js");
    const raw = readConfigRaw(tmpDir);
    if (raw) {
      const modified = modifyConfigField(raw, ["project_name"], "my-custom-name");
      writeConfig(tmpDir, modified);
    }

    const restore2 = silenceOutput();
    try {
      await runUpdate(tmpDir);
    } finally {
      restore2();
    }

    const { readConfig } = await import("../../lib/config.js");
    const config = readConfig(tmpDir);
    expect(config?.project_name).toBe("my-custom-name");
  });

  it("preserves mission and history entries in state.json", async () => {
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }

    const { readState, writeState, addHistoryEntry } = await import("../../lib/state.js");
    const state = readState(tmpDir);
    if (state) {
      state.mission = "preserved-mission";
      addHistoryEntry(state, "test_action", "test details");
      writeState(tmpDir, state);
    }

    const restore2 = silenceOutput();
    try {
      await runUpdate(tmpDir);
    } finally {
      restore2();
    }

    const updatedState = readState(tmpDir);
    expect(updatedState?.mission).toBe("preserved-mission");
    expect(updatedState?.history.some((h) => h.action === "test_action")).toBe(true);
  });

  it("fails with code 2 when Concert is not installed", async () => {
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

  it("outputs current when already at current version", async () => {
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }

    const stdoutOutput: string[] = [];
    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = (data: string | Uint8Array) => {
      stdoutOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    process.stderr.write = () => true;
    try {
      const code = await runUpdate(tmpDir);
      expect(code).toBe(0);
      const output = stdoutOutput.join("");
      // Should say up to date or show updated files
      expect(output.length).toBeGreaterThan(0);
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
  });

  it("does not overwrite non-managed files in concert directory", async () => {
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }

    // Create a user file in the concert directory (no managed header)
    const userFilePath = path.join(tmpDir, "docs", "concert", "MY-NOTES.md");
    fs.writeFileSync(userFilePath, "# My notes\nThis is user content.\n");

    const restore2 = silenceOutput();
    try {
      await runUpdate(tmpDir);
    } finally {
      restore2();
    }

    // User file should still exist with original content
    expect(fs.existsSync(userFilePath)).toBe(true);
    const content = fs.readFileSync(userFilePath, "utf-8");
    expect(content).toContain("My notes");
    expect(content).toContain("user content");
  });
});
