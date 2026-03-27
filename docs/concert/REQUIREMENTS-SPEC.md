# Requirements: Concert 2 v1

## Functional Requirements

### FR-001: Repository Bootstrapping via npx (must)

The system must provide a CLI command `npx @he3-org/concert init` that bootstraps a repository with all Concert files.

**Acceptance Criteria:**
- Running `npx @he3-org/concert init` in a git repository creates the `docs/concert/` directory structure with agents, workflows, skills, and configuration files
- Running `npx @he3-org/concert init` creates `.github/agents/` with all GitHub Agent definition files
- Running `npx @he3-org/concert init` creates `.github/workflows/` with Concert workflow files (auto-continue, version-check)
- Running `npx @he3-org/concert init` creates `concert.jsonc` at the project root with default configuration
- Running `npx @he3-org/concert init` creates `docs/concert/state.json` with empty/initial state
- If Concert files already exist, the command warns and asks for confirmation before overwriting managed files
- The command succeeds in a clean git repository with no prior Concert installation
- The command exits with a non-zero code and a descriptive error if run outside a git repository
- The output ends with actionable next steps including file paths and commands

### FR-002: Mission Initialization (must)

The system must support creating a new mission via an interactive interview process.

**Acceptance Criteria:**
- The `concert-init` command starts an interactive interview session
- The interviewer agent reads existing project specs (`docs/concert/*-SPEC.md`) before asking questions
- The interviewer asks one question at a time and waits for a response before proceeding
- The interview covers: what, who, why, scope, constraints, success criteria, and existing context
- The interviewer proposes a feature size (small/medium/large) and asks the user to confirm
- The interviewer summarizes the vision back to the user and waits for confirmation before writing
- A mission folder is created at `docs/concert/missions/YYYY-MM-DD-<slug>/`
- A `VISION.md` file is written to the mission folder
- `state.json` is updated with mission name, path, workflow, branch, stage, and pipeline state
- The interviewer commits the new mission files
- The output ends with actionable next steps including file paths and commands
- The command fails with a clear message if run in a non-interactive environment (GitHub Agents UI)

### FR-003: One Active Mission Per Repo (must)

The system must enforce a single active mission per repository at any time.

**Acceptance Criteria:**
- If `state.json` already has an active mission and `concert-init` is run, the user is warned and must explicitly choose to start a new mission
- Only one mission's state is tracked in `state.json` at a time
- Previous mission data remains in its `docs/concert/missions/` folder but is not active

### FR-004: Pipeline Stage Execution — Requirements (must)

The system must support generating requirements from an accepted vision.

**Acceptance Criteria:**
- The `concert-plan` command auto-selects the requirements stage when vision is accepted and requirements are pending
- The `concert-analyst` agent reads VISION.md, existing project specs, and scans the codebase
- The agent produces `REQUIREMENTS.md` in the mission folder with: functional requirements (unique IDs, acceptance criteria, priorities), non-functional requirements, data requirements, integration requirements, edge cases, out-of-scope, assumptions, and open questions
- `state.json` is updated with `pipeline.requirements = "draft"`
- The output ends with actionable next steps

### FR-005: Pipeline Stage Execution — Architecture (must)

The system must support generating an architecture plan from accepted requirements.

**Acceptance Criteria:**
- The `concert-plan` command auto-selects the architecture stage when requirements are accepted
- The `concert-architect` agent reads VISION.md, REQUIREMENTS.md, existing specs, and deeply analyzes the codebase
- The agent produces `ARCHITECTURE.md` with: system overview, tech stack decisions with rationale, component design, data model, API design, error handling, security, performance, integration points, trade-offs, and migration plan
- `state.json` is updated with `pipeline.architecture = "draft"`
- The output ends with actionable next steps

### FR-006: Pipeline Stage Execution — UX Design (must)

The system must support generating UX specifications from accepted architecture.

**Acceptance Criteria:**
- The `concert-plan` command auto-selects the UX stage when architecture is accepted
- The `concert-designer` agent reads all mission docs and loads platform-specific UX skills
- The agent produces `UX.md` with: user flows, information architecture, component specifications (with all states), interaction patterns, accessibility requirements, and platform conventions
- `state.json` is updated with `pipeline.ux = "draft"`
- The output ends with actionable next steps

### FR-007: Pipeline Stage Execution — Task Planning (must)

The system must support decomposing approved plans into executable phases and task files.

**Acceptance Criteria:**
- The `concert-plan` command auto-selects the tasks stage when UX is accepted
- The `concert-planner` agent reads all approved mission documents and analyzes the codebase
- The agent creates a `phases/` directory structure with numbered phase directories
- Each phase directory contains task files named `TASK-<NN>-<slug>-<model>.md` (globally numbered across all phases, zero-padded)
- Each task file has YAML frontmatter with: task slug, title, depends_on, wave number, and model tier (haiku/sonnet/opus)
- Each task within a file specifies: files to create/modify, requirements, tests to write, skills to apply, and acceptance criteria
- The agent assigns the lowest viable model tier to each task
- The agent actively downtiers tasks: for tasks that would naturally require sonnet, the planner adds extra detail (explicit file paths, code snippets, step-by-step instructions, example patterns) so haiku can handle them instead. The same approach applies to opus-level tasks — add enough guidance to bring them down to sonnet where possible. The goal is to maximize haiku tasks, then sonnet, with opus only when the task cannot be simplified through better instructions
- Dependency ordering between task files is valid (no circular dependencies)
- `state.json` is updated with `pipeline.tasks = "planned"`, `phases_total`, and `tasks_total`
- The output ends with a summary of phases and task counts plus next steps

### FR-008: Pipeline Stage Execution — Code Execution (must)

The system must support executing task files through phases and waves with atomic commits.

