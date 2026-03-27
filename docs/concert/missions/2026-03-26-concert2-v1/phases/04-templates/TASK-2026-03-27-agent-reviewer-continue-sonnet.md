---
task: "agent-reviewer-continue"
title: "Write agent definitions for concert-reviewer and concert-continue"
depends_on: ["default-state-and-config"]
wave: 1
model: sonnet
---

## Objective

Write the full agent definition markdown files for `concert-reviewer` (the two-phase review agent) and `concert-continue` (the session continuation agent). The reviewer manages the two-phase review flow (user changes first, then reviewer concerns). The continue agent handles crash recovery, cross-environment handoff, and mid-quality-loop resumption.

## Files

- `templates/docs/concert/agents/concert-reviewer.md`
- `templates/docs/concert/agents/concert-continue.md`

## Requirements

- FR-008: Pipeline Stage Execution — Code Execution
- FR-009: Review/Accept/Restart Cycle
- FR-011: Session Continuation
- FR-016: One Question at a Time — Interview Agents
- FR-017: Model Tier Routing
- FR-018: Code Quality Loop
- FR-033: Context Compaction
- FR-036: Interactive Mode Enforcement
- FR-040: Documentation Currency
- Architecture Section 8: Code Quality Loop Architecture
- Architecture Section 10: Cross-Environment Handoff
- UX Section 4.2: Review Flow

## Agent File Format

Same as other agent tasks — managed header, YAML frontmatter, six XML sections.

## Detailed Instructions

### concert-reviewer.md

**Frontmatter:**
- `name: concert-reviewer`
- `description: Two-phase reviewer — applies user changes first, then presents reviewer concerns one at a time`
- `tools: Read, Write, Edit, Bash, Glob, Grep`
- `model: balanced`
- `interactive_only: true`

**Role:** Senior technical reviewer who conducts structured two-phase reviews of planning stage outputs. Respects user priorities by handling their changes first, then presenting its own concerns individually by severity.

**Execution flow (two-phase, detailed):**
1. Check interactive mode — if restricted and not in CC, output redirect message
2. Read state.json to determine current stage and which document to review
3. Read the draft document (VISION.md, REQUIREMENTS.md, ARCHITECTURE.md, UX.md, or task plan)
4. **Phase 1 — User Changes:**
   - Ask: "I've read the [document] draft. Before I share my review, do you have any changes you'd like to make?"
   - If user has changes: apply them one at a time, commit after each change
   - After each change: "Any other changes?"
   - Continue until user says no more changes
5. **Phase 2 — Reviewer Concerns:**
   - Analyze the document for issues
   - Present total count: "I have N concerns to discuss, ordered by importance."
   - Present one concern at a time with counter: `[1/N]`
   - Each concern has: severity label (CRITICAL/IMPORTANT/SUGGESTION), description, concrete suggestion
   - Wait for user response before presenting next concern
   - Apply agreed changes and commit
6. **Task plan review — additional checks (when reviewing tasks stage):**
   - Assess decomposition quality: Are phases logically grouped? Are dependencies minimal and correct? Are wave assignments valid?
   - Assess model tier assignments: Are haiku tasks given sufficient detail to succeed? Are sonnet promotions justified?
   - **Decomposition quality score:** Rate the overall decomposition as GOOD, ACCEPTABLE, or POOR based on:
     - GOOD: Phases are cohesive, dependencies form a clean DAG, model tiers are well-justified, task granularity is appropriate
     - ACCEPTABLE: Minor issues but executable as-is
     - POOR: Significant structural problems — missing dependencies, wrong phase groupings, tasks too large or too small, unclear acceptance criteria
   - If POOR: recommend the user re-run planning with `concert-replan tasks` and suggest upgrading the planner to `model: quality` (opus) for Pass 1 decomposition. Note: this requires splitting the planner into two agents (opus for outline, sonnet for task files), which trades cache efficiency for decomposition quality.
7. Output: "Review complete. All concerns resolved." with next steps

**User guidance:**
- Phase 1 ALWAYS comes first, even if reviewer has critical concerns
- One concern at a time with counter — user always knows how many remain
- Commits happen after changes are applied, not batched at the end
- Concerns are ordered by severity: CRITICAL > IMPORTANT > SUGGESTION
- When reviewing task plans, always include the decomposition quality score

**Boundaries:**
- Does NOT accept stages — only reviews them
- Does NOT advance the pipeline
- Does NOT modify state.json pipeline status
- Refuses to run in non-interactive environments

### concert-continue.md

**Frontmatter:**
- `name: concert-continue`
- `description: Universal continuation — detects state, advances stages, orchestrates execution, resumes after crashes`
- `tools: Read, Write, Edit, Bash, Glob, Grep, Task`
- `model: balanced`
- `interactive_only: false`

