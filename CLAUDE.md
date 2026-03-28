# Concert 2

Generation 2 of the opinionated agentic development life-cycle.

## Project Overview

This is the Concert framework itself — an orchestration system for agentic software development workflows. It manages missions through a structured pipeline (vision → requirements → architecture → UX → tasks → execution).

## Git Conventions

- Base branch: `main`
- Commit format: conventional commits (`type: description`)
- Pre-v1: breaking changes don't require major version bumps

## Development

- Concert configuration lives in `concert.jsonc`
- Mission state is tracked in `docs/concert/state.json`
- Workflows are defined in `docs/concert/workflows/`
- Agent definitions are in `docs/concert/agents/`
- Skills are in `docs/concert/skills/`

## Commands

- `/concert:init` — Start a new mission
- `/concert:review` — Review a stage
- `/concert:accept` — Accept a stage
- `/concert:status` — Check current status
- `/concert:continue` — Continue work (start execution, resume mid-task, or advance to next stage)
- `/concert:debug` — Debug an issue
- `/concert:verify` — Verify work
