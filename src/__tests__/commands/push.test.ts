import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { runPush } from "../../commands/push.js";

let tmpDir: string;

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-push-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("runPush", () => {
  it("fails with code 1 when no branch in state.json", async () => {
    execFileSync("git", ["init"], { cwd: tmpDir });
    execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: tmpDir });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: tmpDir });
    const stderrOutput: string[] = [];
    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = () => true;
    process.stderr.write = (data: string | Uint8Array) => {
      stderrOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    try {
      const code = await runPush(tmpDir);
      expect(code).toBe(1);
      expect(stderrOutput.join("")).toContain("no branch to push");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
  });

  it("fails with code 1 when not a git repo", async () => {
    const stderrOutput: string[] = [];
    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = () => true;
    process.stderr.write = (data: string | Uint8Array) => {
      stderrOutput.push(typeof data === "string" ? data : data.toString());
      return true;
    };
    try {
      const code = await runPush(tmpDir);
      expect(code).toBe(1);
      expect(stderrOutput.join("")).toContain("not a git repository");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
  });

  it("outputs quality_loop_state info when present", async () => {
    // Create a bare repo as origin
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-push-ql-"));
    const bareDir = path.join(baseDir, "origin.git");
    const workDir = path.join(baseDir, "work");
    try {
      execFileSync("git", ["init", "--bare", bareDir]);
      execFileSync("git", ["clone", bareDir, workDir]);
      execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: workDir });
      execFileSync("git", ["config", "user.name", "Test User"], { cwd: workDir });
      // Create initial commit
      fs.writeFileSync(path.join(workDir, "README.md"), "# Test");
      execFileSync("git", ["add", "-A"], { cwd: workDir });
      execFileSync("git", ["commit", "-m", "init"], { cwd: workDir });
      execFileSync("git", ["push"], { cwd: workDir });
      // Create state.json with branch and quality_loop_state
      const stateDir = path.join(workDir, "docs", "concert");
      fs.mkdirSync(stateDir, { recursive: true });
      const stateContent = JSON.stringify({
        mission: "test",
        branch: "main",
        quality_loop_state: {
          task_file: "TASK-test.md",
          task_index: 1,
          iteration: 2,
          phase: "reviewer",
          prior_findings: [],
          coder_commits: ["abc1234"],
        },
        blockers: [],
        telemetry: [],
        failure_log: [],
        history: [],
        next_steps: [],
      });
      fs.writeFileSync(path.join(stateDir, "state.json"), stateContent);
      const stdoutOutput: string[] = [];
      const origStdout = process.stdout.write.bind(process.stdout);
      const origStderr = process.stderr.write.bind(process.stderr);
      process.stdout.write = (data: string | Uint8Array) => {
        stdoutOutput.push(typeof data === "string" ? data : data.toString());
        return true;
      };
      process.stderr.write = () => true;
      try {
        await runPush(workDir);
        const output = stdoutOutput.join("");
        // Should mention quality loop state
        expect(output).toContain("quality_loop_state");
        expect(output).toContain("reviewer");
        expect(output).toContain("iteration 2");
      } finally {
        process.stdout.write = origStdout;
        process.stderr.write = origStderr;
      }
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