**Acceptance Criteria:**
- The `concert-continue` command starts execution from the current phase/task position in `state.json`
- Tasks within a wave respect dependency ordering (wave 1 before wave 2, etc.)
- Each task produces exactly one commit with conventional commit format
- After each task commit, `state.json` is updated with: incremented `tasks_completed`, updated execution position, history entry, and telemetry record
- Tests are run after each task implementation; all tests must pass (not just new ones)
- Failed tests trigger up to 2 retries within the same context before stopping with a failure
- After all tasks in a phase complete, a documentation agent updates higher-level docs (README, API docs, guides)
- `PHASE-SUMMARY-NN.md` is written/updated after each task file and finalized at phase completion
- Execution stops immediately on failure with a failure block written to `state.json`

### FR-009: Review/Accept/Restart Cycle (must)

The system must support a review cycle at each planning stage (vision, requirements, architecture, UX, tasks).

**Acceptance Criteria:**
- After each planning stage produces a draft, the user is prompted with: accept, review, or restart options
- `concert-review` reads `state.json` to determine the current stage and reviews the appropriate document
- `concert-review` follows a two-phase review flow:
  - **Phase 1 — User changes:** The reviewer first asks the user if they have any changes. If yes, the changes are applied iteratively (one at a time) until the user confirms they have no more changes.
  - **Phase 2 — Reviewer concerns:** Only after the user has no more changes does the reviewer present its own findings, one concern at a time, organized by severity (critical, important, suggestion). Each concern is discussed and resolved before moving to the next.
- This two-phase flow ensures the user's priorities are addressed first and that no concern is lost in a wall of text
- `concert-accept` creates a project-level `*-SPEC.md` from the plan document (vision -> VISION-SPEC.md, requirements -> REQUIREMENTS-SPEC.md, etc.)
- `concert-accept` updates `state.json` with `pipeline.<stage> = "accepted"` and prompts the user to run `concert-continue` to advance to the next stage (accept does NOT auto-advance)
- `concert-restart` discards the current stage output and re-runs the consultant agent from scratch
- All three commands work with an explicit stage argument or default to the current stage from `state.json`
- The review agent is interactive-only and fails with a clear message in non-interactive environments

### FR-010: Cold-Start Recovery via concert-status (must)

The system must provide a `concert-status` command that fully recovers context from a blank session.

**Acceptance Criteria:**
- `concert-status` reads `state.json` and displays: mission name, branch, PR number, pipeline progress (visual), feature size, current position, execution progress (if applicable), cost estimates, blockers, recent history (last 3-5 entries), and next steps
- The command is read-only — it never modifies any files
- The command runs on a budget model (fast and cheap)
- The output includes both CLI and GitHub UI options in next steps
- The command works from any environment (interactive or non-interactive)
- If no active mission exists, it outputs "No active mission" with guidance to start one

### FR-011: Session Continuation (must)

The system must support resuming work after session crashes, timeouts, plan usage exhaustion, or user return — including mid-code-quality-loop recovery and cross-environment handoffs (e.g., CC → GitHub).

**Acceptance Criteria:**
- The `concert-continue` command reads `state.json` and determines the exact continuation point
- It handles all possible states: mid-task, between tasks, between task files, between phases, pre-execution, post-execution, in planning stages, with failure blocks, with blockers
- It handles mid-code-quality-loop states: if the session halted during the orchestrator-coder-reviewer loop, it resumes from the correct position (e.g., coder iteration 2, reviewer pending) using the `quality_loop_state` in `state.json`
- Prior review findings from completed iterations are preserved — the loop does not restart from iteration 1
- Supports `--max-iterations N` flag to override the configured max for the current task — allows extending the quality loop for tasks that failed at max iterations without changing the global config (e.g., `concert-continue --max-iterations 5` continues from iteration 3 with 2 more allowed)
- If a failure block exists, it assesses whether to retry or suggest debugging
- It updates `state.json` continuously during execution for crash safety
- It writes `next_steps` for the next continuation session (assuming it may crash)
- When resuming in a different environment (e.g., GitHub after CC ran out of plan usage), the agent detects uncommitted work on the branch, assesses its state, and either continues from the last committed point or incorporates the partial work
- The command works in both interactive and non-interactive environments

### FR-012: Managed File Headers (must)

All Concert-generated files must carry a "do not edit" header indicating they are managed by Concert.

**Acceptance Criteria:**
- Every agent definition file (`docs/concert/agents/*.md`) starts with a comment block: `<!-- AUTO-GENERATED BY CONCERT -- DO NOT EDIT ... -->`
- Every workflow file (`docs/concert/workflows/*.md`) starts with the same header
- Every skill file (`docs/concert/skills/*/SKILL.md`) starts with the same header
- Every GitHub agent file (`.github/agents/*.md`) starts with the same header
- Every GitHub workflow file (`.github/workflows/*.yml`) starts with a YAML comment header: `# AUTO-GENERATED BY CONCERT -- DO NOT EDIT`
- Mission files (VISION.md, REQUIREMENTS.md, etc.) do NOT carry managed headers — they are user content

### FR-013: Update Mechanism (must)

The system must support updating Concert files in a repository to a new version.

**Acceptance Criteria:**
- A command (e.g., `npx @he3-org/concert update` or an update agent) upgrades Concert files in an existing installation
- **Safe to overwrite:** Agent definitions, skill files, workflow files, GitHub agent files, and GitHub workflow files are replaced entirely from the new version
- **Surgical updates:** `state.json` (at `docs/concert/state.json`) and `concert.jsonc` are merged intelligently — new fields are added, existing user values are preserved, removed fields are cleaned up
- **User content preserved:** Mission files (VISION.md, REQUIREMENTS.md, ARCHITECTURE.md, UX.md, TASK files, PHASE-SUMMARY files) are never modified or deleted
- The update process validates that state.json remains a valid schema after merging
- The update process reports what was changed

### FR-014: Command Naming Convention (must)

