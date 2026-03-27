---
task: "push-e2e"
title: "End-to-end tests for concert push command"
depends_on: ["template-validation", "cmd-push"]
wave: 2
model: haiku
---

## Objective

Write end-to-end tests for the `concert push` command. These tests verify the push command's behavior: committing uncommitted state changes, handling quality_loop_state, and outputting correct handoff instructions. Git push to a remote is tested with a local bare repo.

## Files

- `src/__tests__/e2e/push.e2e.test.ts`

## Requirements

- FR-038: Cross-Environment Handoff via concert-push
- UX Section 3.4: concert push output design

## Detailed Instructions

### src/__tests__/e2e/push.e2e.test.ts

**Test setup:**
Create a temporary directory with:
1. A bare git repo (acts as "origin")
2. A working repo cloned from the bare repo
3. Run `concert init` in the working repo
4. Commit initial files

```typescript
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";

function createTempRepoWithRemote(): { workDir: string; bareDir: string; cleanup: () => void } {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-push-e2e-"));
  const bareDir = path.join(baseDir, "origin.git");
  const workDir = path.join(baseDir, "work");

  // Create bare repo (acts as origin)
  execSync(`git init --bare ${bareDir}`);

  // Clone it as work repo
  execSync(`git clone ${bareDir} ${workDir}`);

  // Set up git config in work repo
  execSync('git config user.email "test@test.com"', { cwd: workDir });
  execSync('git config user.name "Test User"', { cwd: workDir });

  // Create initial commit
  fs.writeFileSync(path.join(workDir, "README.md"), "# Test");
  execSync("git add -A && git commit -m 'init'", { cwd: workDir });
  execSync("git push", { cwd: workDir });

  return {
    workDir,
    bareDir,
    cleanup: () => fs.rmSync(baseDir, { recursive: true, force: true }),
  };
}
```

**Tests to write:**

1. **Push with uncommitted state.json changes:**
   - Set up repo, run init, make initial commit
   - Modify state.json (add a history entry)
   - Run push command
   - Verify state.json changes are committed
   - Verify branch was pushed to origin (check bare repo has the commit)

2. **Push with no changes (already up to date):**
   - Set up repo, commit everything, push everything
   - Run push command
   - Verify output contains "Already up to date" or similar
   - Verify exit code is 0

3. **Push with quality_loop_state:**
   - Set up repo, modify state.json to include a `quality_loop_state` object:
     ```json
     {
       "quality_loop_state": {
         "task_file": "TASK-test-sonnet.md",
         "task_index": 1,
         "iteration": 2,
         "phase": "reviewer",
         "prior_findings": [],
         "coder_commits": ["abc1234"]
       }
     }
     ```
   - Run push command
   - Verify output mentions the quality loop state (reviewer, iteration 2)
   - Verify the commit was pushed

4. **Push output includes next steps:**
   - Run push with some changes
   - Verify output contains "Next steps" section
   - Verify output mentions "concert-continue" for resumption

5. **Push fails without git repo:**
   - Create a temp directory (no git)
   - Run push command
   - Verify non-zero exit code
   - Verify error message

## Acceptance Criteria

- [ ] Test covers push with uncommitted state changes
- [ ] Test covers push when already up to date
- [ ] Test covers push with quality_loop_state
- [ ] Test covers push output format (next steps)
- [ ] Test covers push failure without git repo
- [ ] All tests use temporary directories with real git repos and remotes
- [ ] All tests clean up temporary directories
- [ ] All tests pass with `npm test`
- [ ] `npm run typecheck` passes

## Skills

- docs/concert/skills/typescript-standards/SKILL.md
