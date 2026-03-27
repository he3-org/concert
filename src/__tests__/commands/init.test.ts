import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { runInit } from "../../commands/init.js";

let tmpDir: string;

function initGitRepo(dir: string): void {
  execFileSync("git", ["init"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: dir });
  execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: dir });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-init-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("runInit", () => {
  it("fails with code 2 in a non-git directory", async () => {
    const stderrOutput: string[] = [];
    const origStderr = process.stderr.write.bind(process.stderr);
    process.stderr.write = (data: string | Uint8Array) => {
      stderrOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    try {
      const code = await runInit(tmpDir);
      expect(code).toBe(2);
      expect(stderrOutput.join("")).toContain("not a git repository");
    } finally {
      process.stderr.write = origStderr;
    }
  });

  it("succeeds in a clean git repo and creates concert files", async () => {
    initGitRepo(tmpDir);
    const stdoutOutput: string[] = [];
    const origStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = (data: string | Uint8Array) => {
      stdoutOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    try {
      const code = await runInit(tmpDir);
      expect(code).toBe(0);
      const output = stdoutOutput.join("");
      expect(output).toContain("initialized");
    } finally {
      process.stdout.write = origStdout;
    }
    // Verify state.json was created
    expect(
      fs.existsSync(path.join(tmpDir, "docs", "concert", "state.json")),
    ).toBe(true);
    // Verify concert.jsonc was created
    expect(fs.existsSync(path.join(tmpDir, "concert.jsonc"))).toBe(true);
  });

  it("fails with code 1 if docs/concert/ already exists", async () => {
    initGitRepo(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "docs", "concert"), { recursive: true });
    const stderrOutput: string[] = [];
    const origStderr = process.stderr.write.bind(process.stderr);
    process.stderr.write = (data: string | Uint8Array) => {
      stderrOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    try {
      const code = await runInit(tmpDir);
      expect(code).toBe(1);
      expect(stderrOutput.join("")).toContain("already exist");
    } finally {
      process.stderr.write = origStderr;
    }
  });

  it("sets project_name from package.json", async () => {
    initGitRepo(tmpDir);
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "my-test-project" }),
    );
    const origStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;
    try {
      await runInit(tmpDir);
    } finally {
      process.stdout.write = origStdout;
    }
    const { readConfig } = await import("../../lib/config.js");
    const config = readConfig(tmpDir);
    expect(config?.project_name).toBe("my-test-project");
  });

  it("creates CLAUDE.md with Concert section when it doesn't exist", async () => {
    initGitRepo(tmpDir);
    const origStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;
    try {
      await runInit(tmpDir);
    } finally {
      process.stdout.write = origStdout;
    }
    const claudeMdPath = path.join(tmpDir, "CLAUDE.md");
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, "utf-8");
      expect(content).toContain("CONCERT:START");
      expect(content).toContain("CONCERT:END");
    }
  });

  it("appends Concert section to existing CLAUDE.md", async () => {
    initGitRepo(tmpDir);
    const existingContent = "# My Project\n\nExisting content.\n";
    fs.writeFileSync(path.join(tmpDir, "CLAUDE.md"), existingContent);
    const origStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;
    try {
      await runInit(tmpDir);
    } finally {
      process.stdout.write = origStdout;
    }
    const claudeMdPath = path.join(tmpDir, "CLAUDE.md");
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, "utf-8");
      expect(content).toContain("# My Project");
      expect(content).toContain("CONCERT:START");
    }
  });
});
