# Vision: CLI `commit` Command

## Problem Statement

Concert's current CLI provides `push` — which bundles staging, committing, and pushing to origin into one operation — but offers no way to create a checkpoint commit without immediately pushing to a remote. Agents executing long Concert workflows often need to commit their progress incrementally (e.g., after each task or phase) without triggering a push. Without a dedicated `commit` command, agents must either rely on the `push` command (too aggressive — it exposes unfinished work to remote) or leave changes uncommitted until the end of a mission phase (risky — uncommitted state is lost if the agent session is interrupted or times out).

This gap also means there is no first-class way for a developer or an agent to snapshot work-in-progress locally, update `state.json` to reflect the checkpoint, and continue working — all without pushing.

## What We're Building

A new `concert commit` CLI command that stages relevant changes and creates a local git commit without pushing to remote. The command is lightweight, fast, and produces a well-formed commit message that reflects the current Concert state (mission name, stage, progress). It integrates with the existing state model to track commit count and log the action to mission history.

### Core Capabilities

- Stages all changes relevant to the current Concert mission (mission files, state.json, and any agent-modified files)
- Creates a local git commit with a standardized Concert commit message derived from current state (mission, stage, iteration)
- Accepts an optional custom commit message to override the generated one
- Increments the `commits` counter in `state.json` and appends an entry to `history`
- Writes updated `state.json` as part of the same commit (state reflects the commit it was stored in)
- Reports clearly what was committed (files staged, commit SHA, message used)
- Exits with a non-zero code and a helpful error message if there is nothing to commit, if not in a git repo, or if no Concert state exists

## Target Users

**Primary:** Concert agents (concert-worker, concert-coder, concert-reviewer, and similar) executing workflow steps that need to checkpoint progress locally before a full push.

**Secondary:** The developer running Concert interactively from the CLI, who wants to commit a single Concert mission checkpoint without pushing — for example, after manually editing a mission document or resolving a blocker.

Both users expect the command to be silent-on-success (minimal output unless something is noteworthy) and to fail loudly with actionable guidance when something goes wrong.

## User Experience Goals

- **Fast** — completes in under a second for typical mission file sets; no unnecessary git operations
- **Predictable** — the commit message format is consistent and machine-readable so that history is scannable
- **Non-destructive** — never touches remote; never modifies untracked files outside Concert's scope (assumed)
- **Self-documenting** — the commit message tells any reader (human or agent) exactly what Concert state was captured
- **Informative on failure** — error messages name the exact problem and the fix, matching the style of `init` and `push`

## Success Criteria

1. Running `concert commit` in a Concert-initialized repo with uncommitted changes produces a local git commit and exits 0
2. Running `concert commit` with no staged or unstaged changes exits non-zero with a clear "nothing to commit" message
3. Running `concert commit` outside a git repo exits non-zero with a "not a git repository" error
4. Running `concert commit` with `--message "custom msg"` uses the provided message instead of the generated one
5. After `concert commit`, `state.json` reflects an incremented `commits` counter and a new history entry — and both are included in the commit
6. The output format is consistent with `push`: one headline line, key/value detail lines, and a "Next steps" block

## Scope

### In Scope

- New `commit` TypeScript command module at `src/commands/commit.ts`
- Registration in `src/cli.ts` (switch case + help text)
- Staged commit of all Concert-managed changes: `state.json`, `.concert/missions/` files, and all git-tracked modified files (assumed: `git add -u` scope)
- Optional `--message` / `-m` flag to override the generated commit message
- State update: increment `commits`, append to `history`, include updated `state.json` in the commit
- Error cases: not a git repo, no Concert state, nothing to commit
- Tests covering the happy path and all error cases

### Out of Scope

- Pushing to remote (that remains `concert push`)
- Creating a branch or PR (not this command's responsibility)
- Staging untracked files outside the Concert directory (agents manage their own tracked files)
- Interactive commit message editing (no TTY interaction)
- Amending previous commits

## Constraints and Assumptions

### Constraints

- Must use only git operations already present in `src/lib/git.ts` or additions to that file that do not require new npm dependencies
- Commit message format must be consistent with the existing `chore: concert-push handoff` pattern used in `push.ts`
- The command must be registered in the `cli.ts` switch block and the help text, matching existing style exactly
- No new runtime npm dependencies — only Node.js built-ins and the existing codebase

### Assumptions

- (assumed) "All changes relevant to the mission" means all git-tracked modified files (`git add -u`) plus any untracked files in `.concert/missions/` for the current mission
- (assumed) The generated commit message format will be: `chore: concert-commit [<mission>] <stage> (<commits+1>)` — this is informed by the existing `chore: concert-push handoff` pattern
- (assumed) If `state.json` does not contain a `mission` or `stage`, the command still succeeds but uses a generic message like `chore: concert-commit`
- (assumed) The `--message` / `-m` flag is the only supported CLI flag beyond `--help`
- (assumed) `concert commit` is intended to be called by agents mid-workflow, so it does not require user confirmation

## Risks

- **State/commit ordering race:** Writing `state.json` (with incremented commit count) before staging and committing it requires careful sequencing. If the commit fails after state is written to disk, `state.json` will show a commit count that doesn't match git history. Mitigation: write updated state, stage everything, then commit — and roll back state on commit failure.
- **Overlap with `push`:** The `push` command already does a mini-commit (staging `state.json` and committing staged files). Adding `commit` creates two code paths that do similar things. These should share logic from `git.ts` rather than duplicating it, or `push` should be refactored to call `commit` internally after this is added.
- **Scope of staging:** Using `git add -u` stages all tracked modified files, which may include files an agent modified outside Concert's awareness. This is consistent with the intent (checkpoint all work) but should be clearly documented.

## Questions

- [ ] Should `concert commit` also stage untracked files in the working directory, or only tracked modified files? (`git add -u` vs `git add .`)
- [ ] Should the generated commit message include the current stage/phase from `state.json`, or just the mission name and a counter?
- [ ] Should `concert push` be refactored to internally call `concert commit` logic to eliminate duplication, or should they remain independent?
- [ ] Is there a need for a `--all` / `-a` flag to also stage untracked files (equivalent to `git add .`)?
- [ ] Should the command fail if `state.json` has no active mission, or succeed with a generic commit message?
