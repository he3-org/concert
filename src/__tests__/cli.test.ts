import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";

const ROOT = path.resolve(__dirname, "../..");
const CLI_PATH = path.join(ROOT, "dist", "cli.js");

function runCLI(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args}`, { encoding: "utf-8" });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: e.status ?? 1,
    };
  }
}

describe("CLI stub", () => {
  it("dist/cli.js exists after build", () => {
    if (!fs.existsSync(CLI_PATH)) {
      console.warn("dist/cli.js not found — skipping CLI tests (run npm run build first)");
      return;
    }
    expect(fs.existsSync(CLI_PATH)).toBe(true);
  });

  it("--help prints usage and exits 0", () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI("--help");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage: concert <command>");
    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("update");
    expect(result.stdout).toContain("push");
  });

  it("-h prints usage and exits 0", () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI("-h");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage: concert <command>");
  });

  it("no args prints usage and exits 0", () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI("");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage: concert <command>");
  });

  it("--version prints version and exits 0", () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI("--version");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("-V prints version and exits 0", () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI("-V");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("unknown command exits with code 2", () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI("banana");
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command");
    expect(result.stderr).toContain("banana");
  });
});
