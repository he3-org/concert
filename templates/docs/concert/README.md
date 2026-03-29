# Concert

This directory contains Concert's orchestration files.

## Structure

```
docs/concert/
├── workflows/    — Workflow definitions (orchestration rules)
├── missions/     — Mission folders (one per mission)
├── state.json    — Current mission state
└── README.md     — This file

.claude/
├── agents/       — Agent definitions (the brains of Concert)
├── skills/       — Skill files (domain-specific coding guidance)
└── commands/     — Concert slash commands
```

## Getting Started

1. Review `concert.jsonc` at the project root
2. Start a mission: `/concert:init`
3. Check status: `/concert:status`

## Managed Files

Files in `.claude/agents/`, `docs/concert/workflows/`, and `.claude/skills/` are managed by Concert. They carry a "DO NOT EDIT" header and will be overwritten on `concert update`. If you need custom behavior, create separate files outside these directories.

## Mission Files

Files in `missions/` are YOUR content. Concert never modifies or deletes them during updates. Each mission has its own folder: `missions/YYYY-MM-DD-<slug>/`.
