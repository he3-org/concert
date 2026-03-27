---
task: "cmd-init"
title: "Implement the concert init CLI command"
depends_on: ["copy-helpers", "state-helpers", "config-helpers", "git-helpers", "version-helpers"]
wave: 1
model: sonnet
---

## Objective

Implement the `concert init` CLI command that bootstraps a repository with all Concert files. This is a pure file operation — no LLM interaction.

## Files

- `src/commands/init.ts`
- `src/__tests__/commands/init.test.ts`

## Requirements

- FR-001: Repository Bootstrapping via npx
- FR-012: Managed File Headers
- FR-015: Actionable Next Steps on Every Output
- UX Section 3.2: concert init output design

## Implementation

### src/commands/init.ts

The init command must:

1. Verify cwd is a git repo (check for `.git/`). If not, print error to stderr and exit with code 2.
2. Check for existing Concert installation:
   - If `docs/concert/` exists, print warning showing existing files and suggest `concert update` instead. Exit with code 1.
3. Copy all files from `templates/` into the cwd recursively.
4. Set `project_name` in concert.jsonc from package.json name or directory name.
5. Handle CLAUDE.md: if it exists, append the Concert section. If not, create it with the Concert section.
6. Print structured success output following the UX spec format (header, body with created files, next steps).

### Output Format (from UX spec)

Success:
```
Concert initialized in /home/user/my-project

  Created:
    docs/concert/agents/          (N agent definitions)
    docs/concert/workflows/       (N workflow files)
    docs/concert/skills/          (N skill files)
    docs/concert/state.json       (empty state)
    .github/agents/               (N GitHub agent stubs)
    .github/workflows/            (N workflow files)
    .claude/commands/             (N skill commands)
    concert.jsonc                 (default configuration)
    CLAUDE.md                     (Concert section appended)

  Next steps:
    1. Review concert.jsonc and adjust configuration if needed
    2. Start a mission:
       Claude Code:  /concert:init
       CLI:          Run /concert:init in a Claude Code session
```

Error (not a git repo):
```
Error: not a git repository
  Concert requires a git repository. Initialize one first.

  Fix:
    git init && git commit --allow-empty -m "chore: initial commit"
    npx @he3-org/concert init
```

Error (already initialized):
```
Warning: Concert files already exist in this repository

  Existing files found:
    docs/concert/    (N agents, N workflows)
    concert.jsonc    (user configuration)

  Options:
    Update managed files:  npx @he3-org/concert update
    Abort:  no action needed
```

### CLAUDE.md Handling

The Concert section is delimited by markers:
```markdown
<!-- CONCERT:START -- DO NOT MODIFY THIS SECTION. It is managed by Concert and will be overwritten on `concert update`. -->
## Commands
- `/concert:init` -- Start a new mission
- `/concert:plan` -- Plan a stage
- `/concert:review` -- Review a stage
- `/concert:accept` -- Accept a stage
- `/concert:status` -- Check current status
- `/concert:continue` -- Continue work (start execution, resume mid-task, or advance to next stage)
- `/concert:debug` -- Debug an issue
- `/concert:verify` -- Verify work
<!-- CONCERT:END -- DO NOT MODIFY THIS SECTION -->
```

### Exit Codes

- 0: Success
- 1: Already initialized
- 2: Not a git repo or usage error

### Stderr vs Stdout

- Success output goes to stdout
- Error/Warning output goes to stderr

## Tests

1. Init succeeds in a clean git repo (creates all expected directories)
2. Init fails with code 2 in a non-git directory
3. Init fails with code 1 if `docs/concert/` already exists
4. Init sets project_name from package.json
5. Init sets project_name from directory name when no package.json
6. Init appends Concert section to existing CLAUDE.md
7. Init creates CLAUDE.md with Concert section when it doesn't exist
8. Output follows the expected format (check for key strings)

## Acceptance Criteria

- [ ] Init creates all template files in the correct locations
- [ ] Init detects and rejects non-git repos with correct error
- [ ] Init detects existing installation and warns
- [ ] Init sets project_name correctly
- [ ] Init handles CLAUDE.md correctly (append or create)
- [ ] Output matches UX spec format
- [ ] Exit codes are correct (0, 1, 2)
- [ ] Errors go to stderr, success to stdout
- [ ] All tests pass
- [ ] `npm run typecheck` passes

## Skills

- docs/concert/skills/cli-ux-guidelines/SKILL.md