All Concert commands must be prefixed with `concert-` to avoid collisions with Claude Code and other tools.

**Acceptance Criteria:**
- Every user-facing command uses the `concert-` prefix: `concert-init`, `concert-plan`, `concert-review`, `concert-accept`, `concert-restart`, `concert-status`, `concert-continue`, `concert-debug`, `concert-verify`, `concert-replan`, `concert-push`, `concert-quick`
- No Concert command conflicts with built-in Claude Code commands
- GitHub Agent definition files in `.github/agents/` use the `concert-` prefix in their filenames

### FR-015: Actionable Next Steps on Every Output (must)

Every agent output must end with a structured "Next steps" section.

**Acceptance Criteria:**
- Every agent's final output includes a section titled "Next steps"
- Next steps include specific file paths (absolute where applicable)
- Next steps include copy-paste commands for both CLI and GitHub UI options
- Next steps include the most likely next action first
- Next steps are relevant to the current state (not generic)

### FR-016: One Question at a Time — Interview Agents (must)

Interactive interview agents must ask exactly one question at a time.

**Acceptance Criteria:**
- The `concert-interviewer` agent asks a single question and waits for a response before formulating the next question
- Each answer may change the subsequent flow of questions
- The agent adapts questioning style to user communication style (brief responses get targeted follow-ups)
- The agent never presents a list of multiple questions at once

### FR-017: Model Tier Routing (must)

The system must route tasks to the appropriate model tier based on task file metadata.

**Acceptance Criteria:**
- Task files specify a `model` field in frontmatter with values `haiku`, `sonnet`, or `opus`
- In Claude Code sessions, subagents are spawned with the specified model tier
- The task filename includes the model suffix (e.g., `TASK-01-db-schema-haiku.md`)
- Model tier assignment follows the guidelines: haiku for scaffolding/config/boilerplate, sonnet for business logic/APIs/tests, opus for security/complex algorithms/architecture
- `concert.jsonc` includes a `"model_tiers"` configuration with environment-specific tier availability:
  - `"claude_code"`: uses all three tiers (`haiku`, `sonnet`, `opus`) — haiku is cheaper than sonnet in CC
  - `"github"`: uses only `sonnet` and `opus` — haiku tasks are promoted to sonnet since GitHub prices haiku and sonnet the same
- The planner respects the active environment's tier availability when assigning models
- This toggle allows future adjustment if GitHub introduces differentiated pricing for haiku

### FR-018: Code Quality Loop (must)

The system must use an orchestrator-coder-reviewer loop for every task execution.

**Acceptance Criteria:**
- Every task uses the full orchestrator-coder-reviewer pattern — no simple/bypass mode
- The reviewer rates findings with severity levels: CRIT, MAJ, MIN, NTH, PASS
- If there are ANY findings (CRIT, MAJ, MIN, or NTH), the task is sent back to the coder for revision
- Maximum revision cycles per task is configurable via `concert.jsonc` → `execution.max_review_iterations` (default: 3)
- **Coder revision priorities when sent back:**
  - If CRIT and/or MAJ exist: the coder must resolve all CRIT and MAJ findings
  - If only MIN and/or NTH exist: the coder should resolve the higher-priority findings first
  - If only NTH exists: the coder works on those
- **Exit conditions:**
  - PASS (zero findings) at any iteration: exit with success
  - After max iterations with only MIN and/or NTH remaining: exit with success
  - After max iterations with any CRIT or MAJ remaining: exit with fail, and output: "Run `concert-continue --max-iterations N` to allow more iterations for this task"
- The goal is to use every iteration to reach zero findings (PASS), producing pristine code, tests, and documentation

### FR-019: Verification Stage (must)

The system must support acceptance testing against requirements after execution completes.

**Acceptance Criteria:**
- The `concert-verify` command runs the QA agent
- The QA agent reads REQUIREMENTS-SPEC.md and all PHASE-SUMMARY files
- Each requirement is classified as PASS, PARTIAL, FAIL, or UNTESTABLE with evidence
- The agent produces `VERIFICATION.md` with pass/fail counts, per-requirement results, gap analysis, and remediation suggestions
- The agent produces `COST-REPORT.md` with model tier effectiveness, confidence accuracy, per-phase breakdown, and recommendations
- Failed/partial requirements generate suggested gap-closure task files

### FR-020: Retrospective / Self-Improvement (should)

The system should support post-mission retrospective analysis.

**Acceptance Criteria:**
- After successful verification, if `self_improvement.enabled` is true in `concert.jsonc`, the retrospective agent runs
- The agent reads telemetry, failure_log, COST-REPORT.md, PHASE-SUMMARY files, and current agent/skill/workflow definitions
- The agent produces `CONCERT-IMPROVEMENT.md` with prioritized suggestions (HIGH/MEDIUM/LOW), each citing specific telemetry evidence
- The agent includes a "What Worked Well" section that only highlights outcomes that exceeded expectations or were unexpected pleasant surprises worth codifying as future requirements — does not mention things that simply worked as expected
- The retrospective agent never modifies Concert files — it only documents suggestions

### FR-021: Stage Override and Rollback (should)

The system should allow running stages out of order and rolling back to earlier stages.

**Acceptance Criteria:**
- `concert-plan <stage>` runs the specified stage regardless of current pipeline position
- `concert-review <stage>` reviews a specific stage's output
- `concert-accept <stage>` accepts a specific stage
- `concert-replan <stage>` marks all subsequent stages as "needs re-run", re-runs the specified consultant, and after acceptance, re-runs all downstream consultants
- Rollback does not delete committed code

### FR-022: Telemetry Logging (must)

The system must log structured telemetry after each task completion.

**Acceptance Criteria:**
- After each task commits successfully, a telemetry record is appended to `state.json` -> `telemetry[]`
- Each record includes: task_file, task_index, phase, model_assigned, confidence, review_result, revision_count, skills_loaded, files_changed, completed_at
- Confidence is assessed based on: test coverage, requirements clarity, pattern familiarity, complexity vs model tier, acceptance criteria satisfaction
- Only successful completions are logged in telemetry; failures go to `failure_log[]`

