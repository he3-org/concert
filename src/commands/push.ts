import { readState } from "../lib/state.js";
import {
  isGitRepo,
  getCurrentBranch,
  hasUpstream,
  pushToOrigin,
  hasUncommittedChanges,
  stageFiles,
  commit,
  isAheadOfRemote,
  getStagedFiles,
} from "../lib/git.js";
import * as fs from "node:fs";
import * as path from "node:path";

const STATE_FILE = "docs/concert/state.json";

/**
 * Run the concert push command.
 * Returns exit code: 0 (success), 1 (error)
 */
export async function runPush(cwd: string): Promise<number> {
  // Verify it's a git repo
  if (!isGitRepo(cwd)) {
    process.stderr.write(`Error: not a git repository
  Concert push requires a git repository.
`);
    return 1;
  }

  // Read state
  const state = readState(cwd);
  if (!state || !state.branch) {
    process.stderr.write(`Error: no branch to push
  state.json has no branch recorded. Start a mission first.

  Fix:
    /concert:init
`);
    return 1;
  }

  const branch = getCurrentBranch(cwd);

  // Stage state.json if it has changes
  const statePath = path.join(cwd, STATE_FILE);
  if (fs.existsSync(statePath)) {
    try {
      stageFiles(cwd, [STATE_FILE]);
    } catch {
      // Ignore staging errors (file might not be tracked yet)
    }
  }

  // Check if there are staged changes to commit
  const staged = getStagedFiles(cwd);
  if (staged.length > 0) {
    commit(cwd, "chore: concert-push handoff");
  }

  // Determine if there's anything to push
  const hasUpstreamBranch = hasUpstream(cwd);
  const aheadOfRemote = hasUpstreamBranch ? isAheadOfRemote(cwd) : true;

  if (!aheadOfRemote && hasUpstreamBranch) {
    const effectiveBranch = branch ?? state.branch;
    process.stdout.write(`Already up to date with origin/${effectiveBranch}

  No uncommitted changes. Branch is current with origin.

  Next steps:
    1. Continue work:
       Claude Code:  /concert:continue
       GitHub UI:    Run concert-continue agent
`);
    return 0;
  }

  // Push to origin
  try {
    pushToOrigin(cwd);
  } catch (err) {
    process.stderr.write(`Error: push failed
  ${err instanceof Error ? err.message : String(err)}
`);
    return 1;
  }

  const effectiveBranch = branch ?? state.branch;

  // Build output
  let output = `Pushed to origin/${effectiveBranch}\n\n`;
  output += `  Branch:   ${effectiveBranch}\n`;

  if (state.quality_loop_state) {
    const qls = state.quality_loop_state;
    output += `  State:    quality_loop_state saved (${qls.phase}, iteration ${qls.iteration})\n`;
  }

  output += `\n  Next steps:\n`;
  output += `    1. Continue in GitHub Agents UI:\n`;
  output += `       Agent:  concert-continue\n`;
  output += `       Model:  sonnet (matches current task tier)\n`;

  if (state.quality_loop_state) {
    const qls = state.quality_loop_state;
    output += `       The agent will resume from ${qls.phase} iteration ${qls.iteration} of ${qls.task_file}\n`;
  }

  process.stdout.write(output);
  return 0;
}
