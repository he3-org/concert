# Vision: Concert 2 v1

## Problem Statement

Concert 1 successfully orchestrates agentic software development workflows — guiding projects from idea through vision, specs, architecture, UX, tasks, and execution with review loops at each stage. However, the Go implementation has proven difficult to debug and maintain, and the interview agents ask too many questions at once, disrupting the iterative flow. Concert 2 is a complete rewrite that preserves all the value of Concert 1 while fixing these pain points and positioning for future capabilities.

## What We're Building

A TypeScript/npm package that orchestrates a structured agentic development pipeline for a single developer. Concert 2 manages missions through a series of stages — each with planning, execution, and review phases — ensuring high-quality first-pass output for code, documentation, tests, and security.

### Core Pipeline

Vision → Requirements → Architecture → UX → Tasks → Execution

Each stage includes review/accept/restart loops before advancing.

## Target User

A single developer (the author) working primarily from a browser environment, including low-power devices like a Google Pixelbook. The user context-switches between multiple repos, each with its own Concert installation and active mission.

## Primary Interfaces

- **GitHub Agents UI** — for autonomous agent work (select agent, choose model, run)
- **Claude Code web UI** — for interactive steps (interviews, reviews, decisions)
- **Linux CLI** — available but secondary; browser tabs are the primary workflow

## Key Design Decisions

### Language & Distribution
- TypeScript implementation, published as an npm package
- `npx @he3-org/concert init` bootstraps a repo with all necessary files
- Simple, maintainable dependency choices

### State Management
- `docs/concert/state.json` in the repo — GitHub is the source of truth
- One active mission per repo at a time
- All state changes committed to git

### Command Naming
- All commands prefixed `concert-*` to avoid collisions with CC and other tools
- Examples: `concert-init`, `concert-plan`, `concert-review`, `concert-status`, `concert-accept`, `concert-restart`

### Agent Interaction
- Interview agents always ask **one question at a time** — each answer may change the flow
- Every agent output ends with **actionable next steps** including example commands
- `concert-status` is the cold-start recovery command — run it from a blank browser to know exactly where you left off and what to do next

### Update Strategy
- **Safe to overwrite:** agents, skills, commands, workflows, GitHub agent definitions (`.github/agents/`), GitHub workflow files (`.github/workflows/`) — all generated files carry a "managed by Concert, do not edit" header
- **Surgical updates:** `docs/concert/state.json` and `concert.jsonc` — schema may evolve, so updates use intelligent merging (dedicated update agent rather than brittle migration scripts)
- **User content preserved:** mission files (VISION.md, specs, task plans, etc.) are never overwritten by updates

### Future-Ready Architecture
- Execution layer designed for eventual abstraction — GitHub Agents now, with potential for Cloudflare Workers, local CLI, or other runtimes later
- Non-GitHub runtimes must handle failures gracefully and reconcile state back to the repo
- Agent self-improvement/learning loop planned as a future feature (agents review their own performance and suggest improvements)

## Scope

### In Scope (v1)
- Full pipeline: vision → requirements → architecture → UX → tasks → execution
- Review/accept/restart loops at each stage
- GitHub Agents + Claude Code web UI as primary interfaces
- npm package published and installable via npx
- `concert-status` command for cold-start recovery
- Safe update mechanism with surgical state/config merging
- Self-dogfooding capability (use Concert 2 to develop Concert 2)
- All generated files marked with "do not edit" headers

### Out of Scope (v1)
- Multi-runtime abstraction (Cloudflare Workers, Deno, etc.)
- Agent self-improvement/learning loop
- Multi-mission concurrency within a single repo
- Web UI beyond GitHub/CC interfaces

## Success Criteria

1. Can run a full pipeline (vision → execution with reviews) on a real project
2. Works from GitHub Agents UI and Claude Code web UI
3. npm package published and installable via `npx @he3-org/concert init`
4. `concert-status` reliably recovers context from a cold start
5. Updates safely preserve user content and surgically merge state/config
6. Concert 2 can be used to develop Concert 2

## Constraints

- Must work from a low-power Chromebook (browser-first)
- Minimal external dependencies — easy to maintain
- GitHub ecosystem is the foundation; anything outside it must be resilient to crashes, timeouts, and state reconciliation failures
- Single developer usage model — no multi-user or team features needed

## Feature Size

**Large** — full framework rewrite with pipeline orchestration, multiple agents, review loops, npm packaging, update mechanism, and GitHub integration.