### FR-023: Failure Handling (must)

The system must handle failures with structured error classification and crash-safe state.

**Acceptance Criteria:**
- On task failure, execution stops immediately — no skipping ahead
- A failure block is written to `state.json` with: phase, phase_name, task_file, task_index, task_title, failed_at (ISO 8601), error_type, error_summary, files_touched, last_successful_commit, context_usage_percent
- Error types include: test_failure, build_error, context_exhaustion, dependency_missing, model_capability_exceeded, timeout, unknown
- The failure is appended to `failure_log[]`
- The working tree is left dirty (no rollback)
- Recovery guidance is output with specific next steps

### FR-024: Debugging Agent (should)

The system should provide a scientific-method debugging agent.

**Acceptance Criteria:**
- The `concert-debug` command spawns the debugger agent
- The agent reads the failure block from `state.json` and relevant code/tests
- The agent forms 2-3 ranked hypotheses and tests each systematically
- Hypotheses and experiment results are persisted to `state.json` -> `debug_state` for crash recovery
- On fix: a regression test is added, the full test suite passes, and the failure block is cleared
- After 3 failed hypothesis cycles, the agent escalates to human

### FR-025: npm Package Distribution (must)

Concert 2 must be distributed as an npm package.

**Acceptance Criteria:**
- The package is published to npm under the name `@he3-org/concert`
- `npx @he3-org/concert init` bootstraps a repository without requiring a global install
- The package includes all agent definitions, workflow files, skill files, GitHub agent files, and GitHub workflow files as distributable assets
- The package has a `bin` entry in `package.json` for the `concert` CLI command (invoked via `npx @he3-org/concert`)
- The package version follows semver (pre-v1, breaking changes do not require major bumps)

### FR-026: GitHub Agents UI Compatibility (must)

Concert commands must work from the GitHub Agents UI.

**Acceptance Criteria:**
- Each Concert command has a corresponding `.github/agents/concert-<name>.agent.md` file
- GitHub Agent files contain `name` and `description` frontmatter (no `model` or `tools`) and point to the full agent definition in `docs/concert/agents/`
- Agents that require interactivity (`concert-init`, `concert-review`) detect non-interactive environments and output a clear error directing the user to Claude Code
- Non-interactive agents (`concert-plan`, `concert-continue`, `concert-status`, `concert-verify`) work fully from GitHub Agents UI

### FR-027: Claude Code Web UI Compatibility (must)

Concert commands must work from the Claude Code web UI for interactive steps.

**Acceptance Criteria:**
- Interactive commands (`concert-init`, `concert-review`) function correctly in Claude Code web UI sessions
- The Claude Code skill commands (`/concert:init`, `/concert:plan`, etc.) map to the corresponding agent definitions
- All agent outputs render correctly as markdown in the Claude Code web UI

### FR-028: Git State Commitment (must)

All state changes must be committed to git.

**Acceptance Criteria:**
- State changes are committed alongside the work that triggered them (e.g., a task commit includes the state.json update); state-only commits occur only when no other files changed (e.g., a stage transition)
- Every planning stage that produces a document commits the document
- Every task execution commits the code with conventional commit format
- State is always recoverable from the git history

### FR-029: Self-Dogfooding Capability (must)

Concert 2 must be usable to develop Concert 2 itself.

**Acceptance Criteria:**
- Concert 2 can be installed in its own repository
- A mission can be run through the full pipeline (vision through execution) on the Concert 2 codebase
- The Concert 2 agents, workflows, and skills work correctly when the target project IS Concert 2
- No circular dependency prevents Concert from analyzing/modifying its own files

### FR-030: Workflow Selection by Feature Size (must)

The system must select the appropriate workflow based on feature size.

**Acceptance Criteria:**
- Feature size "large" selects `CONCERT-WORKFLOW-MISSION-FULL.md` (vision, requirements, architecture, UX, tasks, execution)
- Feature size "medium" selects `CONCERT-WORKFLOW-MISSION-MEDIUM.md` (vision, requirements, architecture, tasks, execution)
- Feature size "small" selects `CONCERT-WORKFLOW-MISSION-SMALL.md` (vision, tasks, execution)
- The selected workflow determines which pipeline stages are active

### FR-031: Human Status Display (should)

The system should maintain a human-readable status display.

**Acceptance Criteria:**
- When `status_display` in `concert.jsonc` is `"wip_pr"`, the WIP PR body is updated with pipeline progress after each stage transition
- The status display shows the visual pipeline, current position, and recent history
- The display is updated after stage acceptance and phase completion

### FR-032: Auto-Continue Workflow (should)

The system should support automatic continuation with environment-aware execution strategy.

**Acceptance Criteria:**
- A GitHub Actions workflow triggers on pushes to `docs/concert/state.json`
- The workflow checks if the mission stage is not "done" or "verified"
- If work remains, it triggers the appropriate continuation strategy based on environment
- **GitHub Actions environment:** supports parallel execution — can trigger multiple concurrent agents for independent tasks (e.g., wave tasks with no dependencies between them)
- **Claude Code web UI environment:** runs linearly — completes one task at a time, outputs `concert-continue` guidance for manual session continuation
- The decision logic for parallel vs. linear execution lives near the orchestration layer that assigns work, not in the auto-continue workflow itself
- The workflow files carry managed-file headers

### FR-033: Context Compaction (must)

The system must compact context as phases complete to keep agents within context window limits.

**Acceptance Criteria:**
- Agents reading execution state use a tiered strategy: current phase reads TASK files + PHASE-SUMMARY, previous phase reads PHASE-SUMMARY only, older phases are skipped unless specifically relevant
- PHASE-SUMMARY files contain enough information for downstream agents to understand completed work without reading individual TASK files
- The orchestrator monitors context usage and spawns continuation agents before hitting limits

