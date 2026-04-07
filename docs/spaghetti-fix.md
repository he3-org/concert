# Spaghetti Fix — Concert Refactored Architecture

This document defines the **target architecture** after refactoring. It clarifies what a
Command, Workflow, Agent, and Skill are, eliminates duplication, and establishes clean
boundaries between every moving part.

---

## Table of Contents

1. [Definitions](#definitions)
2. [Information Passing](#information-passing)
3. [Stages & Capabilities Matrix](#stages--capabilities-matrix)
4. [Mission Documents](#mission-documents)
5. [Skills](#skills)
6. [Commands](#commands)
7. [Workflows](#workflows)
8. [Agents](#agents)
9. [Key Differences from Current Architecture](#key-differences-from-current-architecture)

---

## Definitions

### Command

A **command** is a thin entry point. It reads zero or one argument, then dispatches to
exactly one workflow or one agent. Commands contain **no logic** — no conditionals, no
loops, no state reading. They exist only so the user has a verb to type.

- Claude Code: `/concert:<name>`
- GitHub Copilot: `@concert-<name>`

### Workflow

A **workflow** is an ordered sequence of steps. Each step calls an agent, a sub-workflow,
or a skill. Workflows own the orchestration logic — conditionals, loops, branching,
retries. Workflows **never** modify files or run tools directly; they delegate all
side-effects to agents.

### Agent

An **agent** is a specialist that does work. It reads context, modifies documents or code,
updates state, and commits. Agents **never** contain multi-step orchestration logic — they
do one job well and report the result. If an agent needs something reusable (formatting,
state queries, schema lookups), it calls a skill.

### Skill

A **skill** is a reusable function. It takes inputs, returns outputs, and has **no
side-effects** on mission state. Skills are the shared library — any agent or workflow can
call them. Skills replace copy-pasted logic that currently lives across 23 agent files.

---

## Information Passing

### The Context Blackboard

All inter-agent and inter-workflow communication flows through the **Context Blackboard**
— a combination of two mechanisms:

| Mechanism             | What                                                                                              | Who writes                  | Who reads                            | Lifetime                 |
| :-------------------- | :------------------------------------------------------------------------------------------------ | :-------------------------- | :----------------------------------- | :----------------------- |
| **state.json**        | Pipeline position, execution progress, failure blocks, telemetry, history, cost, next action hint | Any agent (via State Skill) | Any agent/workflow (via State Skill) | Persists across sessions |
| **Mission documents** | VISION.md, REQUIREMENTS.md, ARCHITECTURE.md, UX.md, ALIGNMENT.md, TASK files, PHASE-SUMMARY files | Planning & execution agents | Downstream agents                    | Persists in git          |

### The `next_action` Field

To pass intent between workflows and agents across session boundaries, `state.json`
includes a structured `next_action` hint:

```jsonc
{
  "next_action": {
    "type": "run_agent", // "run_agent" | "run_workflow" | "await_user"
    "target": "concert-analyst", // agent or workflow name
    "context": {
      // optional key-value pairs for the target
      "stage": "requirements",
      "resume_from": "step_3",
    },
    "message": "Requirements analysis ready to begin",
  },
}
```

**Rules:**

- Every agent writes a `next_action` before completing
- The Continue Workflow reads `next_action` to decide what to do next
- `await_user` means "stop and show status" — the user must invoke the next command
- This replaces the current ad-hoc decision tree in concert-continue

### Boot Sequence (All Agents)

Every agent begins execution by calling the **Boot Skill**, which returns a standardized
context object. Agents never read state.json directly — they go through the skill.

---

## Stages & Capabilities Matrix

### Pipeline Stages

| Order | Stage         | Agent                                | Triggers Review | Produces Spec        | Interactive |
| :---- | :------------ | :----------------------------------- | :-------------- | :------------------- | :---------- |
| 1     | Vision        | Init Agent                           | Yes             | VISION-SPEC.md       | Yes         |
| 2     | Requirements  | Analyst Agent                        | Yes             | REQUIREMENTS-SPEC.md | No          |
| 3     | Architecture  | Architect Agent                      | Yes             | ARCHITECTURE-SPEC.md | No          |
| 4     | UX            | Designer Agent                       | Yes             | UX-SPEC.md           | No          |
| 5     | Tasks         | Planner Agent                        | Yes             | —                    | No          |
| 6     | Execution     | Coder Agent (via Execution Workflow) | No              | —                    | No          |
| 7     | Verification  | Verifier Agent                       | No              | —                    | Yes         |
| 8     | Refactoring   | Refactorer Agent                     | No              | —                    | No          |
| 9     | Retrospective | Retrospective Agent                  | No              | —                    | No          |

### Workflow Variants

| Variant        | Stages Included                                |
| :------------- | :--------------------------------------------- |
| mission-full   | All 9                                          |
| mission-medium | Skip UX (8 stages)                             |
| mission-small  | Skip Requirements, Architecture, UX (6 stages) |

### Stage × Feature Matrix

| Stage         | Review Workflow | Accept Workflow | Produces Spec | Has Sub-Workflow         |
| :------------ | :-------------- | :-------------- | :------------ | :----------------------- |
| Vision        | Yes             | Yes             | Yes           | No                       |
| Requirements  | Yes             | Yes             | Yes           | No                       |
| Architecture  | Yes             | Yes             | Yes           | No                       |
| UX            | Yes             | Yes             | Yes           | No                       |
| Tasks         | Yes             | Yes             | No            | No                       |
| Execution     | No              | No              | No            | Yes (Execution Workflow) |
| Verification  | No              | No              | No            | No                       |
| Refactoring   | No              | No              | No            | No                       |
| Retrospective | No              | No              | No            | No                       |

---

## Mission Documents

### Project-Level Specs (persist across missions)

`VISION-SPEC.md`, `REQUIREMENTS-SPEC.md`, `ARCHITECTURE-SPEC.md`, `UX-SPEC.md`

### Per-Mission Documents (in `.concert/missions/<slug>/`)

`VISION.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `UX.md`, `ALIGNMENT.md`

### Execution Artifacts

`phases/`, `PHASE-SUMMARY-NN.md`, `VERIFICATION.md`, `COST-REPORT.md`, `CONCERT-IMPROVEMENT.md`

---

## Skills

Skills are reusable, side-effect-free functions. They replace the copy-pasted logic
scattered across 23 agent files.

### Boot Skill

```
Boot Skill (agent_type)
  - Read .concert/state.json
  - Read .concert/stage-registry.jsonc
  - Determine current stage, mission_path, workflow
  - Based on agent_type, load additional context:
      "minimal"  → state + registry only
      "planning" → + workflow file + all upstream mission docs + project specs
      "execution"→ + current TASK file + applicable skills
      "review"   → + current stage document + ALIGNMENT.md
  - Return structured context object:
      { state, stage, mission_path, workflow, documents[], skills[] }
```

**Replaces:** Copy-pasted boot sequence in 23 agent files.

### State Skill

```
State Skill

  read()
    - Parse .concert/state.json with defaults for missing fields
    - Return state object

  write(updates)
    - Deep-merge updates into current state
    - Atomic write (temp file + rename)
    - Return updated state

  advance_stage(current_stage)
    - Look up next stage in workflow variant from stage-registry
    - Update pipeline.<current_stage> = "accepted"
    - Update stage = <next_stage>
    - Update pipeline.<next_stage> = "pending"
    - Write next_action hint
    - Return { previous_stage, next_stage }

  record_failure(failure_block)
    - Write failure block to state.failure
    - Append to state.failure_log[]
    - Set next_action = { type: "await_user", message: "Failure recorded" }

  record_telemetry(entry)
    - Append telemetry record to state.telemetry[]
    - Append history entry to state.history[]

  set_next_action(action)
    - Write next_action to state
    - Validates action has required fields (type, target)
```

**Replaces:** Inline state reading/writing in every agent.

### Status Skill

```
Status Skill (state)
  - Read stage-registry.jsonc for stage display names and order
  - Build pipeline display:
      For each stage in active workflow variant:
        icon = ✅ if accepted, 📝 if draft, ⏳ if pending, ▶️ if current
        line = "{icon} {display_name}"
  - If before execution stage:
      Count open questions (❓) in each mission document
      Append: "❓ Open Questions: Vision: N, Requirements: N, ..."
  - Build next steps from stage-registry:
      Look up current stage → determine recommended action
      Format as copypasta with both CLI and Copilot syntax
  - Return formatted status text
```

**Replaces:** Inline status formatting in concert-status, concert-continue, and others.

### User Guidance Skill

```
User Guidance Skill (template_name, variables)
  - Read .concert/templates/user-guidance.md
  - Find template section matching template_name
  - Substitute {variable} placeholders with provided values
  - Ensure both /concert:X and @concert-X are present
  - Return formatted guidance text
```

**Replaces:** Ad-hoc next-steps formatting across 23 agents.

### Spec Mapping Skill

```
Spec Mapping Skill (stage_name)
  - Read stage-registry.jsonc
  - Look up stage by name
  - Return:
      { produces_spec, spec_path, output_template, triggers_review, agent }
  - If produces_spec is null, return null for spec_path
```

**Replaces:** Hardcoded stage→spec mappings in concert-accept, concert-reviewer, and others.

### Commit Skill

```
Commit Skill (type, scope, description, files[])
  - Stage files (git add)
  - Format message: "{type}({scope}): {description}"
  - Commit with conventional commit format
  - Return { commit_hash, commit_message }
```

**Replaces:** Inline git commit logic in concert-coder, concert-fix, concert-quick, etc.

### Severity Skill

```
Severity Skill

  classify(finding)
    - Apply severity rules:
        CRITICAL → blocks merge, security/data-loss risk
        MAJOR    → blocks merge, correctness/reliability risk
        MINOR    → should fix, style/maintainability
        NICE     → optional improvement
    - Return { severity, reasoning }

  should_block(findings[])
    - Return true if any CRITICAL or MAJOR findings exist
    - Return { blocked, critical_count, major_count, minor_count, nice_count }
```

**Replaces:** Duplicated severity definitions in concert-code-reviewer, concert-refactorer, concert-fix.

### Failure Skill

```
Failure Skill

  record(error_type, error_summary, context)
    - Build failure block:
        { phase, task_file, task_index, failed_at, error_type, error_summary }
    - Call State Skill → record_failure(block)
    - Return recovery guidance from User Guidance Skill ("Failure Recovery" template)

  get_current()
    - Read state.failure
    - Return failure block or null
```

**Replaces:** Inline failure recording in concert-coder, concert-continue, concert-fix, concert-debug.

### Open Questions Skill

```
Open Questions Skill (mission_path)
  - For each mission document (VISION.md, REQUIREMENTS.md, etc.):
      Count lines matching ❓ pattern
  - Also scan ALIGNMENT.md for unresolved items
  - Return { per_document: { "VISION.md": N, ... }, total: N }
```

**Replaces:** Ad-hoc question counting in concert-reviewer, concert-status.

### Domain Skills (Unchanged)

The following domain skills remain as-is — they provide language/framework expertise:

- **typescript-standards** — TypeScript type safety and patterns
- **go-standards** — Go language conventions
- **react-best-practices** — React component and state patterns
- **web-ux-guidelines** — Web accessibility and UX
- **cli-ux-guidelines** — CLI output and interaction patterns
- **composition-patterns** — Component composition patterns
- **service-integration-patterns** — External service integration
- **secure-coding-practices** — Security patterns
- **fix-methodology** — Error diagnosis framework (used by Fix Agent)
- **agent-authoring** — Agent file structure guide
- **skill-authoring** — Skill file structure guide

---

## Commands

Every command is a one-liner that dispatches to a workflow or agent. No logic.

### Init Command

```
Init Command [prompt?]
  → Run Init Workflow (prompt)
```

### Continue Command

```
Continue Command
  → Run Continue Workflow
```

### Review Command [stage?]

```
Review Command [stage?]
  → Run Review Workflow (stage)
```

### Accept Command

```
Accept Command
  → Run Accept Workflow
```

### Restart Command [stage?]

```
Restart Command [stage?]
  → Run Restart Workflow (stage)
```

### Replan Command [stage]

```
Replan Command [stage]
  → Run Replan Workflow (stage)
```

### Fix Command [issue?]

```
Fix Command [issue?]
  → Run Fix Agent (issue)
```

### Debug Command [issue?]

```
Debug Command [issue?]
  → Run Debug Agent (issue)
```

### Quick Command [task]

```
Quick Command [task]
  → Run Quick Agent (task)
```

### Verify Command

```
Verify Command
  → Run Verify Workflow
```

### Status Command

```
Status Command
  → Run Status Agent
```

### Delete Command

```
Delete Command
  → Run Delete Agent
```

### Push Command

```
Push Command
  → Run Push Agent
```

---

## Workflows

Workflows own orchestration: sequencing, branching, looping, retries.

### Init Workflow

```
Init Workflow (prompt?)
  1. Run Init Agent (prompt)
       → Agent interviews user (or reads prompt)
       → Agent creates VISION.md
       → Agent creates mission folder, branch, PR
       → Agent writes state.json with stage="vision", pipeline.vision="draft"
  2. Call User Guidance Skill ("Mission Initialized", variables)
  3. Call State Skill → set_next_action:
       { type: "await_user", target: "review", message: "Vision ready for review" }
```

### Continue Workflow

```
Continue Workflow
  1. Call Boot Skill ("minimal")
  2. Call State Skill → read()
  3. Read next_action from state:

     IF next_action.type == "run_agent":
       → Spawn agent named next_action.target with next_action.context
       → Done (agent sets its own next_action before completing)

     IF next_action.type == "run_workflow":
       → Run workflow named next_action.target with next_action.context
       → Done

     IF next_action.type == "await_user":
       → Call Status Skill → display current status
       → Show next_action.message
       → Done (user must invoke next command)

     IF next_action is empty (legacy / first session):
       → Determine action from state:
           IF no mission → show "Run /concert:init"
           IF current stage has no document yet → spawn stage agent
           IF current stage document is draft → show "Run /concert:review or /concert:accept"
           IF mid-execution → Run Execution Workflow (resume)
       → Write next_action before completing
```

### Review Workflow

```
Review Workflow (stage?)
  1. Call Boot Skill ("review")
  2. IF stage not provided → use current stage from state
  3. Call Spec Mapping Skill (stage) → get document_path, agent
  4. IF stage does not trigger review → error: "Stage {stage} does not have a review step"
  5. Initialize modified_documents = []

  — Phase 1: Pre-Review User Input —
  6. Ask user: "Do you have any changes or questions before we review the open questions?"
  7. IF yes:
       → Resolve the user's input (apply changes, answer questions)
       → Track any documents modified → append to modified_documents
       → Go to step 6 (ask again until user has no more changes)
  8. ELSE: continue

  — Phase 2: Open Questions Resolution —
  9. FOR each mission document in workflow stage order
     (VISION.md, REQUIREMENTS.md, ARCHITECTURE.md, UX.md, ALIGNMENT.md):
       a. Call Open Questions Skill → get open questions for this document
       b. IF no open questions → continue to next document
       c. FOR each open question in the document (one at a time):
            - Present the question to the user
            - Gather user's response
            - Resolve the question and update the document
            - Track document as modified → append to modified_documents (if not already)
       d. Continue to next document

  — Phase 3: Post-Review User Input —
  10. Ask user: "Do you have any changes or questions before we complete this round of review?"
  11. IF yes:
        → Resolve the user's input (apply changes, answer questions)
        → Track any documents modified → append to modified_documents
        → Go to step 10 (ask again until user has no more changes)
  12. ELSE: continue

  — Phase 4: Automated Agentic Re-Review —
  13. FOR each document in modified_documents (excluding ALIGNMENT.md):
        → Look up specialist agent for that document from stage-registry
        → Run specialist agent in re-review mode:
            Purpose: find any new concerns arising from the modifications
            New concerns become new open questions added to the document
  14. After all specialist re-reviews complete:
        → Re-review ALL mission documents (excluding ALIGNMENT.md)
            for new alignment concerns
        → Any new alignment concerns become new open questions
            added to ALIGNMENT.md

  — Phase 5: Breakpoint & Status —
  15. Call Commit Skill ("docs", stage, "incorporate review feedback")
  16. Call Open Questions Skill (mission_path) → get updated counts
  17. Call State Skill → write any pending updates (counts, status)
  18. Call User Guidance Skill ("Review Complete", { open_question_count })
        → Present current status with updated open question counts
        → Provide guidance for next steps:
            IF open_question_count > 0:
              → Suggest running Review again to resolve new questions
            ELSE:
              → Suggest running Accept to proceed
  19. Call State Skill → set_next_action:
        { type: "await_user", target: "review_or_accept",
          message: "Review round complete" }
```

### Accept Workflow

```
Accept Workflow
  1. Call Boot Skill ("minimal")
  2. Read current stage from state
  3. Call Spec Mapping Skill (stage)
  4. IF stage produces a spec:
       → Run Accept Agent (stage, spec_path)
           Agent copies mission document to project-level spec
           Agent updates pipeline status
  5. ELSE:
       → Run Accept Agent (stage, null)
           Agent marks stage accepted without creating spec
  6. Call State Skill → advance_stage(stage)
  7. Determine what comes next:
       IF next stage has an agent and is not interactive:
         → set_next_action: { type: "run_agent", target: next_agent }
       ELSE:
         → set_next_action: { type: "await_user", message: "Stage accepted" }
  8. Call Commit Skill ("docs", stage, "accept {stage}")
  9. Call User Guidance Skill ("Stage Accepted", variables)
```

### Restart Workflow

```
Restart Workflow (stage?)
  1. Call Boot Skill ("minimal")
  2. IF stage not provided → use current stage from state
  3. Validate stage is in draft or accepted state
  4. Delete stage output document(s) from mission folder
  5. Call State Skill → write:
       pipeline.<stage> = "pending"
       stage = <stage>
  6. Look up agent from stage-registry
  7. Call State Skill → set_next_action:
       { type: "run_agent", target: agent }
  8. IF auto_continue enabled:
       → Spawn the agent immediately
  9. ELSE:
       → Call User Guidance Skill ("Restart Complete")
```

### Replan Workflow

```
Replan Workflow (target_stage)
  1. Call Boot Skill ("minimal")
  2. Validate target_stage exists and is before current stage
  3. For each stage from target_stage to current stage:
       → Set pipeline.<stage> = "pending"
       → Delete stage output document (keep committed code)
  4. Call State Skill → write:
       stage = target_stage
  5. Look up agent for target_stage from stage-registry
  6. Call State Skill → set_next_action:
       { type: "run_agent", target: agent }
  7. IF auto_continue enabled:
       → Spawn the agent immediately
  8. ELSE:
       → Call User Guidance Skill ("Replan Complete")
```

### Verify Workflow

```
Verify Workflow
  1. Call Boot Skill ("minimal")
  2. Run Verifier Agent
       → Agent reads REQUIREMENTS-SPEC.md + PHASE-SUMMARY files
       → Agent generates VERIFICATION.md and COST-REPORT.md
  3. IF verification passes:
       → Call State Skill → advance_stage("verification")
       → set_next_action: { type: "run_agent", target: "concert-refactorer" }
  4. IF verification finds gaps:
       → Create gap-closure tasks
       → set_next_action: { type: "run_workflow", target: "execution", context: { gap_tasks } }
  5. Call User Guidance Skill ("Verification Complete", { result, pass_rate })
```

### Execution Workflow

```
Execution Workflow (resume_context?)
  1. Call Boot Skill ("execution")
  2. Read phase/wave/task structure from mission_path/phases/
  3. IF resume_context → fast-forward to resume point

  4. FOR each phase (in order):
       FOR each wave in phase (waves execute sequentially, tasks within wave can parallelize):
         FOR each task in wave:
           a. Run Code Quality Sub-Workflow (task_file)
           b. Call State Skill → record_telemetry(task_result)
           c. Call State Skill → write({ tasks_completed++ })
           d. IF task failed:
                → Call Failure Skill → record(error)
                → STOP execution
                → set_next_action: { type: "await_user", message: "Task failed" }
                → EXIT

       → After all waves in phase complete:
           Run Documenter Agent (phase_number)
           Call State Skill → write({ phases_completed++, current_phase++ })

  5. After all phases complete:
       → Call State Skill → advance_stage("execution")
       → set_next_action: { type: "run_agent", target: "concert-verifier" }
       → Call User Guidance Skill ("Execution Complete")
```

### Code Quality Sub-Workflow

```
Code Quality Sub-Workflow (task_file)
  1. Run Coder Agent (task_file)
       → Agent writes tests, implements, commits
       → Agent reports { confidence, commit_hash, files_changed }

  2. Run Code Reviewer Agent (task_file, commit_hash)
       → Agent reviews diff against acceptance criteria
       → Agent reports { findings[], verdict: pass|fail }

  3. IF verdict == "fail" AND iteration < max_review_iterations:
       → Pass findings to Coder Agent as revision context
       → Go to step 1 (retry with findings)

  4. IF verdict == "fail" AND iteration >= max_review_iterations:
       → Log warning: "Max review iterations reached"
       → Accept with noted findings

  5. IF verdict == "pass":
       → Return { success: true, iterations, findings_summary }
```

### Fix Workflow (Standalone)

```
Fix Workflow (issue?)
  1. Call Boot Skill ("execution")
  2. Run Fix Agent (issue)
       → Agent uses Fix Methodology Skill internally
       → Agent reproduces, diagnoses, assesses, implements, self-reviews
       → Agent writes regression test
       → Agent commits fix
  3. IF fix agent recommends refactoring:
       → Append to .concert/CONCERT-RECOMMENDS.md
  4. Call User Guidance Skill ("Fix Complete" or "Fix Escalated")
  5. Call State Skill → set_next_action based on result
```

---

## Agents

Agents do one job. They read context (via Boot Skill), do work, write results, and report.
No orchestration logic.

### Init Agent

```
Init Agent (prompt?)
  1. Call Boot Skill ("planning")
  2. IF prompt provided:
       → Parse prompt for feature description and size
  3. ELSE (interactive):
       → Interview user ONE QUESTION AT A TIME:
           "What problem does this solve?"
           "Who is the target user?"
           "What is the expected scope?" (propose feature size)
  4. Create mission slug: YYYY-MM-DD-<kebab-name>
  5. Create mission folder: .concert/missions/<slug>/
  6. Create branch: concert/<slug>
  7. Write VISION.md to mission folder using inputs
  8. Read existing project specs for context enrichment
  9. Call State Skill → write:
       { mission, mission_path, branch, workflow, stage: "vision",
         pipeline: { vision: "draft" }, feature_size }
  10. Create WIP PR
  11. Call Commit Skill ("docs", "vision", "initialize mission")
  12. Call State Skill → set_next_action:
        { type: "await_user", target: "review" }
  13. Return { mission_path, branch, pr_number }
```

### Analyst Agent

```
Analyst Agent
  1. Call Boot Skill ("planning")
       → Receives: state, VISION.md, VISION-SPEC.md, existing REQUIREMENTS-SPEC.md
  2. Scan codebase for existing patterns and constraints
  3. Transform vision into structured requirements:
       - Functional requirements (FR-001, FR-002, ...)
       - Non-functional requirements (NFR-001, ...)
       - Data requirements (DR-001, ...)
       - Integration requirements (IR-001, ...)
       - Each with testable acceptance criteria
  4. Write REQUIREMENTS.md to mission folder
  5. Call State Skill → write:
       { pipeline: { requirements: "draft" } }
  6. Call Commit Skill ("docs", "requirements", "draft requirements")
  7. Call State Skill → set_next_action:
       { type: "await_user", target: "review" }
  8. Return { document_path, confidence }
```

### Architect Agent

```
Architect Agent
  1. Call Boot Skill ("planning")
       → Receives: state, VISION.md, REQUIREMENTS.md, existing specs, codebase context
  2. Design system architecture:
       - System overview and component diagram
       - Tech stack with rationale
       - Component design and boundaries
       - Data model
       - API design
       - Error handling strategy
       - Security considerations
       - Performance targets
  3. Identify Suggested New Skills:
       - Review the architecture for technologies, services, programming languages,
         frameworks, and tools that will be used
       - Compare against existing Concert skills (from .claude/skills/)
       - For each technology/service/language not covered by an existing skill:
           List as a suggested new skill with rationale
       - Write the "Suggested New Skills" section in ARCHITECTURE.md
         (placed before the Open Questions section)
  4. Write ARCHITECTURE.md to mission folder
  5. Call State Skill → write:
       { pipeline: { architecture: "draft" } }
  6. Call Commit Skill ("docs", "architecture", "draft architecture")
  7. Call State Skill → set_next_action:
       { type: "await_user", target: "review" }
  8. Return { document_path, confidence }
```

### Designer Agent

```
Designer Agent
  1. Call Boot Skill ("planning")
       → Receives: all mission docs, project specs, platform UX skills
  2. Load platform-specific skills from concert.jsonc → project.platforms
  3. Design UX:
       - User flows
       - Information architecture
       - Component specifications
       - Interaction patterns
       - Accessibility requirements
       - Platform conventions
  4. Identify Suggested New Skills:
       - Review the UX design for technologies, UI frameworks, design systems,
         accessibility tools, and platform-specific patterns that will be used
       - Compare against existing Concert skills (from .claude/skills/)
       - For each technology/tool/pattern not covered by an existing skill:
           List as a suggested new skill with rationale
       - Write the "Suggested New Skills" section in UX.md
         (placed before the Open Questions section)
  5. Write UX.md to mission folder
  6. Call State Skill → write:
       { pipeline: { ux: "draft" } }
  7. Call Commit Skill ("docs", "ux", "draft UX design")
  8. Call State Skill → set_next_action:
       { type: "await_user", target: "review" }
  9. Return { document_path, confidence }
```

### Planner Agent

```
Planner Agent
  1. Call Boot Skill ("planning")
       → Receives: all mission docs, all project specs, codebase context
  2. Break work into phases:
       - Each phase has a clear milestone
       - Each phase contains waves (dependency-ordered groups)
       - Each wave contains TASK files
  3. For each TASK file:
       - Define acceptance criteria from requirements
       - Assign lowest viable model tier (haiku > sonnet > opus)
       - List skills to apply (from .claude/skills/)
       - List file paths likely to be touched
       - Add extra detail for haiku-tier tasks (compensate for smaller model)
  4. Write phases/ directory structure to mission folder
  5. Call State Skill → write:
       { pipeline: { tasks: "draft" }, phases_total, tasks_total }
  6. Call Commit Skill ("docs", "tasks", "create task plan")
  7. Call State Skill → set_next_action:
       { type: "await_user", target: "review" }
  8. Return { phases_count, tasks_count, estimated_cost }
```

### Coder Agent

```
Coder Agent (task_file)
  1. Call Boot Skill ("execution")
       → Receives: state, task file content, applicable skills
  2. Load skills specified in task file
  3. TDD cycle:
       a. Write failing test(s) matching acceptance criteria
       b. Implement code to make tests pass
       c. Run full test suite
       d. IF tests fail → iterate on implementation
  4. Call Commit Skill (type, scope, description)
  5. Return { confidence, commit_hash, files_changed[], test_count }
```

### Code Reviewer Agent

```
Code Reviewer Agent (task_file, commit_hash)
  1. Call Boot Skill ("execution")
  2. Read task file for acceptance criteria
  3. Read git diff for commit
  4. Load applicable domain skills
  5. Review against:
       - Correctness and completeness
       - Test coverage and quality
       - Security (via secure-coding-practices skill)
       - Error handling
       - Performance
       - Acceptance criteria match
  6. For each finding → Call Severity Skill → classify(finding)
  7. Call Severity Skill → should_block(all_findings)
  8. Return { verdict: pass|fail, findings[], summary }
```

### Reviewer Agent

```
Reviewer Agent (document_path, mode)
  — mode: "interactive" (user-facing) or "re-review" (automated) —

  IF mode == "interactive":
    1. Call Boot Skill ("review")
    2. Present document to user
    3. Gather feedback interactively:
         - Present one concern at a time
         - User can: approve, request change, ask question, skip
    4. For each requested change:
         - Apply change to document
         - Track what was modified
    5. Return { modified: bool, changes_made[], modified_documents[] }

  IF mode == "re-review":
    1. Call Boot Skill ("review")
    2. Read the document and all related mission context
    3. Analyze for new concerns introduced by recent modifications:
         - Consistency with other mission documents
         - Completeness gaps
         - New dependencies or conflicts
    4. For each new concern found:
         - Add as a new open question (❓) in the document
    5. Return { new_questions_added: number, questions[] }
```

### Accept Agent

```
Accept Agent (stage, spec_path?)
  1. Call Boot Skill ("minimal")
  2. IF spec_path provided:
       - Copy mission document to project-level spec location
       - Example: mission/VISION.md → .concert/VISION-SPEC.md
  3. Update PR body with stage status
  4. Call Commit Skill ("docs", stage, "accept {stage}")
  5. Return { spec_created: bool, spec_path }
```

### Verifier Agent

```
Verifier Agent
  1. Call Boot Skill ("planning")
       → Receives: REQUIREMENTS-SPEC.md, all PHASE-SUMMARY files
  2. Extract testable deliverables from REQUIREMENTS-SPEC.md
  3. For each deliverable:
       - Check if it's covered by PHASE-SUMMARY evidence
       - Mark as: ✅ verified, ⚠️ partial, ❌ missing
  4. Generate VERIFICATION.md:
       - Requirements coverage matrix
       - Pass/fail per requirement
       - Gap list (if any)
  5. Generate COST-REPORT.md:
       - Model tier usage breakdown
       - Confidence distribution
       - Revision counts
       - Actual vs estimated cost
  6. Write both files to mission folder
  7. Call Commit Skill ("docs", "verification", "verification report")
  8. Return { pass_rate, gaps[], total_requirements, verified_count }
```

### Fix Agent

```
Fix Agent (issue?)
  1. Call Boot Skill ("execution")
  2. Load Fix Methodology Skill for structured diagnosis
  3. Phase 1 — UNDERSTAND: Read error, context, recent changes
  4. Phase 2 — REPRODUCE: Write a failing test that demonstrates the bug
  5. Phase 3 — DIAGNOSE: Form up to 3 hypotheses, test each
  6. Phase 4 — ASSESS: Is this a simple fix or does it need refactoring?
       - IF refactoring needed → escalate, don't patch
  7. Phase 5 — IMPLEMENT: Fix the code, make test pass
  8. Phase 6 — PREVENT: Add to .concert/CONCERT-RECOMMENDS.md if applicable
  9. Phase 7 — SELF-REVIEW: Check own work against Severity Skill
  10. Call Commit Skill ("fix", scope, description)
  11. Return { root_cause, fix_type, test_name, confidence, recommends_count }
```

### Debug Agent

```
Debug Agent (issue?)
  1. Call Boot Skill ("execution")
  2. Read failure block from state (if exists) via State Skill
  3. Hypothesis loop (max 3 cycles):
       a. Form hypothesis based on evidence
       b. Design minimal test to confirm/refute
       c. Run test
       d. IF confirmed → implement fix
       e. IF refuted → form next hypothesis
  4. IF all hypotheses exhausted → escalate with findings
  5. Call Commit Skill ("fix", scope, description)
  6. Return { root_cause, fix_description, hypotheses_tested, test_name }
```

### Quick Agent

```
Quick Agent (task_description)
  1. Call Boot Skill ("execution")
  2. Load applicable domain skills based on file types
  3. Implement task directly:
       - Write tests if applicable
       - Implement change
       - Run test suite
  4. Call Commit Skill (type, scope, description)
  5. Return { files_changed, commit_hash }
```

### Documenter Agent

```
Documenter Agent (phase_number)
  1. Call Boot Skill ("execution")
  2. Gather phase data:
       - Task files and their results from state.telemetry
       - Git log for phase commits
       - Confidence breakdown
  3. Write PHASE-SUMMARY-{NN}.md:
       - Task list with status
       - Files changed
       - Test coverage notes
       - Confidence per task
       - Total commits
  4. Call Commit Skill ("docs", "phase-{NN}", "phase summary")
  5. Return { phase_summary_path }
```

### Refactorer Agent

```
Refactorer Agent
  1. Call Boot Skill ("planning")
       → Receives: all specs, VERIFICATION.md, codebase, domain skills
  2. Analyze codebase for improvement opportunities:
       - Code smells and duplication
       - Architecture alignment with ARCHITECTURE-SPEC.md
       - Performance bottlenecks
       - Security hardening
       - Test coverage gaps
  3. For each finding → Call Severity Skill → classify(finding)
  4. Write REFACTORING-PLAN-YYYY-MM-DD.md to docs/:
       - Prioritized list (CRITICAL → MAJOR → MINOR → NICE)
       - Estimated effort per item
       - Dependencies between items
  5. Call Commit Skill ("docs", "refactoring", "refactoring plan")
  6. Return { critical_count, major_count, minor_count, nice_count }
```

### Retrospective Agent

```
Retrospective Agent
  1. Call Boot Skill ("planning")
       → Receives: telemetry, COST-REPORT.md, failure_log, mission docs
  2. Analyze mission data:
       - Model tier accuracy (was haiku sufficient where assigned?)
       - Revision hotspots (which tasks needed most reviewer cycles?)
       - Confidence calibration (was reported confidence accurate?)
       - Skill gaps (which skills were missing or unhelpful?)
       - Workflow friction (where did the pipeline bottleneck?)
       - Failure patterns (common root causes?)
  3. Write CONCERT-IMPROVEMENT.md to mission folder:
       - Findings grouped by category
       - Actionable recommendations
       - Suggested changes to agents/skills/workflows
  4. Call Commit Skill ("docs", "retrospective", "retrospective analysis")
  5. Return { findings_count, recommendations[] }
```

### Status Agent

```
Status Agent
  1. Call Boot Skill ("minimal")
  2. Call Status Skill (state)
       → Returns formatted pipeline display, open questions, next steps
  3. Output the formatted status text
  4. Return (no state changes — read-only agent)
```

### Delete Agent

```
Delete Agent
  1. Call Boot Skill ("minimal")
  2. Confirm mission folder exists
  3. Delete mission folder (.concert/missions/<slug>/)
  4. Call State Skill → write (reset to empty state)
  5. Call Commit Skill ("chore", "mission", "delete mission")
  6. Call User Guidance Skill ("Mission Deleted")
  7. Return { deleted_path }
```

### Push Agent

```
Push Agent
  1. Call Boot Skill ("minimal")
  2. Call State Skill → write any pending updates
  3. Git add + commit any uncommitted changes
  4. Push branch to remote
  5. Output handoff instructions:
       - Branch name for continuation
       - PR link
       - How to resume: /concert:continue or @concert-continue
  6. Return { branch, pr_number }
```

### Continue Agent

> **Note:** The Continue Agent is now a thin wrapper around the Continue Workflow.
> It calls Boot Skill, then delegates entirely to the Continue Workflow.
> All decision logic lives in the workflow, not the agent.

---

## Key Differences from Current Architecture

### 1. Commands Are Now True One-Liners

**Before:** Commands like `verify`, `continue`, `status`, and `fix` contained embedded
orchestration logic with conditionals and multi-step flows.

**After:** Every command is `→ Run <Workflow|Agent>`. Zero logic in commands.

### 2. Agents No Longer Contain Workflow Logic

**Before:** `concert-fix` had a 7-phase framework with numbered steps. `concert-continue`
had a 6-branch decision tree. `concert-reviewer` had a 10-step review loop.

**After:** Multi-step flows live in workflows. Agents do one focused task and return
results. The Fix Workflow orchestrates the fix phases. The Continue Workflow handles the
decision tree. The Review Workflow handles the review loop.

### 3. Skills Replace Copy-Pasted Logic

**Before:** 23 agents each contained their own boot sequence, state reading, commit
logic, next-steps formatting, severity definitions, and failure recording.

**After:** 9 new skills (Boot, State, Status, User Guidance, Spec Mapping, Commit,
Severity, Failure, Open Questions) are called by agents. Each piece of logic exists once.

### 4. Information Passes Through `next_action`

**Before:** `concert-continue` contained a complex decision tree that inspected state
fields to guess what to do next. Each agent independently decided what state to leave
behind for the next session.

**After:** Every agent writes a structured `next_action` hint to state.json before
completing. The Continue Workflow simply reads and executes it. No guessing.

### 5. Review Cycle Is a Workflow, Not an Agent

**Before:** `concert-reviewer` was both an agent (presenting documents, gathering feedback)
AND a workflow (orchestrating specialist re-reviews, managing the review loop).

**After:** The Review Workflow owns the loop (present → feedback → re-review → repeat).
The Reviewer Agent just presents one document and gathers feedback for one round.

### 6. Templates Are Actually Used

**Before:** `.concert/templates/user-guidance.md` existed with 20+ message templates but
was not referenced by any agent — every agent hand-crafted its own guidance text.

**After:** The User Guidance Skill reads templates and substitutes variables. Agents call
the skill instead of formatting messages inline.

### 7. Stage Registry Is the Single Source of Truth

**Before:** Stage→spec mappings, stage→agent mappings, and review trigger flags were
duplicated across concert-accept, concert-reviewer, workflow files, and individual agents.

**After:** The Spec Mapping Skill reads stage-registry.jsonc for all lookups. No hardcoded
mappings anywhere else.

### 8. Alias Agents Are Removed

**Before:** `concert-review` and `concert-verify` were thin alias agents that redirected
to `concert-reviewer` and `concert-verifier`.

**After:** Commands directly reference the correct agent/workflow. Copilot stubs use the
command name directly (`@concert-review → Review Workflow`, `@concert-verify → Verify
Workflow`). No alias indirection needed.

---

## Summary

| Layer                             | Count (Before)            | Count (After) | Change                                                                                           |
| :-------------------------------- | :------------------------ | :------------ | :----------------------------------------------------------------------------------------------- |
| Commands                          | 13                        | 13            | Same count, all simplified to one-liners                                                         |
| Workflows                         | 9                         | 11            | +2 (Continue Workflow, Code Quality Sub-Workflow extracted)                                      |
| Agents                            | 23                        | 21            | −2 (removed alias agents concert-review, concert-verify)                                         |
| Skills                            | 11                        | 20            | +9 (Boot, State, Status, User Guidance, Spec Mapping, Commit, Severity, Failure, Open Questions) |
| Duplicated logic blocks           | ~150+ lines across agents | 0             | Extracted into skills                                                                            |
| Embedded workflow logic in agents | 7 agents                  | 0             | Moved to workflows                                                                               |
| Embedded logic in commands        | 6 commands                | 0             | Delegated to workflows/agents                                                                    |
