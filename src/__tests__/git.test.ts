import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import {
  isGitRepo,
  getCurrentBranch,
  hasUncommittedChanges,
  stageFiles,
  commit,
  getStagedFiles,
} from "../lib/git.js";

let tmpDir: string;

function initGitRepo(dir: string): void {
  execFileSync("git", ["init"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: dir });
  // Create initial commit
  fs.writeFileSync(path.join(dir, "README.md"), "# Test");
  execFileSync("git", ["add", "-A"], { cwd: dir });
  execFileSync("git", ["commit", "-m", "init"], { cwd: dir });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-git-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("isGitRepo", () => {
  it("returns true for a git directory", () => {
    initGitRepo(tmpDir);
    expect(isGitRepo(tmpDir)).toBe(true);
  });

  it("returns false for a non-git directory", () => {
    const nonGitDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "concert-nongit-"),
    );
    try {
      expect(isGitRepo(nonGitDir)).toBe(false);
    } finally {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  });
});

describe("getCurrentBranch", () => {
  it("returns the branch name", () => {
    initGitRepo(tmpDir);
    const branch = getCurrentBranch(tmpDir);
    expect(branch).not.toBeNull();
    // Default branch is typically "main" or "master"
    expect(typeof branch).toBe("string");
    expect((branch as string).length).toBeGreaterThan(0);
  });
});

describe("hasUncommittedChanges", () => {
  it("detects modified files", () => {
    initGitRepo(tmpDir);
    fs.writeFileSync(path.join(tmpDir, "new-file.txt"), "new content");
    expect(hasUncommittedChanges(tmpDir)).toBe(true);
  });

  it("returns false for clean tree", () => {
    initGitRepo(tmpDir);
    expect(hasUncommittedChanges(tmpDir)).toBe(false);
  });
});

describe("stageFiles and commit", () => {
  it("stages and commits files", () => {
    initGitRepo(tmpDir);
    const filePath = path.join(tmpDir, "test.txt");
    fs.writeFileSync(filePath, "test content");
    stageFiles(tmpDir, ["test.txt"]);
    const sha = commit(tmpDir, "test: add test file");
    expect(sha).toBeDefined();
    expect(sha.length).toBeGreaterThan(0);
    expect(hasUncommittedChanges(tmpDir)).toBe(false);
  });

  it("returns a short SHA after commit", () => {
    initGitRepo(tmpDir);
    const filePath = path.join(tmpDir, "another.txt");
    fs.writeFileSync(filePath, "another content");
    stageFiles(tmpDir, ["another.txt"]);
    const sha = commit(tmpDir, "test: another commit");
    // Short SHA is typically 7 characters
    expect(sha.length).toBeGreaterThanOrEqual(7);
    expect(sha).toMatch(/^[0-9a-f]+$/);
  });
});

describe("getStagedFiles", () => {
  it("lists staged files", () => {
    initGitRepo(tmpDir);
    fs.writeFileSync(path.join(tmpDir, "staged.txt"), "staged content");
    stageFiles(tmpDir, ["staged.txt"]);
    const staged = getStagedFiles(tmpDir);
    expect(staged).toContain("staged.txt");
  });

  it("returns empty array when nothing is staged", () => {
    initGitRepo(tmpDir);
    const staged = getStagedFiles(tmpDir);
    expect(staged).toEqual([]);
  });
});