### FR-034: Skills System (must)

The system must support a skills system that provides domain-specific guidance to agents.

**Acceptance Criteria:**
- Skills are defined as markdown files in `docs/concert/skills/<skill-name>/SKILL.md`
- Each skill specifies file patterns indicating when it should apply (e.g., `**/*.ts`)
- Task files reference skills by name in their specification
- Agents load applicable skills before implementing or reviewing code
- `concert.jsonc` has a `skills` section with `auto_discover` and `enabled` fields

### FR-036: Interactive Mode Enforcement (must)

Interactive interview agents must be restricted to Claude Code unless the restriction is explicitly disabled.

**Acceptance Criteria:**
- `concert.jsonc` includes a configuration option `"interactive_mode": "claude_code_only"` (default)
- When set to `"claude_code_only"`, interactive agents (`concert-init`, `concert-review`) refuse to run in GitHub Agents UI and output a message directing the user to Claude Code
- When set to `"any"`, interactive agents attempt to run in any environment (for future GitHub interactivity support)
- The toggle is respected by all agents marked `interactive_only: true`
- The default value is `"claude_code_only"` in newly initialized repos

### FR-037: Quick Task Execution (must)

The system must provide a `concert-quick` command for small tasks that skip the full pipeline.

**Acceptance Criteria:**
- The `concert-quick` command accepts a task description as an argument
- The agent operates as a senior full-stack developer with design, UX, security, and documentation expertise
- The agent uses all available tools (Read, Write, Edit, Bash, Grep, Glob, etc.)
- The agent follows TDD: writes tests first, then implements, then verifies all tests pass
- After implementation, the agent performs a thorough self-review covering: code quality, security implications, UX considerations, documentation completeness, and edge cases
- The agent produces a single conventional commit with the changes
- The agent updates `state.json` with a history entry for the quick task
- The agent does not create mission folders, VISION.md, or go through planning stages
- The agent runs on the highest model tier (opus) by default
- The output ends with actionable next steps
- The command works in both interactive and non-interactive environments

### FR-038: Cross-Environment Handoff via concert-push (must)

The system must provide a Node CLI command to safely push local work to origin for cross-environment continuation.

**Acceptance Criteria:**
- `npx @he3-org/concert push` is a pure Node CLI command — no LLM session required, runs entirely locally
- The command commits any uncommitted state.json changes, stages any unstaged tracked files that are part of the current task, and pushes the current branch to origin
- If the code quality loop is in progress, the command saves the full `quality_loop_state` to `state.json` (iteration number, active phase, prior findings, coder commits) before pushing
- The command outputs a clear summary of what was pushed: branch name, number of commits, loop state if applicable
- The output ends with actionable next steps for continuing in the other environment (e.g., "Run `concert-continue` in GitHub Agents UI to resume from reviewer iteration 2")
- The command is safe to run at any point — it never loses work
- If there is nothing to push (already up to date), it outputs a confirmation and next steps
- The command works without an active LLM session (critical for when CC plan usage is exhausted)

### FR-039: Context Usage Gating for concert-continue (must)

The `concert-continue` command must check context usage before starting each new task to avoid mid-task exhaustion.

**Acceptance Criteria:**
- `concert.jsonc` includes a configurable `"execution.max_context_usage_percent"` value (default: 85)
- Before starting each new task, `concert-continue` checks current context usage (only when running in Claude Code)
- If context usage exceeds the configured threshold, `concert-continue` stops, saves all state (including `quality_loop_state` if active), commits state.json, and outputs handoff instructions: "Run `npx @he3-org/concert push` to push to origin, then run `concert-continue` in GitHub Agents UI"
- The check occurs at the task boundary — never mid-task or mid-quality-loop — so the current task always completes fully before halting
- In GitHub Agents UI, the check is skipped (GitHub manages its own session limits)
- If context usage cannot be determined, the agent proceeds with a warning

### FR-040: Documentation Currency (must)

The system must keep documentation current as code changes, using a hybrid inline + phase-level approach.

**Acceptance Criteria:**
- **During the coder/reviewer loop:** The coder updates documentation within files it is already touching — inline comments, JSDoc/TSDoc, function-level docs. The reviewer flags missing or outdated inline docs as findings.
- **After each phase completes:** A dedicated documentation agent runs, reads the PHASE-SUMMARY and all commits from that phase, and updates higher-level documentation (README sections, API docs, architecture docs, guides)
- The documentation agent produces a single conventional commit with all doc updates for the phase
- The planner includes documentation expectations in task specifications so the coder knows what inline docs are expected
- The documentation agent has full awareness of all changes across all tasks in the phase, avoiding the fragmented view individual coders have
- The coder does not chase external doc files — this preserves cache optimization during the quality loop

### FR-041: GitHub Agentic Workflow Generation (must)

Concert workflow definitions must generate GitHub agentic workflow files for native execution.

**Acceptance Criteria:**
- Concert workflows (`docs/concert/workflows/*.md`) are the design-layer source of truth — they define pipeline stages, agent assignments, review rules, and orchestration logic
- During `npx @he3-org/concert init` and `npx @he3-org/concert update`, Concert generates GitHub agentic workflow files (`.github/workflows/*.md` + `.lock.yml`) from the Concert workflow definitions
- The generated GitHub workflow files use the dual-file format (markdown + lock) for compatibility with GitHub's agentic workflow infrastructure
- Generated workflow files carry managed-file headers and are safe to overwrite on update
- The Concert workflow format remains independent of GitHub's workflow format — Concert workflows are portable, GitHub workflows are the generated execution layer
- If GitHub adds multi-agent chaining or agent communication specs in the future, the generation layer can be updated to leverage those features without changing Concert's workflow format

