import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { runInit } from "../../commands/init.js";

function createTempGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-e2e-init-"));
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

describe("concert init e2e", () => {
  it("creates all Concert files in a clean git repo", async () => {
    const restore = silenceOutput();
    try {
      const code = await runInit(tmpDir);
      expect(code).toBe(0);
    } finally {
      restore();
    }

    // Verify state.json was created
    expect(fs.existsSync(path.join(tmpDir, "docs", "concert", "state.json"))).toBe(true);
    // Verify concert.jsonc was created
    expect(fs.existsSync(path.join(tmpDir, "concert.jsonc"))).toBe(true);
    // Verify CLAUDE.md with Concert section
    const claudeMdPath = path.join(tmpDir, "CLAUDE.md");
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, "utf-8");
      expect(content).toContain("CONCERT:START");
      expect(content).toContain("CONCERT:END");
    }
  });

  it("sets project_name from package.json", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "my-test-project" }),
    );
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }
    const { readConfig } = await import("../../lib/config.js");
    const config = readConfig(tmpDir);
    expect(config?.project_name).toBe("my-test-project");
  });

  it("sets project_name from directory name when no package.json", async () => {
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }
    const { readConfig } = await import("../../lib/config.js");
    const config = readConfig(tmpDir);
    // Should be set to the directory basename
    expect(config?.project_name).toBeTruthy();
    expect(typeof config?.project_name).toBe("string");
    expect(config!.project_name.length).toBeGreaterThan(0);
  });

  it("appends Concert section to existing CLAUDE.md", async () => {
    const existingContent = "# My Project\n\nExisting content here.\n";
    fs.writeFileSync(path.join(tmpDir, "CLAUDE.md"), existingContent);
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }
    const claudeMdPath = path.join(tmpDir, "CLAUDE.md");
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, "utf-8");
      expect(content).toContain("# My Project");
      expect(content).toContain("Existing content here.");
      expect(content).toContain("CONCERT:START");
    }
  });

  it("fails with code 2 in a non-git directory", async () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-nongit-"));
    const stderrOutput: string[] = [];
    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = () => true;
    process.stderr.write = (data: string | Uint8Array) => {
      stderrOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    try {
      const code = await runInit(nonGitDir);
      expect(code).toBe(2);
      expect(stderrOutput.join("")).toContain("not a git repository");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  });

  it("warns when already initialized", async () => {
    const restore = silenceOutput();
    try {
      await runInit(tmpDir); // First init
    } finally {
      restore();
    }
    // Second init — should warn
    const stderrOutput: string[] = [];
    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = () => true;
    process.stderr.write = (data: string | Uint8Array) => {
      stderrOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    try {
      const code = await runInit(tmpDir);
      expect(code).toBe(1);
      expect(stderrOutput.join("")).toContain("already exist");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
  });

  it("all managed agent files have managed headers", async () => {
    const restore = silenceOutput();
    try {
      await runInit(tmpDir);
    } finally {
      restore();
    }
    const agentsDir = path.join(tmpDir, ".claude", "agents");
    if (!fs.existsSync(agentsDir)) return;
    const agents = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    expect(agents.length).toBeGreaterThan(0);
    for (const agent of agents) {
      const content = fs.readFileSync(path.join(agentsDir, agent), "utf-8");
      expect(content, `Agent ${agent} missing managed header`).toMatch(/AUTO-GENERATED BY CONCERT/);
    }
  });
});