**Role:** The universal "do the next thing" agent. Reads state.json to detect the current position and takes the appropriate action: advance to the next pipeline stage, start or resume task execution (orchestrating the code quality loop), or recover from crashes and cross-environment handoffs. Contains ONLY orchestration logic — coder and reviewer behaviors live in separate agent files (`concert-coder.md`, `concert-code-reviewer.md`) loaded on-demand.

**Execution flow — state detection then action:**

1. Read state.json completely
2. Detect the current state and determine action:

   **If a stage was just accepted (pipeline has an accepted stage with no next stage started):**
   - Advance `stage` to the next pipeline stage per the workflow
   - Output status and next steps for the new stage

   **If failure block exists:**
   - Assess whether to retry the failed task or suggest debugging
   - If retrying: clear failure block, resume from the failed task
   - If complex: suggest `concert-debug`

   **If quality_loop_state exists:**
   - Resume the code quality loop at the exact position
   - If `phase: "coder"`: spawn coder with prior_findings from previous iterations
   - If `phase: "reviewer"`: spawn reviewer for the current iteration
   - Preserve prior_findings and coder_commits — do NOT restart the loop

   **If mid-execution (tasks_completed < tasks_total):**
   - Determine current phase and task position
   - Resume execution using the orchestrator logic below

   **If in planning stage (pipeline has a "draft" stage):**
   - Suggest `concert-review` or `concert-accept` for the draft stage

   **If all stages accepted but tasks not planned:**
   - Suggest `concert-plan`

   **If execution complete (tasks_completed == tasks_total):**
   - Suggest `concert-verify`

3. During execution: update state.json continuously for crash safety
4. Write next_steps for the NEXT continuation session (assume it may crash)

**Execution orchestration (when state indicates execution is active):**

The orchestrator is lean — it manages task ordering, state, and quality loop decisions. Coder and reviewer behaviors are in separate agent files:

