import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { runPush } from "../../commands/push.js";

interface TempRepoWithRemote {
  workDir: string;
  bareDir: string;
  cleanup: () => void;
}

function createTempRepoWithRemote(): TempRepoWithRemote {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-push-e2e-"));
  const bareDir = path.join(baseDir, "origin.git");
  const workDir = path.join(baseDir, "work");

  execFileSync("git", ["init", "--bare", bareDir]);
  execFileSync("git", ["clone", bareDir, workDir]);
  execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: workDir });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: workDir });

  fs.writeFileSync(path.join(workDir, "README.md"), "# Test");
  execFileSync("git", ["add", "-A"], { cwd: workDir });
  execFileSync("git", ["commit", "-m", "init"], { cwd: workDir });
  execFileSync("git", ["push"], { cwd: workDir });

  return {
    workDir,
    bareDir,
    cleanup: () => fs.rmSync(baseDir, { recursive: true, force: true }),
  };
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

let tmpRepo: TempRepoWithRemote | null = null;

beforeEach(() => {
  tmpRepo = null;
});

afterEach(() => {
  tmpRepo?.cleanup();
  tmpRepo = null;
});

describe("concert push e2e", () => {
  it("fails with code 1 when no git repo", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-no-git-"));
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
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("outputs next steps after successful push", async () => {
    tmpRepo = createTempRepoWithRemote();
    const { workDir } = tmpRepo;

    // Create state.json with a branch
    const stateDir = path.join(workDir, "docs", "concert");
    fs.mkdirSync(stateDir, { recursive: true });
    const stateContent = JSON.stringify({
      mission: "test",
      branch: "main",
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
      const code = await runPush(workDir);
      expect(code).toBe(0);
      const output = stdoutOutput.join("");
      expect(output).toContain("Next steps");
      expect(output).toContain("concert-continue");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
  });

  it("includes quality_loop_state in output when present", async () => {
    tmpRepo = createTempRepoWithRemote();
    const { workDir } = tmpRepo;

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
      expect(output).toContain("quality_loop_state");
      expect(output).toContain("reviewer");
      expect(output).toContain("iteration 2");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
  });
});
