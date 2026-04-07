# Concert 3: GitHub-Native SDLC Orchestration

> **Discussion document** — April 2026  
> Generated from architectural analysis of Concert 2 orchestration failures and GitHub platform capabilities research.

## The Root Problem

Concert's current architecture asks LLMs to do two fundamentally different jobs:

1. **Orchestration** — deciding what happens next, managing state, sequencing agents
2. **Work** — writing code, generating docs, reviewing quality

LLMs are exceptional at #2 but unreliable at #1. The nesting problem (`concert-continue` → `concert-coder` → `state.json` not propagating) is a symptom of a deeper architectural mismatch: **you're using a probabilistic system (LLM) as a deterministic state machine**. Every `next_action` handoff, every `quality_loop_state` update, every `state.json` commit is a point where an LLM can fail silently — and when it does, the entire pipeline stalls with no recovery path except human intervention.

## The Big Idea: Invert the Control

**Replace LLM-as-orchestrator with GitHub-as-orchestrator.**

| Layer | Concert 2 | Concert 3 |
|-------|-----------|-----------|
| **State** | `state.json` in repo | GitHub Issues + Labels + Projects V2 custom fields |
| **Orchestrator** | `concert-continue` agent (LLM) | GitHub Actions workflows (deterministic YAML) |
| **Workers** | Agents calling agents via Task tool | Copilot Coding Agent assigned to individual Issues |
| **Transitions** | `next_action` JSON written by LLM | GitHub Events (issue closed, label changed, PR merged) |
| **Visibility** | `concert-status` agent reads JSON | GitHub Projects board, sub-issue progress bars |
| **Crash Recovery** | Manual — read state.json, run concert-continue | Automatic — issues persist, agents re-assignable |
| **Interactive** | Claude Code (Codespaces) | Same — Claude Code for interviews only |

**Zero agent nesting. Ever.** Every agent invocation is a flat, independent session triggered by a GitHub event.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Issues (State)                      │
│                                                               │
│  Mission Issue (Parent)          ┌──────────────────────┐    │
│  ├── Sub: Generate Requirements  │  GitHub Projects V2   │    │
│  ├── Sub: Generate Architecture  │  ┌─────┬─────┬─────┐ │    │
│  ├── Sub: Generate UX Design     │  │ To  │ In  │Done │ │    │
│  ├── Sub: Plan Tasks             │  │ Do  │Prog │     │ │    │
│  ├── Sub: TASK-01 setup          │  │     │     │     │ │    │
│  ├── Sub: TASK-02 models         │  └─────┴─────┴─────┘ │    │
│  ├── Sub: TASK-03 auth           └──────────────────────┘    │
│  └── Sub: Verify & Report                                     │
└─────────────┬───────────────────────────────────────────────┘
              │ GitHub Events (labeled, closed, PR merged)
              ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions (Orchestrator)                    │
│                                                               │
│  concert-orchestrator.yml                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ on: issues.labeled, issues.closed, pull_request.*     │    │
│  │                                                        │    │
│  │ IF label "concert/ready-for-requirements" added:       │    │
│  │   → Create sub-issue "Generate Requirements"          │    │
│  │   → Assign to @copilot                                │    │
│  │   → Include agent instructions in issue body          │    │
│  │                                                        │    │
│  │ IF sub-issue "Generate Requirements" closed:           │    │
│  │   → Add label "concert/ready-for-review" to parent    │    │
│  │   → Create sub-issue "Review Requirements"            │    │
│  │   → Assign to user                                    │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────┬───────────────────────────────────────────────┘
              │ Assigns issues to @copilot
              ▼
