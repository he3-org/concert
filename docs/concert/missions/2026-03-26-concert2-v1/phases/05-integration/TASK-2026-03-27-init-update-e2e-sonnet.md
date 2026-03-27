---
task: "init-update-e2e"
title: "End-to-end tests for concert init and concert update commands"
depends_on: ["template-validation", "cmd-init", "cmd-update"]
wave: 2
model: sonnet
---

## Objective

Write end-to-end tests that exercise the full `concert init` and `concert update` commands against a real temporary directory with a real git repo. These tests verify the complete flow: file copying, state creation, config creation, CLAUDE.md handling, managed file updates, and surgical config/state merging.

## Files

- `src/__tests__/e2e/init.e2e.test.ts`
- `src/__tests__/e2e/update.e2e.test.ts`

## Requirements

- FR-001: Repository Bootstrapping via npx
- FR-013: Update Mechanism
- FR-012: Managed File Headers
- UX Section 3.2: concert init output design
- UX Section 3.3: concert update output design

## Implementation

### Test Setup Utilities

Both test files need a helper that:
1. Creates a temporary directory
2. Initializes a git repo in it (`git init`, `git commit --allow-empty -m "init"`)
3. Returns the temp dir path
4. Cleans up after the test

```typescript
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";

function createTempGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "concert-e2e-"));
  execSync("git init", { cwd: dir });
  execSync("git commit --allow-empty -m 'init'", { cwd: dir });
  return dir;
}
```

### src/__tests__/e2e/init.e2e.test.ts

**Tests to write:**

1. **Full init in clean git repo:**
   - Run init command against temp git repo
   - Verify `docs/concert/agents/` contains all 14 agent files
   - Verify `docs/concert/workflows/` contains all 8 workflow files
   - Verify `docs/concert/skills/` contains all 3 skill directories with SKILL.md
   - Verify `.github/agents/` contains all 14 stub files
   - Verify `.github/workflows/` contains both CI and version-check files
   - Verify `.claude/commands/` contains all 13 command files
   - Verify `docs/concert/state.json` exists and is valid JSON with correct defaults
   - Verify `concert.jsonc` exists and is valid JSONC
   - Verify `CLAUDE.md` exists and contains Concert section markers

2. **Init sets project_name from package.json:**
   - Create a package.json with `{ "name": "test-project" }` in the temp repo
   - Run init
   - Verify concert.jsonc has `"project_name": "test-project"`

3. **Init sets project_name from directory name when no package.json:**
   - Run init in a temp repo with no package.json
   - Verify concert.jsonc has `"project_name"` set to the directory basename

4. **Init appends to existing CLAUDE.md:**
   - Create a CLAUDE.md with some content in the temp repo
   - Run init
   - Verify CLAUDE.md contains both the original content AND the Concert section
   - Verify Concert section markers are present

5. **Init fails in non-git directory:**
   - Create a temp directory (no git init)
   - Run init, capture exit code
   - Verify exit code is 2
   - Verify stderr contains "not a git repository"

6. **Init warns when already initialized:**
   - Run init once (success)
   - Run init again
   - Verify exit code is 1
   - Verify stderr contains "already exist"

7. **All managed files have managed headers:**
   - After successful init, read all files in agents/, workflows/, skills/, .github/agents/, .github/workflows/
   - Verify each starts with the appropriate managed header (markdown comment or YAML comment)

### src/__tests__/e2e/update.e2e.test.ts

**Tests to write:**

1. **Update overwrites managed files:**
   - Run init, then modify a managed file's content (but keep the header)
   - Run update
   - Verify the managed file is restored to the template version

2. **Update preserves user values in concert.jsonc:**
   - Run init
   - Modify concert.jsonc: change `"project_name"` to `"my-custom-name"`
   - Run update
   - Verify `"project_name"` is still `"my-custom-name"`

3. **Update preserves user state in state.json:**
   - Run init
   - Modify state.json: add a mission name and some history entries
   - Run update
   - Verify mission name and history are preserved

4. **Update skips files that are already current version:**
   - Run init
   - Run update immediately (no version change)
   - Verify output indicates files are already current

5. **Update fails if not initialized:**
   - Create a temp git repo (no init)
   - Run update
   - Verify exit code is non-zero
   - Verify error message indicates Concert is not installed

6. **Update output format matches UX spec:**
   - Run init, then update
   - Verify output contains expected sections (header, managed files, config, state, next steps)

## Acceptance Criteria

- [ ] Init e2e tests cover: clean init, project_name from package.json, project_name from directory, CLAUDE.md append, non-git failure, already-initialized warning, managed headers
- [ ] Update e2e tests cover: managed file overwrite, user config preservation, user state preservation, already-current skip, not-initialized failure, output format
- [ ] All e2e tests use temporary directories with real git repos
- [ ] All e2e tests clean up temporary directories
- [ ] All tests pass with `npm test`
- [ ] `npm run typecheck` passes

## Skills

- docs/concert/skills/typescript-standards/SKILL.md