**Future consideration (out of scope for v1):** Easy custom workflow authoring — a user creates a Concert workflow file referencing agents and Concert auto-generates all GitHub workflow, agent, and skill files needed. Deferred until a concrete use case drives the requirements.

### FR-035: Cost-Optimized Task Decomposition (must)


The planner agent must prioritize decomposing tasks so they can be executed by the cheapest viable model tier.

**Acceptance Criteria:**
- The planner actively breaks down complex work into smaller, simpler tasks that haiku can handle before resorting to sonnet or opus
- Task decomposition favors many small haiku-tier tasks over fewer sonnet/opus-tier tasks when the result is equivalent
- The planner only assigns sonnet when the task genuinely requires business logic reasoning, nuanced test writing, or multi-file coordination that haiku cannot handle
- The planner only assigns opus when the task involves security-critical code, complex algorithms, or architectural decisions that sonnet cannot handle
- The planner documents the rationale for any task assigned above haiku tier (e.g., "sonnet: requires coordinating changes across 4 interdependent files")
- The resulting task plan is reviewed for tier inflation — if a task can be split further to use a cheaper tier, it should be

---

## Non-Functional Requirements

### NFR-001: Browser-First Performance (must)

The system must work effectively from a low-power Chromebook via browser interfaces.

**Measurable Criteria:**
- All planning-stage agents complete within GitHub Agents UI and Claude Code web UI session limits
- `concert-status` agent completes in under 30 seconds on any model
- No Concert command requires local compute beyond running `npx` for bootstrapping
- All agent outputs are readable without horizontal scrolling in standard browser widths

### NFR-002: Minimal Dependencies (must)

The npm package must have minimal external dependencies.

**Measurable Criteria:**
- The package has fewer than 20 direct production dependencies
- No dependency requires native compilation (no node-gyp)
- All dependencies are well-maintained (updated within the last 12 months)
- The package installs successfully with `npx` without additional setup steps

### NFR-003: Crash Safety (must)

The system must be resilient to session crashes at any point during execution.

**Measurable Criteria:**
- `state.json` is updated after every task commit — at most one task of work is lost on crash
- Any crashed session can be resumed with `concert-continue` from a fresh session
- Debug state (hypotheses, experiments) persists across crashes
- No corruption of `state.json` from partial writes (write-then-commit pattern)

### NFR-004: Git Cleanliness (should)

Concert operations should produce clean, readable git history.

**Measurable Criteria:**
- Every task produces exactly one commit
- All commits use conventional commit format (`type: description` or `type(scope): description`)
- All PR titles use conventional commit format (`type: description`)
- State updates are committed as part of the task commit (not separate commits)
- Planning stage outputs are committed with descriptive commit messages

### NFR-005: Agent Context Efficiency (should)

Agents should use context windows efficiently.

**Measurable Criteria:**
- The orchestrator keeps its own context to approximately 15% of the window
- Subagents receive file paths rather than file contents
- Completed phases are summarized via PHASE-SUMMARY files instead of re-reading TASK files
- Skills are loaded only when relevant to the current task

### NFR-006: Idempotent Commands (should)

Concert commands should be safe to run multiple times.

**Measurable Criteria:**
- Running `concert-status` multiple times produces the same output (read-only)
- Running `concert-continue` when already at the correct position is a no-op
- Running `concert-accept` on an already-accepted stage produces a warning rather than an error

### NFR-007: Clear Error Messages (must)

All error states must produce clear, actionable error messages.

**Measurable Criteria:**
- Every error output includes: what failed, why it failed, and what the user should do next
- Interactive-only commands in non-interactive environments produce a specific message directing the user to Claude Code
- Missing prerequisites (e.g., no VISION.md when running requirements) produce specific guidance

---

## Data Requirements

### DR-001: concert-state.json Schema (must)

The system must define and maintain a structured state file.

**Schema Fields:**
- `mission`: string — mission slug
- `mission_path`: string — path to mission folder
- `workflow`: string — active workflow name
- `workflow_path`: string — path to workflow file
- `branch`: string — git branch name
- `pr_number`: number — PR number (0 if none)
- `status_display`: string — display mode (wip_pr, status_md)
- `feature_size`: string — small, medium, large
- `stage`: string — current pipeline stage
- `pipeline`: object — stage statuses (pending, draft, accepted)
- `phases_completed`: number
- `phases_total`: number
- `tasks_completed`: number
- `tasks_total`: number
- `commits`: number
- `cost`: object — estimated_remaining, spent_this_mission, by_stage
- `blockers`: array
- `telemetry`: array — per-task telemetry records
- `failure_log`: array — failure summaries
- `failure`: object | null — current failure block (if any)
- `debug_state`: object | null — active debug session state
- `quality_loop_state`: object | null — active code quality loop position, containing:
  - `task_file`: string — current task file
  - `task_index`: number — current task within file
  - `iteration`: number — current loop iteration (1-3)
  - `phase`: string — "coder" | "reviewer" — which role was active when halted
  - `prior_findings`: array — review findings from completed iterations (preserved across sessions)
  - `coder_commits`: array — commit SHAs from coder work in this loop (to avoid losing partial progress)
- `history`: array — chronological event log
- `next_steps`: array — actionable next steps for user/agent

**Acceptance Criteria:**
- The schema is documented and versioned
- All agents read and write to this schema consistently
- New fields can be added without breaking existing state files (forward compatibility)
- The state file is valid JSON at all times

### DR-002: concert.jsonc Configuration Schema (must)

The system must define a user-editable configuration file.

