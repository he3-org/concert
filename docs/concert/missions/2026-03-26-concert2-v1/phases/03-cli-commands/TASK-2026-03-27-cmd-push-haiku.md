---
task: "cmd-push"
title: "Implement the concert push CLI command"
depends_on: ["git-helpers", "state-helpers"]
wave: 1
model: haiku
---

## Objective

Implement the `concert push` CLI command that commits state changes and pushes the current branch to origin. This is a pure git operation — no LLM interaction. Critical for cross-environment handoff when plan usage is exhausted.

## Files

- `src/commands/push.ts`
- `src/__tests__/commands/push.test.ts`

## Requirements

- FR-038: Cross-Environment Handoff via concert-push
- Architecture Section 4: concert push design
- Architecture Section 10: Cross-Environment Handoff
- UX Section 3.4: concert push output design

## Detailed Instructions

### src/commands/push.ts

The push command must:

1. Read `state.json` to get branch name and quality_loop_state.
2. If no branch is recorded, print error and exit with code 1.
3. Stage `docs/concert/state.json` if it has changes.
4. Stage any other unstaged tracked files that are modified.
5. If there are staged changes, commit with message: `"chore: concert-push handoff"`.
6. Push current branch to origin (using `-u` if no upstream set).
7. Print structured output following UX spec format.

### Output Format (from UX spec)

Success:
```
Pushed to origin/<branch-name>

  Branch:   <branch-name>
  Commits:  N new commit(s) pushed
  State:    quality_loop_state saved (reviewer, iteration 2)

  Next steps:
    1. Continue in GitHub Agents UI:
       Agent:  concert-continue
       Model:  sonnet (matches current task tier)
       The agent will resume from reviewer iteration 2 of TASK-...
```

Nothing to push:
```
Already up to date with origin/<branch-name>

  No uncommitted changes. Branch is current with origin.

  Next steps:
    1. Continue work:
       Claude Code:  /concert:continue
       GitHub UI:    Run concert-continue agent
```

Error (no branch):
```
Error: no branch to push
  state.json has no branch recorded. Start a mission first.

  Fix:
    /concert:init
```

### Key behaviors

- NEVER performs force push
- NEVER performs destructive operations
- Commits only if there are staged changes
- Works without an active LLM session
- Exit codes: 0 (success), 1 (error), 2 (usage error)
- Errors to stderr, success to stdout

### Quality loop state display

If `quality_loop_state` exists in state.json, include it in the output:
```
State:    quality_loop_state saved (<phase>, iteration <N>)
```

And in next steps, include the specific task file and resume point.

## Tests

1. Push succeeds with uncommitted state changes
2. Push reports "already up to date" when nothing to push
3. Push fails with error when no branch in state.json
4. Push commits with correct message "chore: concert-push handoff"
5. Push includes quality_loop_state info in output when present
6. Push never calls force push

## Acceptance Criteria

- [ ] Push commits uncommitted state changes
- [ ] Push pushes current branch to origin
- [ ] Push reports quality_loop_state when present
- [ ] Push is safe (no force push, no destructive operations)
- [ ] Push works without LLM session
- [ ] Output matches UX spec format
- [ ] Exit codes are correct
- [ ] Errors go to stderr
- [ ] All tests pass
- [ ] `npm run typecheck` passes
