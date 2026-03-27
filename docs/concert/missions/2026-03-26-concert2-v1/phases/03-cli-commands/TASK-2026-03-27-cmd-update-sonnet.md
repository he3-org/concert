---
task: "cmd-update"
title: "Implement the concert update CLI command"
depends_on: ["copy-helpers", "merge-logic", "version-helpers", "config-helpers", "state-helpers"]
wave: 1
model: sonnet
---

## Objective

Implement the `concert update` CLI command that updates managed files and surgically merges configuration in an existing Concert installation.

## Files

- `src/commands/update.ts`
- `src/__tests__/commands/update.test.ts`

## Requirements

- FR-013: Update Mechanism
- FR-012: Managed File Headers
- Architecture Section 13: Update Mechanism
- UX Section 3.3: concert update output design

## Implementation

### src/commands/update.ts

The update command must:

1. Verify cwd has an existing Concert installation (check for `docs/concert/`). If not, print error and exit with code 2.
2. Get the current package version.
3. For managed files (agents, workflows, skills, GitHub agents, GitHub workflows):
   a. Compare version headers in existing files vs current package version.
   b. Skip files already at current version.
   c. Overwrite outdated files with new versions from templates.
4. For concert.jsonc:
   a. Read template default config and user's current config as raw text.
   b. Surgical merge: add new fields with defaults, preserve existing user values, remove deprecated fields, preserve comments.
5. For state.json:
   a. Read current state and template default state.
   b. Add new schema fields with default values.
   c. Preserve all existing data.
   d. Remove fields no longer in schema.
6. For CLAUDE.md:
   a. Find the Concert section (between CONCERT:START and CONCERT:END markers).
   b. Replace only the Concert section, preserving everything else.
   c. If no Concert section exists, append it.
7. Print structured output following UX spec format.

### Output Format (from UX spec)

Success:
```
Concert updated to vX.Y.Z (was vA.B.C)

  Updated managed files:
    docs/concert/agents/concert-continue.md  (vA.B.C -> vX.Y.Z)
    ...

  Skipped (already current):
    docs/concert/agents/concert-init.md      (vX.Y.Z)
    ...

  Configuration merged (concert.jsonc):
    Added:   execution.max_review_iterations (default: 3)
    Removed: deprecated_field

  State schema updated (state.json):
    Added:   quality_loop_state (default: null)

  Next steps:
    1. Review concert.jsonc for new configuration options
    2. Continue your mission:  /concert:status
```

Already current:
```
Concert is up to date (vX.Y.Z)

  All N managed files are at the current version.
  No configuration changes needed.

  Next steps:
    1. Continue your mission:  /concert:status
```

### Exit Codes

- 0: Success (updated or already current)
- 2: Not a Concert installation

## Tests

1. Update succeeds with outdated managed files
2. Update reports "already current" when all files match
3. Update fails with code 2 when no Concert installation exists
4. Update merges new fields into concert.jsonc
5. Update preserves user values in concert.jsonc
6. Update preserves comments in concert.jsonc
7. Update adds new fields to state.json
8. Update preserves existing state data
9. Update handles CLAUDE.md section replacement
10. Output follows expected format

## Acceptance Criteria

- [ ] Update overwrites outdated managed files with new versions
- [ ] Update skips files already at the current version
- [ ] Update surgically merges concert.jsonc (new fields added, user values preserved, comments preserved)
- [ ] Update surgically merges state.json (new fields added, existing data preserved)
- [ ] Update handles CLAUDE.md section replacement
- [ ] Output matches UX spec format
- [ ] Exit codes are correct
- [ ] All tests pass
- [ ] `npm run typecheck` passes

## Skills

- docs/concert/skills/cli-ux-guidelines/SKILL.md