**Schema Fields:**
- `project_name`: string
- `concert_version`: string
- `project.platforms`: array
- `git.base_branch`, `git.production_branch`, `git.pre_v1`, `git.commit_format`, `git.pr_target`: various
- `status_display`: string
- `execution.mode`, `execution.max_tasks_per_file`, `execution.max_files_per_phase`, `execution.max_context_usage_percent`, `execution.max_review_iterations`: various
- `review_triggers`: object — on_phase_complete, on_dependency_boundary, on_inferred_breakpoint, after_n_files, after_n_commits
- `gates`: object — task_checker, acceptance_testing
- `model_profiles`: object — quality, balanced, budget model names
- `task_models`: object — opus, sonnet, haiku model names
- `skills`: object — auto_discover, enabled
- `actions.auto_continue`: boolean
- `telemetry`: object — enabled, generate_cost_report
- `self_improvement.enabled`: boolean
- `interactive_mode`: string — "claude_code_only" (default) or "any"; controls where interactive agents can run
- `user_guidance`: object — always_show_next_steps, include_file_paths, include_copy_paste_commands, show_both_cli_and_ui_options

**Acceptance Criteria:**
- The file uses JSONC format (JSON with comments)
- Default values are provided for all fields
- User modifications survive updates (surgical merge)

### DR-003: Mission Folder Structure (must)

Each mission must store its documents in a structured folder.

**Required Structure:**
```
docs/concert/missions/YYYY-MM-DD-<slug>/
  VISION.md
  REQUIREMENTS.md
  ARCHITECTURE.md
  UX.md
  VERIFICATION.md
  COST-REPORT.md
  CONCERT-IMPROVEMENT.md
  phases/
    01-<slug>/
      TASK-<NN>-<slug>-<model>.md
      PHASE-SUMMARY-01.md
    02-<slug>/
      ...
```

**Acceptance Criteria:**
- Mission folders are created by the interviewer agent with the correct date and slug
- All planning stage documents are written to the mission folder
- Phase directories use zero-padded numbering (01, 02, ...) for sort order
- Task files follow the naming convention: `TASK-<NN>-<slug>-<model>.md` (globally numbered, zero-padded)
- PHASE-SUMMARY files follow the naming convention: `PHASE-SUMMARY-NN.md`

### DR-004: Project-Level Spec Files (must)

Accepted stage outputs must be promoted to project-level spec files.

**Acceptance Criteria:**
- On accept, the plan document is copied/promoted to `docs/concert/` as `*-SPEC.md`:
  - VISION.md -> VISION-SPEC.md
  - REQUIREMENTS.md -> REQUIREMENTS-SPEC.md
  - ARCHITECTURE.md -> ARCHITECTURE-SPEC.md
  - UX.md -> UX-SPEC.md
- Spec files persist across missions and serve as cumulative project knowledge
- Spec files are read by subsequent mission agents for context

### DR-005: Telemetry Record Schema (must)

Each telemetry record must follow a defined schema.

**Schema Fields (per record):**
- `task_file`: string
- `task_index`: number (1-indexed)
- `phase`: number
- `model_assigned`: "haiku" | "sonnet" | "opus"
- `confidence`: "high" | "medium" | "low"
- `review_result`: "PASS" | "NTH" | "MIN" | "MAJ" | "CRIT" | "none"
- `revision_count`: number
- `skills_loaded`: string[]
- `files_changed`: number
- `completed_at`: string (ISO 8601)

**Acceptance Criteria:**
- Every successful task completion appends a record with all fields populated
- The schema is consistent across all executing agents

### DR-006: Task File Frontmatter Schema (must)

Task files must use a defined YAML frontmatter schema.

**Schema Fields:**
- `task`: string — slug identifier
- `title`: string — descriptive title
- `depends_on`: string[] — slugs of dependency tasks
- `wave`: number — wave assignment
- `model`: "haiku" | "sonnet" | "opus" — model tier

**Acceptance Criteria:**
- All task files produced by the planner include valid frontmatter
- The runner agent parses frontmatter to determine model tier and dependencies
- The dependency DAG built from `depends_on` has no cycles

---

## Integration Requirements

### IR-001: GitHub Agents UI Integration (must)

Concert must integrate with the GitHub Agents UI for autonomous agent execution.

**Acceptance Criteria:**
- Each Concert command has a `.github/agents/concert-<name>.agent.md` file that GitHub Agents UI can discover
- Agent files include `name` and `description` frontmatter fields (no `model` or `tools`) that appear in the GitHub UI agent selector
- Agent files reference the full agent definition via "Read docs/concert/agents/..." instructions
- Non-interactive agents work fully when launched from GitHub Agents UI
- Interactive agents detect non-interactive mode and output a redirect message

### IR-002: Claude Code Skill Integration (must)

Concert must integrate with Claude Code's skill/command system.

**Acceptance Criteria:**
- Concert commands are accessible via `/concert:init`, `/concert:plan`, `/concert:review`, `/concert:accept`, `/concert:status`, `/concert:continue`, `/concert:debug`, `/concert:verify`
- Skill commands load and execute the corresponding agent definitions
- The CLAUDE.md project configuration file references Concert commands

### IR-003: Git Integration (must)

Concert must integrate with git for all state management and code commits.

**Acceptance Criteria:**
- All state changes, planning documents, and code are committed to git
- Branch naming follows the project's convention
- Commits use conventional commit format as configured in `concert.jsonc`
- The system works correctly with standard git operations (push, pull, merge)

### IR-004: npm Registry Integration (must)

Concert must be published to and installable from the npm registry.

**Acceptance Criteria:**
- The package is published to npm with proper metadata (name, version, description, license, repository)
- `npx @he3-org/concert init` works without prior installation
- `npx @he3-org/concert update` works for upgrading existing installations
- The package includes all necessary assets (agents, workflows, skills, templates)

### IR-005: GitHub Actions Integration (could)

Concert may integrate with GitHub Actions for automation.

**Acceptance Criteria:**
- The auto-continue workflow triggers on state.json changes and signals when work remains
- The version-check workflow runs periodically to check for Concert updates
- Workflow files are generated during init and updated during update
- Workflow files carry managed-file headers

---

## Edge Cases

