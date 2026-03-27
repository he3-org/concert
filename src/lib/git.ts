import { execFileSync } from "node:child_process";

/**
 * Check if the given directory is inside a git repository.
 */
export function isGitRepo(cwd: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
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
    const result = execFileSync("git", ["branch", "--show-current"], {
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
    execFileSync("git", ["rev-parse", "--abbrev-ref", "@{upstream}"], {
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
  execFileSync("git", ["add", "--", ...files], {
    cwd,
    stdio: "pipe",
  });
}

/**
 * Create a git commit with the given message.
 * Returns the commit SHA.
 */
export function commit(cwd: string, message: string): string {
  execFileSync("git", ["commit", "-m", message], {
    cwd,
    stdio: "pipe",
  });
  const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
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
    execFileSync("git", ["push"], { cwd, stdio: "pipe" });
  } else {
    execFileSync("git", ["push", "-u", "origin", branch], {
      cwd,
      stdio: "pipe",
    });
  }
}

/**
 * Check if there are uncommitted changes (staged or unstaged).
 */
export function hasUncommittedChanges(cwd: string): boolean {
  try {
    const status = execFileSync("git", ["status", "--porcelain"], {
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
    const result = execFileSync(
      "git",
      ["rev-list", "--count", "@{upstream}..HEAD"],
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
    const result = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    });
    return result.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Stage all tracked modified files.
 */
export function stageAll(cwd: string): void {
  execFileSync("git", ["add", "-u"], { cwd, stdio: "pipe" });
}