┌─────────────────────────────────────────────────────────────┐
│        Copilot Coding Agent (Leaf Workers)                    │
│                                                               │
│  Each agent session is independent:                           │
│  - Reads issue body (contains role + instructions)           │
│  - Reads .github/agents/*.agent.md (persona)                │
│  - Reads AGENTS.md (project context)                         │
│  - Does its work on copilot/* branch                         │
│  - Creates/updates PR                                        │
│  - Session ends. No nesting. No state to propagate.          │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Pipeline Design

### Phase 1: Vision (Interactive — Claude Code in Codespaces)

This is the one phase that requires human conversation. It stays interactive.

1. User opens a Codespace, runs `concert init` (a lightweight CLI or slash command)
2. Claude Code interviews the user (one question at a time, as today)
3. Produces `VISION.md` on a new branch `concert/<slug>`
4. CLI creates:
   - A **parent issue** titled `🎵 Mission: <name>` with label `concert/vision-draft`
   - The issue body contains structured metadata (mission slug, branch, workflow variant)
   - Opens a draft PR linking to the parent issue
5. CLI comments on the parent issue: "Vision document ready for review. Please review the PR and comment `/accept` when satisfied."

**Why this works**: The interactive interview is the *only* part that genuinely needs Claude Code. Everything after can be event-driven.

### Phases 2–5: Planning Stages (Automated — Copilot Coding Agent)

Each planning stage follows an identical pattern driven entirely by GitHub Actions:

```
User comments "/accept" on parent issue
        │
        ▼
GitHub Action detects /accept command (issue_comment trigger)
        │
        ▼
Action updates parent issue label: concert/vision-accepted → concert/requirements-pending
        │
        ▼
Action creates sub-issue:
  Title: "📋 Generate Requirements from Vision"
  Body: |
    ## Role
    You are a senior requirements analyst...

    ## Instructions
    1. Read VISION.md from branch concert/<slug>
    2. Read the codebase to understand current architecture
    3. Generate REQUIREMENTS.md following the template at .concert/templates/REQUIREMENTS.md
    4. Commit to the existing branch concert/<slug>

    ## Acceptance Criteria
    - All functional requirements have FR-XXX identifiers
    - Non-functional requirements cover performance, security, scalability
    - Document ends with ## Open Questions section

    ## References
    - Branch: concert/<slug>
    - Mission Issue: #<parent-number>
    - Vision: .concert/missions/<slug>/VISION.md
  Labels: concert/agent-work
  Assignee: @copilot
        │
        ▼
Copilot Coding Agent picks up the issue automatically
  - Reads .github/agents/concert-analyst.agent.md (persona + skills)
  - Reads AGENTS.md (project-wide conventions)
  - Reads issue body (specific task instructions)
  - Generates REQUIREMENTS.md on the branch
  - Creates/updates PR
  - Session ends naturally
        │
        ▼
GitHub Action detects: sub-issue closed OR PR updated
        │
        ▼
Action updates parent issue label: concert/requirements-pending → concert/requirements-review
Action comments on parent issue: "Requirements generated. Please review PR diff and comment /accept or /revise"
```

**The `/revise` command**: If the user comments `/revise: <feedback>`, the Action creates a new sub-issue with the revision instructions and re-assigns to `@copilot`. No nesting — just a new independent issue.

### Phase 6: Execution (Task-by-Task — Copilot Coding Agent)

This is where Concert 2 breaks most badly. Concert 3 handles it cleanly:

1. **Task Planning** (same pattern as above): Copilot generates TASK files in `phases/`
2. **GitHub Action parses TASK files**: Extracts frontmatter, creates one sub-issue per task
3. **Sequential dispatch**: Action assigns tasks one at a time based on wave/dependency order

```yaml
# concert-execute.yml
on:
  issues:
    types: [closed]  # Triggers when a task sub-issue is closed

jobs:
  dispatch-next-task:
    if: contains(github.event.issue.labels.*.name, 'concert/task')
    steps:
      - name: Find next unassigned task
        # Read parent issue, find sub-issues, identify next task by wave order
        # If current task had a code review label, check if review passed

      - name: Create code review sub-issue (if needed)
        # If task just completed, create review sub-issue first
        # Assign to @copilot with concert-reviewer agent instructions

      - name: Assign next task
        # If review passed (or no review needed), assign next task to @copilot
        # Update parent issue progress comment

      - name: Update Projects board
        # Move cards, update custom fields (phase, wave, progress %)
```

### Code Quality Loop (Without Nesting!)

The coder → reviewer → fix loop becomes a simple event chain:

```
1. Task sub-issue assigned to @copilot with coder instructions
   └── Copilot creates PR, closes sub-issue

2. Action detects closure → creates review sub-issue
   Title: "🔍 Review TASK-03: auth middleware"
   Body: Review the diff on PR #42, rate findings as CRIT/MAJ/MIN/NTH/PASS
   Assignee: @copilot (with reviewer agent instructions)
   └── Copilot reviews, posts findings as PR review comments, closes sub-issue

3. Action detects review closure → parses review outcome
   IF CRIT/MAJ findings AND iteration < 3:
     → Create fix sub-issue: "🔧 Fix TASK-03 review findings (iteration 2)"
     → Body includes specific findings to address
     → Assign to @copilot with coder instructions + findings
     └── Loop back to step 2

   IF PASS or iteration >= 3:
     → Label task as concert/task-complete
     → Trigger next task dispatch
```

**Each step is a separate, flat Copilot session.** No agent calls another agent. GitHub Actions (deterministic YAML) drives every transition.

## State Management: GitHub-Native

### Issues as State

```
Parent Issue: "🎵 Mission: auth-service"
├── Labels: concert/execution, concert/phase-2
├── Custom Fields (Projects V2):
│   ├── Stage: execution
│   ├── Phase: 2/5
│   ├── Tasks Completed: 8/24
│   ├── Workflow: mission-full
│   └── Branch: concert/auth-service
├── Sub-issues (with progress bar):
│   ├── ✅ Generate Requirements
│   ├── ✅ Review Requirements
│   ├── ✅ Generate Architecture
│   ├── ✅ Review Architecture
│   ├── ✅ Plan Tasks
│   ├── ✅ TASK-01: project setup (haiku)
│   ├── ✅ TASK-01: code review → PASS
│   ├── 🔄 TASK-02: data models (sonnet)  ← currently in progress
│   ├── ⬜ TASK-03: auth middleware (opus)
│   └── ... (20 more tasks)
└── Progress: ████████░░░░░░░░ 33%
```

### Why This Is Better Than state.json

| Concern | state.json | GitHub Issues |
|---------|-----------|---------------|
| **Persistence** | Must be committed by LLM (unreliable) | Managed by GitHub (reliable) |
| **Visibility** | Requires running `concert-status` | Visible in browser, mobile, API |
| **Crash Recovery** | Requires reading JSON, parsing state | Issue is still open — re-assign @copilot |
| **Progress Tracking** | Manual calculation | Native sub-issue progress bars |
| **History/Audit** | `history` array in JSON | Full issue timeline with timestamps |
| **Cross-session** | JSON must be read by every agent | Issue body is always available |
| **Notifications** | None | GitHub notifications, email, mobile |
| **Board View** | None | GitHub Projects kanban/roadmap |

## File Structure

```
.github/
├── workflows/
│   ├── concert-orchestrator.yml      # Main state machine (label/close events)
│   ├── concert-execute.yml           # Task dispatch and quality loop
│   ├── concert-review.yml            # /accept, /revise command handling
│   └── concert-init.yml              # Optional: workflow_dispatch for init
├── agents/
│   ├── concert-analyst.agent.md      # Requirements analyst persona
│   ├── concert-architect.agent.md    # Architecture planner persona
│   ├── concert-designer.agent.md     # UX designer persona
│   ├── concert-planner.agent.md      # Task decomposer persona
│   ├── concert-coder.agent.md        # TDD implementer persona
│   └── concert-reviewer.agent.md     # Code quality reviewer persona
├── instructions/
│   └── concert-conventions.instructions.md  # Project-wide coding standards
├── ISSUE_TEMPLATE/
│   ├── concert-mission.yml           # Mission creation form
│   └── concert-task.yml              # Task issue template
└── AGENTS.md                         # Project-wide agent guidance

.concert/
├── templates/
│   ├── VISION.md                     # Document templates
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── UX.md
│   └── TASK.md
├── workflows/                        # Human-readable workflow docs (reference only)
│   └── README.md                     # Explains the pipeline for humans
└── skills/                           # Domain skills (referenced by agents)
    ├── typescript-standards/
    ├── react-best-practices/
    └── ...

concert.jsonc                         # Minimal config (workflow variant, review gates)
```

## Key Design Decisions

### 1. Issue Body as Agent Instructions

Instead of agents reading workflow documents and parsing state.json, each issue body IS the complete instruction set. The GitHub Action constructs it from templates when creating sub-issues:

```markdown
## Role
You are a senior requirements analyst. Your job is to transform a product
vision into comprehensive, testable requirements.

## Context
- Mission: auth-service
- Branch: concert/auth-service
- Upstream: Read .concert/missions/auth-service/VISION-SPEC.md

## Task
Generate REQUIREMENTS.md following the template at .concert/templates/REQUIREMENTS.md

## Quality Criteria
- Every FR has a unique FR-XXX identifier
- NFRs cover: performance, security, scalability, accessibility
- Ends with ## Open Questions section with unresolved items as checkboxes

## Skills to Apply
Read and follow: .concert/skills/typescript-standards/SKILL.md
```

This eliminates the boot sequence problem. The agent doesn't need to read state.json, discover which workflow is active, find the right stage, locate the right documents — it's all right there in the issue.

### 2. Labels as State Machine

```
concert/vision-draft         → User is reviewing vision
concert/vision-accepted      → Vision approved, ready for next stage
concert/requirements-pending → Copilot is generating requirements
concert/requirements-review  → Requirements ready for user review
concert/requirements-accepted→ Requirements approved
concert/architecture-pending → ...
concert/execution            → In execution phase
concert/phase-N              → Currently on phase N
concert/task                 → This sub-issue is a coding task
concert/task-review          → This sub-issue is a code review
concert/task-complete        → Task finished and reviewed
concert/blocked              → Manual intervention needed
```

GitHub Actions triggers on label changes — this is 100% deterministic, 100% reliable, and 100% auditable.

### 3. No `concert-continue` Agent

The `concert-continue` agent is the source of all nesting problems. **Delete it.** Replace it with:

- **For automatic progression**: GitHub Actions detects issue closure → creates next issue → assigns @copilot
- **For manual progression**: User comments `/accept` → GitHub Action advances the state machine
- **For crash recovery**: User re-opens the issue or re-assigns @copilot — the issue body still has all instructions

### 4. Model Tier Routing

Task issues include model tier in their metadata. The GitHub Action can route to different agents or include model-specific instructions:

```markdown
<!-- concert-meta: {"model": "opus", "wave": 2, "depends": ["TASK-01"]} -->
```

With GitHub's model picker for coding agents, this maps to selecting the appropriate model when assigning.

### 5. Cross-Org Sharing via `.github-private`

Organization-wide agent definitions can live in `.github-private`:
- Shared agent personas (analyst, architect, coder, reviewer)
- Shared skills and conventions
- Shared workflow templates

Individual repos get `concert init` which scaffolds the Actions workflows and templates.

## Interactive Stages: Claude Code in Codespaces

For the vision interview and review cycles that need real conversation:

1. **Vision Interview**: User opens Codespace → `concert init` → Claude Code interviews → produces VISION.md → creates mission issue
2. **Reviews**: User reads PR diff → comments `/accept` or opens Codespace for interactive revision with Claude Code → commits changes → comments `/accept`

The Claude Code interaction is scoped to exactly two activities:
- **Interviewing** (vision creation)
- **Interactive revision** (optional, when `/revise` isn't enough)

Everything else is automated through GitHub's event system.

## Migration Path from Concert 2

1. **Phase 1**: Build the GitHub Actions workflows (`concert-orchestrator.yml`, `concert-execute.yml`, `concert-review.yml`)
2. **Phase 2**: Convert existing `.claude/agents/*.md` into `.github/agents/*.agent.md` format — instructions go in issue body, agent file provides persona baseline
3. **Phase 3**: Build the `concert init` CLI that creates the mission issue + branch + PR
4. **Phase 4**: Create issue templates and Projects V2 board setup
5. **Phase 5**: Sunset `state.json` and the orchestration agents (`concert-continue`, `concert-accept`, `concert-status`, `concert-restart`)

The npm package becomes much simpler:
- `concert init` — scaffolds `.github/workflows/`, `.github/agents/`, templates, creates Projects board
- `concert update` — updates agent definitions and workflow files
- No more `concert push`, no more state management, no more stage-registry

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| **Copilot can't auto-select custom agents per issue** | Put full instructions in issue body; agent.md provides persona baseline |
| **GitHub Actions complexity** | Workflows are deterministic YAML — far easier to debug than LLM orchestration |
| **Copilot coding agent rate limits** | Sequential task dispatch naturally throttles; configurable delays in Actions |
| **Review findings parsing** | Use structured comment format (JSON in HTML comment); Action parses deterministically |
| **Agentic Workflows still in preview** | Design uses standard Actions + issue assignment; Agentic Workflows are optional enhancement |
| **Cost of many Copilot sessions** | Each session is focused and small (one task, one review) — more efficient than large context-heavy sessions |

## What This Means for Concert's Identity

Concert 3 is no longer "an LLM orchestration framework." It becomes:

> **A GitHub-native SDLC pipeline that uses AI as workers, not managers.**

- **GitHub Issues** = state machine (reliable, persistent, visible)
- **GitHub Actions** = orchestrator (deterministic, event-driven, debuggable)
- **GitHub Projects** = dashboard (progress tracking, board views, reporting)
- **GitHub Sub-issues** = task hierarchy (phases, waves, progress bars)
- **Copilot Coding Agent** = worker (assigned issues, creates PRs, no nesting)
- **Claude Code** = interviewer (interactive vision creation, optional revisions)
- **Skills/Instructions** = quality guidance (same `.instructions.md` and AGENTS.md patterns)

The magic of Concert — structured SDLC with vision → requirements → architecture → tasks → execution → verification — is fully preserved. What changes is that the _orchestration_ moves from a fragile LLM prompt to a robust, deterministic, observable GitHub-native infrastructure.