### EC-001: Init in a Repo with Existing Concert Files

**Expected Behavior:** Warn the user that Concert files already exist. Offer to update (overwrite managed files, preserve user content) or abort. Never silently overwrite.

### EC-002: Multiple Sessions Running Simultaneously

**Expected Behavior:** The second session reads `state.json` and detects that work is in progress. It either waits, reports the conflict, or proceeds from the latest committed state. Git's commit mechanism naturally serializes state updates.

### EC-003: Session Crash Mid-State-Write

**Expected Behavior:** Because state is committed after each task, a crash during the write-then-commit sequence loses at most one task. The next `concert-continue` reads the last committed `state.json` and resumes from there.

### EC-004: Circular Dependencies in Task Files

**Expected Behavior:** The planner agent detects circular dependencies during planning and reports an error before writing task files. If a cycle is somehow introduced manually, the runner detects it during wave resolution and stops with a `dependency_missing` error.

### EC-005: Context Window Exhaustion During Execution

**Expected Behavior:** The orchestrator monitors context usage. When approaching limits, it commits current progress, updates `state.json`, and spawns a continuation agent or outputs `concert-continue` guidance. At most one task of work is lost.

### EC-006: Model Tier Insufficient for Task

**Expected Behavior:** If a task assigned to haiku/sonnet fails due to complexity, it is flagged with `error_type: "model_capability_exceeded"`. The failure guidance suggests reassigning to a higher tier or decomposing the task.

### EC-007: Empty or Missing VISION.md When Running Requirements

**Expected Behavior:** The analyst agent detects the missing prerequisite and stops with a clear error: "VISION.md not found. Run `/concert:init` first." It does not generate requirements from thin air.

### EC-008: User Edits concert-state.json Manually

**Expected Behavior:** The system treats `state.json` as the source of truth regardless of how it was modified. If the manual edit creates an invalid state, the next agent to read it should report the schema violation clearly.

### EC-009: Running concert-accept When No Draft Exists

**Expected Behavior:** The command outputs an error: "No draft to accept for stage <stage>. Run `/concert:plan` first." It does not create an empty spec.

### EC-010: Test Suite Does Not Exist

**Expected Behavior:** If no test framework or test files are detected, the runner skips the test execution step but reports `confidence: "low"` and notes the absence of tests in telemetry. The PR merge gate (CI) will also reflect the absence of tests.

### EC-011: Replan After Partial Execution

**Expected Behavior:** `concert-replan <stage>` marks downstream stages as needing re-run. The planner regenerates TASK files accounting for already-completed work by reading committed code and PHASE-SUMMARY files. Committed code is NOT rolled back.

### EC-012: Version Check Workflow Still References Go

**Expected Behavior:** The version-check GitHub Actions workflow (currently referencing `go install`) must be updated to use `npm`/`npx` for Concert 2. This is handled by the init/update process.

---

## Out of Scope

The following items are explicitly excluded from Concert 2 v1, as defined in the vision:

1. **Multi-runtime abstraction** — Cloudflare Workers, Deno, and other non-GitHub runtimes are future work. v1 targets GitHub Agents UI + Claude Code only.
2. **Agent self-improvement/learning loop** — Automated application of retrospective suggestions is deferred. v1 produces suggestions for human review only.
3. **Multi-mission concurrency** — Only one active mission per repository is supported. Running multiple missions simultaneously is out of scope.
4. **Custom web UI** — No web interface beyond GitHub's native UI and Claude Code's web UI. No Concert-specific dashboard or portal.
5. **Token counting / exact cost tracking** — v1 does not track token counts or exact dollar costs per task. Only rough mission-level estimates.
6. **Agent wall-clock timing** — Session crashes make timing unreliable; not tracked in v1.
7. **Full decision traces** — Verbose agent reasoning logs are too large for git-committed state.
8. **Multi-user / team features** — Concert is for a single developer. No collaboration, permissions, or team workflows.

---

## Assumptions

1. **GitHub is available and reliable.** The system assumes GitHub's platform (repos, Actions, Agents UI) is accessible during Concert operations.
2. **Claude Code web UI supports the Task tool.** Subagent spawning for the orchestrator-coder-reviewer loop requires this capability.
3. **npm registry is accessible for publishing and installing.** The distribution model depends on npm availability.
4. **Git is installed on the user's machine** for `npx @he3-org/concert init` bootstrapping.
5. **One developer operates Concert.** All design decisions assume a single user — no conflict resolution, locking, or multi-user state management is needed.
6. **Agent definitions are markdown files.** Both GitHub Agents UI and Claude Code consume markdown-based agent instructions.
7. **Conventional commits are the commit format.** All agents produce commits following the `type(scope): description` pattern.
8. **The user's browser can render GitHub markdown.** Status displays and mission documents are formatted in GitHub-Flavored Markdown.
9. **File system paths use forward slashes.** Concert targets Linux/macOS environments (Chromebook Linux terminal).
10. **The current Concert 1 agent/workflow/skill structure is the template for v1.** Concert 2 preserves the same logical structure while potentially changing the implementation.

---

## Open Questions

1. **Package name:** Resolved — using `@he3-org/concert` as the scoped npm package name.
2. **Version check workflow migration:** The current version-check workflow references Go (`go install`). Should it be updated in-place during v1 development, or left as-is until the update mechanism is built?
3. **GitHub Actions auto-continue:** The current auto-continue workflow only checks and signals — it does not actually launch agents. Should v1 implement the actual agent launching, or is the signal sufficient?
4. **Skill auto-discovery mechanism:** The `auto_discover` field in `concert.jsonc` is defined but the discovery mechanism is not specified. How should skills be auto-discovered — by file pattern matching against the codebase?
5. **State file naming:** Resolved — use `state.json` at `docs/concert/state.json`. The `concert-*` prefix is reserved for root-level files; files inside `docs/concert/` are already namespaced by directory.
