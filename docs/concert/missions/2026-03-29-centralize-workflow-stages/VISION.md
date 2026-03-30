# Vision: Centralize Workflow Stage Definitions

## Overview

Refactor Concert's workflow system to extract stage definitions, transitions, and user guidance messaging into a single source of truth. Currently, this logic is scattered across individual agent definitions and workflow markdown files, creating duplication and drift risk.

## Problem Statement

Stage logic is embedded in multiple locations:
1. **Workflow files** (`CONCERT-WORKFLOW-MISSION-*.md`) — define stage tables with agent mappings, inputs, outputs, and transitions
2. **Agent definitions** (`.claude/agents/concert-continue.md`) — embed if/then routing logic that maps stages to agents (e.g., "if stage is requirements → read concert-analyst.md")
3. **Command files** (`.claude/commands/concert/`) — reference stage names and next-step messaging
4. **User guidance** — duplicated across agents with stage-specific messaging templates

When a stage is added, renamed, or reordered, every file must be updated manually. The `concert-continue` agent is the worst offender — it contains a full stage→agent routing table in its execution flow.

## Goals

1. **Single source of truth for stages** — one file (or structured data) that defines: stage name, order, responsible agent, inputs, outputs, transition rules, and whether the stage triggers review
2. **Agents become pure executors** — agents read their task and execute it. They do not contain stage routing logic or know about the pipeline structure.
3. **Centralized user guidance templates** — stage-specific messaging ("next steps after requirements", "how to review architecture") lives in one place, not scattered across 15 agent files
4. **Workflow variants remain composable** — full/medium/small workflows select which stages to include, but all reference the same stage definitions

## Non-Goals

- Changing the execution model (phases/waves/tasks) — that stays as-is
- Adding new stages — this is a refactor, not a feature addition
- Changing the user-facing commands or CLI interface
- Modifying how `concert.jsonc` configuration works

## Users

- Concert maintainers (us) editing stage definitions
- Concert agents consuming stage definitions at runtime
- End users of Concert (indirect — they get more consistent messaging)

## Success Criteria

1. Adding a new stage requires editing exactly one file (the stage definitions) plus writing the new agent
2. `concert-continue` has zero hardcoded stage→agent mappings
3. All user guidance "Next steps" messaging is generated from templates, not handwritten per agent
4. All existing tests pass after refactor
5. `concert update` still installs all files correctly

## Constraints

- Must be backwards-compatible with existing missions (state.json format doesn't change)
- Stage definitions file must ship in the npm package (via the existing live-file mechanism)
- Agents must remain readable as standalone documents (not just "read stage-definitions.json and do what it says")
