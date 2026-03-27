---
task: "git-helpers"
title: "Implement git operations (commit, push, branch detection)"
depends_on: ["types"]
wave: 1
model: haiku
---

## Objective

Create utility functions for git operations used by the CLI commands: checking if a directory is a git repo, committing files, pushing branches, and detecting the current branch.

## Files

- `src/lib/git.ts`
- `src/__tests__/git.test.ts`

## Requirements

- IR-003: Git Integration
- FR-038: Cross-Environment Handoff via concert-push
- NFR-004: Git Cleanliness

## Detailed Instructions

### src/lib/git.ts

```typescript
import { execSync } from "node:child_process";

/**
 * Check if the given directory is inside a git repository.
 */
export function isGitRepo(cwd: string): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current git branch name.
 * Returns null if not on a branch (detached HEAD).
 */
export function getCurrentBranch(cwd: string): string | null {
  try {
    const result = execSync("git branch --show-current", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    });
    const branch = result.trim();
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * Check if the current branch has an upstream remote.
 */
export function hasUpstream(cwd: string): boolean {
  try {
    execSync("git rev-parse --abbrev-ref @{upstream}", {
      cwd,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Stage specific files for commit.
 */
export function stageFiles(cwd: string, files: string[]): void {
  if (files.length === 0) return;
  execSync(`git add ${files.map((f) => `"${f}"`).join(" ")}`, {
    cwd,
    stdio: "pipe",
  });
}

/**
 * Create a git commit with the given message.
 * Returns the commit SHA.
 */
export function commit(cwd: string, message: string): string {
  execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
    cwd,
    stdio: "pipe",
  });
  const sha = execSync("git rev-parse --short HEAD", {
    cwd,
    stdio: "pipe",
    encoding: "utf-8",
  });
  return sha.trim();
}

/**
 * Push the current branch to origin.
 * Uses -u to set upstream if not already set.
 */
export function pushToOrigin(cwd: string): void {
  const branch = getCurrentBranch(cwd);
  if (!branch) {
    throw new Error("Not on a branch — cannot push");
  }
  const upstream = hasUpstream(cwd);
  if (upstream) {
    execSync("git push", { cwd, stdio: "pipe" });
  } else {
    execSync(`git push -u origin ${branch}`, { cwd, stdio: "pipe" });
  }
}

/**
 * Check if there are uncommitted changes (staged or unstaged).
 */
export function hasUncommittedChanges(cwd: string): boolean {
  try {
    const status = execSync("git status --porcelain", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if the local branch is ahead of the remote.
 */
export function isAheadOfRemote(cwd: string): boolean {
  try {
    const result = execSync(
      "git rev-list --count @{upstream}..HEAD",
      {
        cwd,
        stdio: "pipe",
        encoding: "utf-8",
      },
    );
    return parseInt(result.trim(), 10) > 0;
  } catch {
    return false;
  }
}

/**
 * Get list of staged file paths.
 */
export function getStagedFiles(cwd: string): string[] {
  try {
    const result = execSync("git diff --cached --name-only", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    });
    return result.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
```

### Key behaviors

- All functions accept `cwd` for testability (no reliance on process.cwd)
- All git commands use `stdio: "pipe"` to suppress output
- Errors in git commands are caught and return safe defaults
- No force push, no destructive operations (per security requirements)
- Commit message escaping handles double quotes

## Tests

Write tests in `src/__tests__/git.test.ts`:

1. `isGitRepo` returns true for a git directory
2. `isGitRepo` returns false for a non-git directory
3. `getCurrentBranch` returns the branch name
4. `hasUncommittedChanges` detects modified files
5. `hasUncommittedChanges` returns false for clean tree
6. `stageFiles` and `commit` produce a commit with the given message
7. `getStagedFiles` lists staged files

Create a temp git repo in the test setup for these tests.

## Acceptance Criteria

- [ ] `isGitRepo` correctly detects git repositories
- [ ] `getCurrentBranch` returns the branch name or null
- [ ] `commit` creates a commit and returns the short SHA
- [ ] `hasUncommittedChanges` correctly detects dirty state
- [ ] No function performs force push or destructive operations
- [ ] All tests pass
- [ ] `npm run typecheck` passes
