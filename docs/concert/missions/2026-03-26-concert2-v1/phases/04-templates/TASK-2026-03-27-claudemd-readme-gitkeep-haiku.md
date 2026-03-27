---
task: "claudemd-readme-gitkeep"
title: "Create CLAUDE.md template, docs README, and missions .gitkeep"
depends_on: ["default-state-and-config"]
wave: 2
model: haiku
---

## Objective

Create the remaining template files that complete the `templates/` directory structure: the CLAUDE.md template (with Concert section markers), the `docs/concert/README.md` explaining the directory structure, and the `docs/concert/missions/.gitkeep` to preserve the empty missions directory in git.

## Files

- `templates/CLAUDE.md`
- `templates/docs/concert/README.md`
- `templates/docs/concert/missions/.gitkeep`

## Requirements

- FR-001: Repository Bootstrapping via npx
- FR-012: Managed File Headers
- Architecture Section 13: Update Mechanism (CLAUDE.md Handling)
- UX Section 3.2: concert init output design

## Detailed Instructions

### templates/CLAUDE.md

This file contains the Concert section that gets appended to the user's existing CLAUDE.md (or creates a new CLAUDE.md if none exists). The Concert section is delimited by markers so the `concert update` command can replace it without affecting user content.

**File content (write exactly this):**

```markdown
<!-- CONCERT:START — DO NOT MODIFY THIS SECTION. It is managed by Concert and will be overwritten on `concert update`. -->

## Concert

This project uses [Concert](https://github.com/he3-org/concert) for agentic development orchestration.

### Commands

- `/concert:init` — Start a new mission
- `/concert:plan` — Plan a stage
- `/concert:review` — Review a stage
- `/concert:accept` — Accept a stage
- `/concert:status` — Check current status
- `/concert:continue` — Continue to next stage or resume execution
- `/concert:debug` — Debug an issue
- `/concert:verify` — Verify work
- `/concert:quick` — Run a quick task
- `/concert:restart` — Restart a stage
- `/concert:replan` — Replan from a stage

### State

- Configuration: `concert.jsonc`
- State: `docs/concert/state.json`
- Agents: `docs/concert/agents/`
- Workflows: `docs/concert/workflows/`
- Skills: `docs/concert/skills/`
- Missions: `docs/concert/missions/`

<!-- CONCERT:END — DO NOT MODIFY THIS SECTION -->
```

### templates/docs/concert/README.md

This file explains the `docs/concert/` directory structure. It is NOT a managed file (no managed header) — it is informational and users can edit it.

**File content (write exactly this):**

```markdown
# Concert

This directory contains Concert's orchestration files.

## Structure

```
docs/concert/
├── agents/       — Agent definitions (the brains of Concert)
├── workflows/    — Workflow definitions (orchestration rules)
├── skills/       — Skill files (domain-specific coding guidance)
├── missions/     — Mission folders (one per mission)
├── state.json    — Current mission state
└── README.md     — This file
```

## Getting Started

1. Review `concert.jsonc` at the project root
2. Start a mission: `/concert:init`
3. Check status: `/concert:status`

## Managed Files

Files in `agents/`, `workflows/`, and `skills/` are managed by Concert. They carry a "DO NOT EDIT" header and will be overwritten on `concert update`. If you need custom behavior, create separate files outside these directories.

## Mission Files

Files in `missions/` are YOUR content. Concert never modifies or deletes them during updates. Each mission has its own folder: `missions/YYYY-MM-DD-<slug>/`.
```

### templates/docs/concert/missions/.gitkeep

This is an empty file to ensure the `missions/` directory exists in git (git does not track empty directories).

**File content:** Empty file (zero bytes).

## Acceptance Criteria

- [ ] `templates/CLAUDE.md` contains the Concert section with START/END markers
- [ ] `templates/CLAUDE.md` lists all Concert commands
- [ ] `templates/CLAUDE.md` lists all state/config file locations
- [ ] The Concert section markers match: `<!-- CONCERT:START` and `<!-- CONCERT:END`
- [ ] `templates/docs/concert/README.md` exists and explains the directory structure
- [ ] `templates/docs/concert/README.md` does NOT have a managed header (it's user-editable)
- [ ] `templates/docs/concert/missions/.gitkeep` exists as an empty file