| Agent file | Purpose | Loaded when |
|------------|---------|-------------|
| `concert-continue.md` | Orchestration: task ordering, state, quality loop decisions, telemetry | Always (it's the entry point) |
| `concert-coder.md` | TDD implementation: read task, write tests, implement, verify, commit | When it's time to code a task |
| `concert-code-reviewer.md` | Code review: read diff against acceptance criteria, rate findings by severity | When it's time to review a task |

How these are invoked depends on the environment:

| Environment | How orchestrator uses coder/reviewer |
|-------------|--------------------------------------|
| Claude Code | Spawn coder as subagent (Task tool) with `concert-coder.md` instructions. Spawn reviewer as subagent with `concert-code-reviewer.md` instructions. Orchestrator stays lean at ~15% context. |
| GitHub Agents UI | Read `concert-coder.md` on demand when entering coder mode. After coding, read `concert-code-reviewer.md` when entering reviewer mode. Earlier instructions get compressed by Claude's context management. |

**Task execution loop (per task):**
   a. Read task file frontmatter for model tier and task content
   b. Resolve model tier via `concert.jsonc` → `model_tiers`
   c. Identify applicable skill file paths from task's Skills section
   d. **Enter coder mode:**
      - **Claude Code:** Spawn coder subagent with task file content (pre-loaded), skill file paths, model tier, and instruction to read `concert-coder.md`
      - **GitHub:** Read `concert-coder.md`, then implement the task following those instructions
      - Coder reads skills and codebase files (cached in prefix for iterations)
      - Coder implements TDD: tests first, implement, verify
      - Coder commits with conventional commit format
      - Coder returns: commit SHA, confidence level, files changed
   e. **Enter reviewer mode (fresh each iteration):**
      - **Claude Code:** Spawn fresh reviewer subagent with task file content, diff, and instruction to read `concert-code-reviewer.md`
      - **GitHub:** Read `concert-code-reviewer.md`, then review the diff
      - Reviewer rates findings: CRIT, MAJ, MIN, NTH, or PASS
      - Reviewer returns structured findings
   f. **Quality loop decision (always orchestrator logic):**
      - PASS (zero findings): proceed to next task
      - CRIT/MAJ findings AND iteration < max_review_iterations:
        **Claude Code:** CONTINUE the same Coder (SendMessage) with findings — coder's context is cached
        **GitHub:** Continue in the same conversation with findings — context already loaded
      - After max iterations with only MIN/NTH remaining: proceed with success
      - After max iterations with CRIT/MAJ remaining: stop with failure
   g. Update state.json: tasks_completed++, telemetry record, history entry
   h. Update PHASE-SUMMARY

**Phase completion:**
   a. After all tasks in phase: spawn/invoke Documentation Agent to update higher-level docs
   b. Mark phase complete
   c. Update WIP PR body

**On failure:** Write failure block to state.json, stop immediately

**Cache optimization rationale:**

| Subagent | Lifecycle | Why |
|----------|-----------|-----|
| Coder | Spawn once per task, continue across iterations (CC) / single context (GitHub) | Task file + skills + codebase stay cached. SendMessage adds only the reviewer findings. |
| Reviewer | Fresh spawn each iteration (CC) / re-read agent file each iteration (GitHub) | Each iteration reviews a different diff. Prior diffs in context could confuse the review. Reviewer context is lightweight. |
| Documentation Agent | Fresh spawn per phase | Runs once after all tasks. Reads PHASE-SUMMARY + commits. No iteration loop. |

**What the orchestrator pre-loads vs. what coder/reviewer reads:**

| Content | Who reads it | Why |
|---------|-------------|-----|
| Task file content | Orchestrator reads, passes to coder/reviewer | Orchestrator already reads it for model tier. Avoids one Read call per subagent. |
| Coder/reviewer agent file | Coder/reviewer reads on demand | Keeps orchestrator lean. Agent instructions loaded only when needed. |
| Skill file paths | Orchestrator passes paths, coder reads content | Skills can be large. Coder reads once, cached for iterations. |
| Codebase files | Coder reads as needed | Coder discovers which files to modify during implementation. |
| Diff | Orchestrator computes (git diff), passes to reviewer | Reviewer doesn't need git access. |

**State management detail:**
- After each task completion: update state.json and commit
- quality_loop_state is written to state.json when the loop is in progress (for crash recovery)
- quality_loop_state tracks the coder's agent ID (CC only) so `concert-continue` can attempt to resume
- quality_loop_state is cleared when the task completes

**Environment detection:**
- If Task tool is available: Claude Code — spawn subagents with model routing and SendMessage continuation
- If Task tool is not available: GitHub Agents UI — operate in single-agent mode, reading coder/reviewer agent files on demand

**Cross-environment handoff handling:**
- Detect if the branch has uncommitted work (from the previous environment)
- Assess uncommitted work state and either incorporate or continue from last committed point
- Output handoff context: "Resuming from cross-environment handoff. Last environment: [env]. Last action: [action]."

**Operating principles:**
- Always start by reading state.json — never assume state
- Orchestrator contains ONLY orchestration logic — coder and reviewer behaviors are in separate agent files
- Fresh coder per task, CONTINUED coder across iterations — maximize cache hits within a task
- Fresh reviewer per iteration — keep review context clean
- Orchestrator stays lean — passes file content and paths, does not accumulate subagent output
- State committed after every task — at most one task of work lost on crash
- Failure stops execution immediately — no skipping ahead
- Preserve quality_loop_state across continuations — never restart loops
- Support `--max-iterations N` flag to extend quality loop iterations for a stuck task
- Write next_steps that are useful even if this session also crashes
- PHASE-SUMMARY updated after each task file, finalized at phase completion

**Boundaries:**
- Does NOT start new missions — only continues existing ones
- Does NOT skip tasks or phases
- Does NOT modify approved mission documents
- Does NOT contain coder or reviewer instructions — those live in `concert-coder.md` and `concert-code-reviewer.md`
- Does NOT plan tasks — only executes planned tasks
- Does NOT modify task files
- Does NOT skip the quality loop for any task
- Respects the same quality loop rules defined in CONCERT-WORKFLOW-CODE-QUALITY.md

## Acceptance Criteria

- [ ] `concert-reviewer.md` includes the complete two-phase review flow
- [ ] `concert-reviewer.md` enforces Phase 1 (user changes) before Phase 2 (reviewer concerns)
- [ ] `concert-reviewer.md` includes one-at-a-time concern presentation with counter
- [ ] `concert-reviewer.md` includes task plan decomposition quality scoring (GOOD/ACCEPTABLE/POOR)
- [ ] `concert-reviewer.md` includes recommendation to upgrade planner to opus if decomposition is POOR
- [ ] `concert-reviewer.md` includes interactive mode detection
- [ ] `concert-continue.md` includes exhaustive state detection for all possible states
- [ ] `concert-continue.md` includes stage advancement after acceptance
- [ ] `concert-continue.md` includes the full code quality loop with all decision branches
- [ ] `concert-continue.md` documents coder continuation (SendMessage) across iterations instead of respawning
- [ ] `concert-continue.md` documents why reviewers are fresh-spawned each iteration (different diffs)
- [ ] `concert-continue.md` includes the pre-loading table (what orchestrator reads vs. subagents)
- [ ] `concert-continue.md` references `concert-coder.md` and `concert-code-reviewer.md` (does NOT inline their instructions)
- [ ] `concert-continue.md` includes state management and crash recovery details
- [ ] `concert-continue.md` includes environment detection logic (Task tool presence)
- [ ] `concert-continue.md` includes documentation agent spawning after phase completion
- [ ] `concert-continue.md` includes quality_loop_state resumption logic
- [ ] `concert-continue.md` includes cross-environment handoff detection
- [ ] `concert-continue.md` includes --max-iterations flag support
- [ ] Both files follow the agent file format exactly
- [ ] Both files start with the managed header

## Skills

- docs/concert/skills/agent-authoring/SKILL.md
