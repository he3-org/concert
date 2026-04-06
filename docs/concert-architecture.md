# Concert Architecture Reference

This document describes how Concert works — every command, workflow, agent, and skill,
and how they connect. Use this as the definitive reference for understanding the system.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Information Flow](#information-flow)
3. [Stages & Pipeline](#stages--pipeline)
4. [Commands](#commands)
5. [Agents](#agents)
6. [Workflows](#workflows)
7. [Skills](#skills)
8. [Mission Documents](#mission-documents)
9. [State Schema](#state-schema)

---

## System Overview

Concert is an orchestration framework for agentic software development. It manages
missions through a structured pipeline: vision → requirements → architecture → UX →
tasks → execution → verification → refactoring → retrospective.

### Architecture Layers

```
User
  │
  ├── /concert:command (Claude Code)
  │   └── .claude/commands/concert/command.md → dispatches to agent
  │
  ├── @concert-agent (GitHub Copilot)
  │   └── .github/agents/concert-agent.agent.md → reads .claude/agents/concert-agent.md
  │
  ▼
Agent (.claude/agents/concert-*.md)
  │
  ├── Reads: .claude/skills/concert-core/SKILL.md (shared procedures)
  ├── Reads: .concert/state.json (mission state)
  ├── Reads: .concert/stage-registry.jsonc (stage definitions)
  ├── Reads: .concert/workflows/*.md (orchestration rules)
  ├── Reads: .claude/skills/*/ (domain skills)
  │
  ├── Does work (creates documents, writes code, reviews, etc.)
  │
  ├── Writes: state.json (including next_action)
  └── Commits changes
```

### Key Design Principles

1. **Crash safety** — state.json is committed after every update; sessions can resume
   from the last commit with at most one task of work lost.
2. **KV-cache optimization** — All agents read state.json first in the same order to
   maximize LLM context cache sharing.
3. **Explicit handoff** — Every agent writes `next_action` to state.json before
   completing, so the next session knows exactly what to do.
4. **Staged review gates** — Users must review and accept each planning stage before
   the pipeline advances.
5. **No hidden automation** — Every next step is shown explicitly; users choose when
   to proceed.

---

## Information Flow

### The Context Blackboard

All inter-agent communication flows through two mechanisms:

| Mechanism             | What                                                                                              | Who writes                  | Who reads         | Lifetime                 |
| --------------------- | ------------------------------------------------------------------------------------------------- | --------------------------- | ----------------- | ------------------------ |
| **state.json**        | Pipeline position, execution progress, failure blocks, telemetry, cost, `next_action`             | Any agent                   | Any agent         | Persists across sessions |
| **Mission documents** | VISION.md, REQUIREMENTS.md, ARCHITECTURE.md, UX.md, ALIGNMENT.md, TASK files, PHASE-SUMMARY files | Planning & execution agents | Downstream agents | Persists in git          |

### The `next_action` Field

Passes intent between agents across session boundaries:

```jsonc
{
  "next_action": {
    "type": "run_agent", // "run_agent" | "run_workflow" | "await_user"
    "target": "concert-analyst", // agent or workflow name
    "context": {}, // optional key-value pairs for the target
    "message": "Requirements analysis ready to begin",
  },
}
```

**Rules:**

- Every agent writes `next_action` before completing
- The Continue agent reads `next_action` to decide what to do next
- `await_user` means "stop and show status" — user must invoke the next command
- `run_agent` means the Continue agent should spawn the named agent
- This replaces the previous approach of deriving next action from state fields

### Boot Sequence

Every agent reads files in this order (5-tier hierarchy for KV-cache reuse):

1. **Tier 1** — `.concert/state.json` (ALL agents)
2. **Tier 2** — `.concert/stage-registry.jsonc` (planning + orchestration)
3. **Tier 3** — Active workflow file (workflow-aware agents)
4. **Tier 4** — Current TASK file + skills (execution agents)
5. **Tier 5** — Dynamic content: git diff, test output, upstream docs

---

## Stages & Pipeline

### Pipeline Stages

| Order | Stage         | Agent                 | Triggers Review | Produces Spec        | Interactive |
| ----- | ------------- | --------------------- | --------------- | -------------------- | ----------- |
| 1     | Vision        | concert-init          | Yes             | VISION-SPEC.md       | Yes         |
| 2     | Requirements  | concert-analyst       | Yes             | REQUIREMENTS-SPEC.md | No          |
| 3     | Architecture  | concert-architect     | Yes             | ARCHITECTURE-SPEC.md | No          |
| 4     | UX            | concert-designer      | Yes             | UX-SPEC.md           | No          |
| 5     | Tasks         | concert-planner       | Yes             | —                    | No          |
| 6     | Execution     | concert-coder         | No              | —                    | No          |
| 7     | Verification  | concert-verifier      | No              | —                    | Yes         |
| 8     | Refactoring   | concert-refactorer    | No              | —                    | No          |
| 9     | Retrospective | (not yet implemented) | No              | —                    | No          |

### Workflow Variants

| Variant        | Stages Included                                |
| -------------- | ---------------------------------------------- |
| mission-full   | All 9                                          |
| mission-medium | Skip UX (8 stages)                             |
| mission-small  | Skip Requirements, Architecture, UX (6 stages) |

### Stage × Feature Matrix

| Stage         | Review? | Accept? | Produces Spec? |
| ------------- | ------- | ------- | -------------- |
| Vision        | Yes     | Yes     | Yes            |
| Requirements  | Yes     | Yes     | Yes            |
| Architecture  | Yes     | Yes     | Yes            |
| UX            | Yes     | Yes     | Yes            |
| Tasks         | Yes     | Yes     | No             |
| Execution     | No      | No      | No             |
| Verification  | No      | No      | No             |
| Refactoring   | No      | No      | No             |
| Retrospective | No      | No      | No             |

---

## Commands

Every command dispatches to exactly one agent. Commands are thin entry points
with no orchestration logic.

### Init Command

```
/concert:init [prompt?]
  → Spawns concert-init agent
  → Agent interviews user, creates VISION.md, branch, WIP PR
  → Sets next_action: { type: "await_user", target: "review", message: "Vision ready for review" }
```

### Continue Command

```
/concert:continue
  → Spawns concert-continue agent
  → Agent reads next_action from state.json and dispatches:
     - "run_agent" → spawns the named agent
     - "run_workflow" → runs the named workflow
     - "await_user" → shows status and message
     - null/empty → determines action from state (legacy fallback)
```

### Review Command

```
/concert:review [stage?]
  → Spawns concert-reviewer agent (via concert-review alias)
  → Agent presents open questions across ALL mission docs, one at a time
  → Agent conducts stage document review by severity
  → Sets next_action: { type: "await_user", target: "review_or_accept", message: "Review round complete" }
```

### Accept Command

```
/concert:accept
  → Spawns concert-accept agent
  → Agent creates project-level spec file, advances pipeline
  → Sets next_action based on next stage (run_agent if non-interactive, await_user if interactive)
```

### Status Command

```
/concert:status
  → Spawns concert-status agent (read-only)
  → Displays: pipeline progress, open questions, cost, next steps
  → Does NOT modify state.json
```

### Fix Command

```
/concert:fix [issue?]
  → Spawns concert-fix agent (works without a mission)
  → 7-phase process: understand → reproduce → diagnose → assess → implement → prevent → self-review
  → Sets next_action: { type: "await_user", target: "continue", message: "Fix applied" }
```

### Debug Command

```
/concert:debug [issue?]
  → Spawns concert-debug agent
  → Scientific method: observe → hypothesize → test → fix (max 3 cycles)
  → Sets next_action: { type: "await_user", target: "continue", message: "Debug complete" }
```

### Quick Command

```
/concert:quick [task]
  → Spawns concert-quick agent (bypasses pipeline)
  → Assesses complexity, implements directly, runs tests, commits
  → Sets next_action: { type: "await_user", target: "status", message: "Quick task complete" }
```

### Verify Command

```
/concert:verify
  → Spawns concert-verifier agent (via concert-verify alias)
  → Checks each requirement: PASS/PARTIAL/FAIL/UNTESTABLE
  → Generates VERIFICATION.md and COST-REPORT.md
  → Sets next_action based on result
```

### Restart Command

```
/concert:restart [stage?]
  → Spawns concert-restart agent
  → Archives current plan, resets stage, re-triggers consultant
  → Sets next_action: { type: "await_user", target: "review", message: "Fresh plan ready for review" }
```

### Replan Command

```
/concert:replan [stage]
  → Spawns concert-replan agent (interactive)
  → Interviews user about changes, re-runs consultants downstream
  → Committed code preserved — only TASK files regenerated
  → Sets next_action: { type: "await_user", target: "review", message: "Replanned — ready for review" }
```

### Delete Command

```
/concert:delete
  → Spawns concert-delete agent
  → Deletes mission folder, resets state.json to {}
  → Project specs (.concert/*-SPEC.md) preserved
```

### Push Command

```
/concert:push
  → CLI command (npx @he3-org/concert push), NOT an agent command
  → Saves state, commits, pushes branch
  → Outputs continuation instructions for other environment
```

---

## Agents

Agents do focused work. Each reads context, does one job, writes results,
sets `next_action`, and reports. All agents reference the `concert-core` skill
for shared procedures.

### Planning Agents

**concert-init** (Interactive)

- Interviews user one question at a time
- Creates VISION.md, mission folder, branch, WIP PR
- Proposes feature size with reasoning
- Reads existing project specs for context enrichment
- Environment check: refuses non-interactive mode

**concert-analyst**

- Transforms VISION.md into formal requirements (FR/NFR/DR/IR)
- Analyzes existing codebase for reality-based requirements
- Every requirement has testable acceptance criteria and priority
- Has re-review mode for post-modification analysis

**concert-architect**

- Designs architecture from requirements with trade-off documentation
- Analyzes existing codebase deeply — integrates with existing patterns
- Covers: system overview, tech stack, components, data model, API, security, performance
- Chooses boring technology over exciting technology
- Has re-review mode

**concert-designer**

- Creates UX plans with platform-specific skill loading
- Produces implementable component specs, not mockups
- Covers: user flows, information architecture, components, interactions, accessibility
- Designs within architecture constraints
- Has re-review mode

**concert-planner**

- Decomposes plans into phases, waves, and TASK files
- Assigns model tiers: haiku (simple) → sonnet (moderate) → opus (complex)
- Each task specifies: files, tests, acceptance criteria, skills, dependencies
- Wave-based dependency ordering (DAG)
- Has re-review mode

### Execution Agents

**concert-coder**

- TDD-first implementation: tests before code
- One task, one commit, update state.json — crash-safe
- Reads skills before writing code
- On revision: fixes findings in priority order (CRIT/MAJ first)

**concert-code-reviewer**

- Reviews against task specification and loaded skills
- Every finding: exact file, line, specific fix
- Severity: CRIT (blocks) > MAJ (blocks) > MIN > NTH
- Read-only — never modifies code

**concert-documenter**

- Runs after phase completion
- Updates README, API docs, user guides
- One commit for all doc changes per phase
- Reads PHASE-SUMMARY as primary source

**concert-verifier**

- Checks each requirement from REQUIREMENTS-SPEC.md against implementation
- Classifications: PASS, PARTIAL, FAIL, UNTESTABLE with evidence
- Generates VERIFICATION.md and COST-REPORT.md
- Creates gap-closure tasks if needed

### Recovery Agents

**concert-fix** (Works without a mission)

- 7-phase quality-first process:
  1. UNDERSTAND — answer 5 questions before touching code
  2. REPRODUCE — write failing test
  3. DIAGNOSE — form 2-3 hypotheses, test each
  4. ASSESS — patch vs refactor vs escalate (decision matrix)
  5. IMPLEMENT — minimal fix or contained refactor
  6. PREVENT — write to .concert/CONCERT-RECOMMENDS.md
  7. SELF-REVIEW — 8-point quality checklist
- Never edits skill or agent files directly

**concert-debug**

- Scientific method: observe → hypothesize → test → fix
- Persists debug state for crash recovery
- Max 3 hypothesis cycles before escalation
- Clears failure block on success so continue can resume

### Orchestration Agents

**concert-continue**

- Universal session continuation — reads `next_action` from state.json
- Three dispatch paths: run_agent, run_workflow, await_user
- Legacy fallback: determines action from state when next_action is empty
- Position-aware execution resumption (mid-task, between-task, between-phase)
- Failure block assessment (retryable vs debug-needed)

**concert-accept**

- Creates project-level spec from mission document
- Advances pipeline to next stage
- Sets next_action for next stage's agent

**concert-restart**

- Archives current plan, resets stage to pre-draft
- Re-triggers consultant agent from stage registry

**concert-replan** (Interactive)

- Goes back to earlier pipeline stage
- Interviews user about changes
- Re-runs downstream consultants
- Committed code preserved

### Utility Agents

**concert-status** (Read-only)

- Displays pipeline progress, cost, open questions, next steps
- Never modifies state.json
- Omits open questions when in execution stage

**concert-delete**

- Deletes mission folder, resets state.json
- Preserves project specs and git history

**concert-push** (Reference agent)

- Documents CLI push behavior for other agents
- Actual logic in src/commands/push.ts

**concert-refactorer**

- Analyzes codebase for improvements
- Produces prioritized refactoring plan (CRIT → MAJ → MIN → NTH)
- Never implements changes — plan document only

### Alias Agents

**concert-review** → Redirects to concert-reviewer
**concert-verify** → Redirects to concert-verifier

These exist because Claude Code maps `/concert:review` to `concert-review.md` by naming
convention, but the canonical agents are named `concert-reviewer` and `concert-verifier`.

---

## Workflows

Workflows define orchestration rules — sequencing, branching, looping, failure handling.
They live in `.concert/workflows/`.

### Mission Workflows

**CONCERT-WORKFLOW-MISSION-FULL.md**

- All 9 stages: vision → requirements → architecture → UX → tasks → execution → verification → refactoring → retrospective
- Review gates between all planning stages

**CONCERT-WORKFLOW-MISSION-MEDIUM.md**

- 8 stages: skips UX
- For features that don't need UX design

**CONCERT-WORKFLOW-MISSION-SMALL.md**

- 6 stages: skips requirements, architecture, UX
- For well-defined, single-component features

### Execution Workflows

**CONCERT-WORKFLOW-EXECUTION.md**

- Phase/wave/task orchestration
- Wave-based dependency DAG: waves execute sequentially, tasks within a wave can parallelize
- Model tier routing (haiku/sonnet/opus per task)
- Failure taxonomy: test_failure, build_error, context_exhaustion, dependency_missing, model_capability_exceeded, timeout, unknown
- "Crash hard, learn fast" — stop on failure, classify error, don't roll back
- Context compaction — completed phases read from PHASE-SUMMARY, not full task files

**CONCERT-WORKFLOW-CODE-QUALITY.md**

- Coder → Code-Reviewer quality loop
- Max review iterations (configurable, default 3)
- Severity-based pass/fail: CRIT/MAJ blocks, MIN/NTH passes

**CONCERT-WORKFLOW-FIX.md**

- Fix → self-review → optional code reviewer loop
- Simple fixes (≤2 files): self-review sufficient
- Complex fixes (>2 files or refactoring): spawn code reviewer

### Review & Quality Workflows

**CONCERT-WORKFLOW-REVIEW-CYCLE.md**

- Specialist re-review after document edits
- Modified documents → stage specialist re-reviews for new concerns
- New concerns → added as open questions
- Cross-document alignment checking

**CONCERT-WORKFLOW-OBSERVABILITY.md**

- Telemetry collection and status display
- Cost tracking: spent + estimated remaining
- Model tier usage breakdown

**CONCERT-WORKFLOW-SELF-IMPROVEMENT.md**

- Retrospective analysis
- Lessons learned, cost analysis, process improvements
- Generates CONCERT-IMPROVEMENT.md

---

## Skills

Skills are reusable reference knowledge loaded by agents. They are markdown files
that agents read for guidance — not executable functions.

### Concert Core Skill

**concert-core** — The shared operations skill for all Concert agents.
Contains: boot sequence, state management, `next_action` protocol, commit conventions,
user guidance templates, spec mapping, severity classification, failure recording,
open questions identification. Referenced by every Concert agent via `<skills>` tag.

### Domain Skills (11)

| Skill                            | Purpose                                        | Used By                         |
| -------------------------------- | ---------------------------------------------- | ------------------------------- |
| **typescript-standards**         | Type safety, boundary typing, no-`any` rule    | Coder, code-reviewer            |
| **go-standards**                 | Idiomatic Go, error handling, interfaces       | Coder, code-reviewer            |
| **react-best-practices**         | Component patterns, hooks, rendering           | Coder, code-reviewer            |
| **web-ux-guidelines**            | Accessibility, responsive design, interactions | Designer, coder                 |
| **cli-ux-guidelines**            | Command structure, error messaging, help text  | Designer, coder                 |
| **secure-coding-practices**      | Input validation, auth, secrets management     | Architect, coder, code-reviewer |
| **service-integration-patterns** | API design, retries, health checks             | Architect, coder                |
| **composition-patterns**         | Component composition, module organization     | Architect, coder                |
| **fix-methodology**              | 7-phase error diagnosis framework              | Fix agent                       |
| **agent-authoring**              | How to write Concert agents                    | Meta                            |
| **skill-authoring**              | How to write Concert skills                    | Meta                            |

---

## Mission Documents

### Project-Level Specs (persist across missions, in `.concert/`)

- `VISION-SPEC.md` — Accepted vision (cumulative)
- `REQUIREMENTS-SPEC.md` — Accepted requirements (cumulative)
- `ARCHITECTURE-SPEC.md` — Accepted architecture (cumulative)
- `UX-SPEC.md` — Accepted UX design (cumulative)

### Per-Mission Documents (in `.concert/missions/<slug>/`)

- `VISION.md` — Mission vision draft
- `REQUIREMENTS.md` — Mission requirements draft
- `ARCHITECTURE.md` — Mission architecture draft
- `UX.md` — Mission UX design draft
- `ALIGNMENT.md` — Cross-document alignment concerns

### Execution Artifacts (in `.concert/missions/<slug>/`)

- `phases/` — Task files organized by phase and wave
- `PHASE-SUMMARY-NN.md` — Summary of completed phase
- `VERIFICATION.md` — Requirements verification results
- `COST-REPORT.md` — Model tier usage and cost analysis
- `CONCERT-IMPROVEMENT.md` — Retrospective findings

---

## State Schema

The complete state.json schema (see `src/types.ts` for TypeScript definition):

```jsonc
{
  // Identity
  "mission": "2026-04-01-feature-name",
  "mission_path": ".concert/missions/2026-04-01-feature-name/",
  "workflow": "mission-full",
  "workflow_path": ".concert/workflows/CONCERT-WORKFLOW-MISSION-FULL.md",
  "branch": "concert/feature-name",
  "pr_number": 42,
  "status_display": "wip_pr",
  "feature_size": "large", // "small" | "medium" | "large"

  // Pipeline
  "stage": "architecture",
  "pipeline": {
    "vision": "accepted",
    "requirements": "accepted",
    "architecture": "draft", // "pending" | "draft" | "accepted"
  },

  // Execution progress
  "phases_completed": 0,
  "phases_total": 5,
  "tasks_completed": 0,
  "tasks_total": 12,
  "commits": 0,
  "current_phase": 1, // optional, set during execution
  "current_task_file": "...", // optional, set during execution
  "current_task_index": 0, // optional, set during execution

  // Cost tracking
  "cost": {
    "estimated_remaining": "$12-18",
    "spent_this_mission": "$4.20",
    "by_stage": { "vision": "$0.50", "requirements": "$1.20" },
  },

  // Session continuation (NEW)
  "next_action": {
    "type": "await_user", // "run_agent" | "run_workflow" | "await_user"
    "target": "review",
    "context": {},
    "message": "Architecture ready for review",
  },

  // Active states (nullable — only one active at a time)
  "failure": null, // FailureBlock when task fails
  "debug_state": null, // DebugState during debugging
  "quality_loop_state": null, // QualityLoopState during code review

  // Logs
  "blockers": [],
  "telemetry": [], // TelemetryRecord per completed task
  "failure_log": [], // FailureSummary history
  "history": [], // HistoryEntry audit trail
  "next_steps": [], // Human-readable next steps (legacy, supplemented by next_action)
}
```

### Key State Transitions

```
init       → stage: "vision", pipeline.vision: "draft", next_action: await_user(review)
accept     → pipeline.<stage>: "accepted", stage: <next>, next_action: run_agent or await_user
continue   → reads next_action, dispatches accordingly
execution  → updates current_phase/task_file/task_index, telemetry
failure    → sets failure block, next_action: await_user(debug_or_fix)
debug/fix  → clears failure block, next_action: await_user(continue)
delete     → resets to {}
```
