# Architecture: Concert 2 v1

## 1. System Overview

Concert 2 has two distinct layers with fundamentally different roles:

**The npm package (`@he3-org/concert`)** is an installer/updater CLI. It copies files into a repository, merges configuration, and pushes branches. It contains zero orchestration logic, zero LLM calls, and zero pipeline intelligence. It is a file-copying tool with a merge strategy.

**The markdown agents** are the brain. Agent definitions (`docs/concert/agents/*.md`), workflow definitions (`docs/concert/workflows/*.md`), and skill files (`docs/concert/skills/*/SKILL.md`) contain all pipeline logic, orchestration rules, review criteria, and execution behavior. These files are interpreted by Claude (via GitHub Agents UI or Claude Code) at runtime.

```
┌─────────────────────────────────────────────────────────┐
│                    Runtime (LLM)                        │
│  Claude Code web UI  ←→  Agent markdown files           │
│  GitHub Agents UI    ←→  Agent markdown files           │
│                                                         │
│  Agents read workflows, skills, state.json, codebase    │
│  Agents write code, docs, state.json, commits           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              npm package (Node CLI)                     │
│  concert init   — copy template files into repo         │
│  concert update — overwrite managed files, merge config │
│  concert push   — commit state + push branch to origin  │
└─────────────────────────────────────────────────────────┘
```

This separation means the npm package can remain extremely simple and stable. All behavioral changes ship as updated markdown files, delivered via `concert update`.

---

## 2. Tech Stack

### Language: TypeScript

**Rationale:** The target user works in a Node/npm ecosystem. TypeScript provides type safety for the CLI's file manipulation and JSON merging logic without introducing a foreign runtime. The codebase is small enough that TypeScript's overhead is minimal.

**Alternatives considered:**
- **Go (Concert 1):** Rejected — harder to debug, cross-compile adds complexity, and the user already has Node available via npx.
- **Plain JavaScript:** Rejected — type safety for JSON schema merging is valuable enough to warrant TypeScript.
- **Shell scripts:** Rejected — cross-platform concerns and the merge logic is complex enough to warrant a real language.

### Build: tsup

**Rationale:** tsup bundles TypeScript to a single CJS entry point with zero configuration. The CLI is small (3 commands), so a heavyweight build system is unnecessary. tsup handles declaration files for any future programmatic API.

**Alternatives considered:**
- **tsc only:** Rejected — produces multiple files, requires runtime resolution of imports.
- **esbuild directly:** Viable, but tsup wraps esbuild with better defaults for library/CLI output.
- **Rollup/Webpack:** Rejected — excessive for a CLI that copies files.

### CLI Framework: None (raw process.argv)

**Rationale:** The CLI has exactly 3 commands (`init`, `update`, `push`) with no flags beyond `--help` and `--version`. A CLI framework adds dependency weight for zero value. If a fourth command emerges, reassess.

**Alternatives considered:**
- **Commander/yargs:** Rejected — adds a dependency for 3 commands with no flags. The argument parsing is trivial.
- **citty/clerc:** Lighter alternatives, but still unnecessary for the current scope.

### JSON Merging: Custom (deepMergeJsonc)

**Rationale:** The merge logic for `concert.jsonc` and `state.json` has specific semantics (preserve user values, add new fields, remove deprecated fields) that no generic deep-merge library handles correctly. A purpose-built ~50-line function is more maintainable than configuring a generic library.

**Alternatives considered:**
- **deepmerge/lodash.merge:** Rejected — cannot express "add new keys, preserve existing values, remove deprecated keys" in a single pass.
- **JSON Patch (RFC 6902):** Rejected — requires generating patch documents per version transition, which is more complex than the merge function itself.

### JSONC Parsing: jsonc-parser (from VS Code)

**Rationale:** `concert.jsonc` uses JSON with comments. The `jsonc-parser` package (extracted from VS Code) is the standard library for this. It handles comments and trailing commas correctly. Small, well-maintained, no transitive dependencies.

**Alternatives considered:**
- **Strip comments then JSON.parse:** Fragile — breaks on edge cases (comments inside strings).
- **json5:** Parses a superset of JSON but does not round-trip comments. Since we need to preserve user comments in concert.jsonc during merges, json5 is insufficient alone. However, for read-only parsing, either works.

### File Copying: Node fs (no templating engine)

**Rationale:** All template files are static markdown and YAML. There are no dynamic variables to interpolate at init time (project_name comes from `concert.jsonc`, not from template expansion). Plain `fs.cpSync` with recursive directory copy is sufficient.

**Alternatives considered:**
- **Handlebars/EJS templating:** Rejected — no template variables exist in the current design. If future versions need interpolation, add it then.
- **degit/tiged:** Rejected — pulls from git repos, adds network dependency during init.

---

## 3. npm Package Structure

```
@he3-org/concert/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── cli.ts                  # Entry point — routes to init/update/push
│   ├── commands/
│   │   ├── init.ts             # Copy templates, create initial state/config
│   │   ├── update.ts           # Overwrite managed files, merge state/config
│   │   └── push.ts             # Commit state, push branch
│   ├── lib/
│   │   ├── copy.ts             # Recursive file copying with header detection
│   │   ├── merge.ts            # JSONC/JSON surgical merge logic
│   │   ├── git.ts              # Git operations (commit, push, branch detection)
│   │   ├── state.ts            # state.json schema, read/write helpers
│   │   ├── config.ts           # concert.jsonc schema, read/write helpers
│   │   └── version.ts          # Version comparison for update checks
│   └── types.ts                # Shared TypeScript types
├── templates/                  # Files copied into target repos
│   ├── docs/concert/
│   │   ├── agents/             # All agent .md files
│   │   ├── workflows/          # All workflow .md files
│   │   ├── skills/             # Default skill files
│   │   ├── missions/.gitkeep
│   │   ├── state.json          # Initial empty state
│   │   └── README.md
│   ├── .github/
│   │   ├── agents/             # GitHub Agent definition stubs
│   │   └── workflows/          # GitHub Actions workflow files
│   ├── .claude/
│   │   └── commands/           # Claude Code skill commands
│   ├── concert.jsonc           # Default configuration
│   └── CLAUDE.md               # Default CLAUDE.md additions
└── dist/                       # Built output (gitignored)
    └── cli.js                  # Single bundled CJS file
```

### package.json (key fields)

```json
{
  "name": "@he3-org/concert",
  "bin": {
    "concert": "./dist/cli.js"
  },
  "files": ["dist", "templates"],
  "type": "module"
}
```

The `bin` entry allows `npx @he3-org/concert init` to work. The `files` array ensures templates are included in the published package. The `templates/` directory ships as-is — no compilation, no bundling.

### Template Versioning

Each template file carries a version comment in its managed header:

```markdown
<!-- AUTO-GENERATED BY CONCERT v0.3.0 — DO NOT EDIT ... -->
```

The `update` command reads these headers to determine which files need updating. Files without version headers are assumed to be from v0.0.0 and are always overwritten.

---

## 4. CLI Command Design

### `concert init`

```
1. Verify cwd is a git repo (check for .git/)
2. Check for existing Concert installation:
   a. If docs/concert/ exists → warn, ask to overwrite or abort
   b. If concert.jsonc exists → warn, ask to merge or abort
3. Copy templates/ → cwd recursively
4. Create docs/concert/state.json with empty schema
5. Create concert.jsonc with defaults (project_name from package.json or directory name)
6. Print summary: files created, next steps
```

**No LLM interaction.** Init is a pure file operation.

### `concert update`

```
1. Verify cwd has an existing Concert installation
2. Read current concert.jsonc and state.json
3. For managed files (agents, workflows, skills, GitHub agents, GitHub workflows):
   a. Compare version headers — skip files already at current version
   b. Overwrite with new versions from templates/
4. For concert.jsonc:
   a. Read template default config
   b. Read user's current config
   c. Surgical merge: add new fields with defaults, preserve existing user values, remove deprecated fields, preserve comments where possible
5. For state.json:
   a. Read current state
   b. Add any new schema fields with default values
   c. Preserve all existing data
   d. Remove fields no longer in schema
6. Print summary: files updated, fields added/removed, next steps
```

**Comment preservation strategy for concert.jsonc:** Use `jsonc-parser`'s `modify` API, which produces edits that preserve surrounding text (including comments). Apply edits sequentially: first add new fields, then remove deprecated ones. This avoids re-serializing the entire file.

### `concert push`

```
1. Read state.json
2. If quality_loop_state exists and is active:
   a. Ensure quality_loop_state is fully written to state.json
   b. Stage state.json
3. Stage any unstaged tracked files that are part of the current task (read from state.json execution position)
4. If there are staged changes:
   a. Commit with message: "chore: concert-push handoff"
5. Push current branch to origin
6. Print summary: branch, commits pushed, quality_loop_state if saved, next steps for other environment
```

**No LLM interaction.** Push is a pure git operation. This is critical — it must work when the user's Claude Code plan usage is exhausted.

---

## 5. Agent/Workflow/Skill File Architecture

### Agent Files

Each agent is defined in two places:

1. **Full definition:** `docs/concert/agents/concert-<name>.md` — contains the complete agent instructions, role, workflow integration, execution flow, operating principles, and boundaries.

2. **GitHub stub:** `.github/agents/concert-<name>.agent.md` — a minimal file that GitHub Agents UI discovers, containing only `name` and `description` frontmatter and a `Read docs/concert/agents/concert-<name>.md` instruction to load the full definition.

3. **Claude Code command:** `.claude/commands/<name>.md` — a skill file that Claude Code discovers via `/concert:<name>`, containing steps that reference the full agent definition.

This three-file pattern ensures the full agent definition is the single source of truth. Both GitHub and Claude Code load it dynamically.

**Agent file format:**

```markdown
<!-- AUTO-GENERATED BY CONCERT v0.3.0 — DO NOT EDIT ... -->

---
name: concert-<name>
description: <one-line description>
tools: <comma-separated tool list>
model: <quality|balanced|budget>
interactive_only: <true|false>
---

<role>...</role>
<workflow_integration>...</workflow_integration>
<execution_flow>...</execution_flow>
<user_guidance>...</user_guidance>
<operating_principles>...</operating_principles>
<boundaries>...</boundaries>
```

### Workflow Files

Workflow files define orchestration rules, not code. They are read by agents at runtime to determine behavior.

```
docs/concert/workflows/
├── CONCERT-WORKFLOW-MISSION-FULL.md      # Large feature pipeline (all stages)
├── CONCERT-WORKFLOW-MISSION-MEDIUM.md    # Medium feature pipeline (skip UX)
├── CONCERT-WORKFLOW-MISSION-SMALL.md     # Small feature pipeline (vision + tasks only)
├── CONCERT-WORKFLOW-EXECUTION.md         # Phase/wave/task execution rules
├── CONCERT-WORKFLOW-CODE-QUALITY.md      # Orchestrator-coder-reviewer loop
├── CONCERT-WORKFLOW-REVIEW-CYCLE.md      # Review/accept/restart cycle
├── CONCERT-WORKFLOW-OBSERVABILITY.md     # Telemetry and logging rules
└── CONCERT-WORKFLOW-SELF-IMPROVEMENT.md  # Retrospective analysis rules
```

Workflows reference agents by name. Agents read workflows by path. This indirection means either can be updated independently.

### Skill Files

```
docs/concert/skills/<skill-name>/
└── SKILL.md
```

Skills declare file patterns they apply to:

```markdown
---
name: <skill-name>
applies_to: ["**/*.ts", "**/*.tsx"]
---
```

Auto-discovery: when `skills.auto_discover` is true in `concert.jsonc`, agents scan `docs/concert/skills/` for SKILL.md files and match their `applies_to` patterns against the files being modified by the current task. Matching skills are loaded into context.

---

## 6. State Management

### state.json Schema

```typescript
interface ConcertState {
  // Identity
  mission: string;                    // Mission slug
  mission_path: string;               // Path to mission folder
  workflow: string;                    // Active workflow name
  workflow_path: string;              // Path to workflow file
  branch: string;                     // Git branch name
  pr_number: number;                  // PR number (0 if none)
  feature_size: string;               // "small" | "medium" | "large"

  // Pipeline
  stage: string;                      // Current stage name
  pipeline: Record<string, string>;   // Stage → status (pending|draft|accepted)

  // Execution progress
  phases_completed: number;
  phases_total: number;
  tasks_completed: number;
  tasks_total: number;
  commits: number;
  current_phase?: number;             // Active phase number
  current_task_file?: string;         // Active task file
  current_task_index?: number;        // Active task within file

  // Cost tracking
  cost: {
    estimated_remaining: string;
    spent_this_mission: string;
    by_stage: Record<string, string>;
  };

  // Active states (nullable — present only when in progress)
  failure?: FailureBlock | null;
  debug_state?: DebugState | null;
  quality_loop_state?: QualityLoopState | null;

  // Logs
  blockers: string[];
  telemetry: TelemetryRecord[];
  failure_log: FailureSummary[];
  history: HistoryEntry[];
  next_steps: string[];
}

interface QualityLoopState {
  task_file: string;
  task_index: number;
  iteration: number;                  // 1-indexed, up to max_review_iterations
  phase: "coder" | "reviewer";       // Which role was active when halted
  prior_findings: ReviewFinding[];    // Findings from completed iterations
  coder_commits: string[];            // Commit SHAs from coder work
}

interface FailureBlock {
  phase: number;
  phase_name: string;
  task_file: string;
  task_index: number;
  task_title: string;
  failed_at: string;                  // ISO 8601
  error_type: string;                 // From error taxonomy
  error_summary: string;
  files_touched: string[];
  last_successful_commit: string;
}

interface TelemetryRecord {
  task_file: string;
  task_index: number;
  phase: number;
  model_assigned: "haiku" | "sonnet" | "opus";
  confidence: "high" | "medium" | "low";
  review_result: "PASS" | "NTH" | "MIN" | "MAJ" | "CRIT" | "none";
  revision_count: number;
  skills_loaded: string[];
  files_changed: number;
  completed_at: string;               // ISO 8601
}
```

### Surgical Merge Strategy

The `update` command merges state.json using these rules:

| Scenario | Behavior |
|----------|----------|
| New field in schema, absent in user's file | Add with default value |
| Field exists in both schema and user's file | Preserve user's value |
| Field removed from schema | Remove from user's file |
| Nested object (e.g., `pipeline`) | Recursive merge — same rules apply |
| Array fields (`history`, `telemetry`, etc.) | Preserve user's array as-is |
| Type mismatch (schema says number, user has string) | Preserve user's value, log warning |

For `concert.jsonc`, the same rules apply, with the addition of comment preservation via `jsonc-parser`'s edit API.

### Forward Compatibility

All state reads use optional access with defaults:

```typescript
const iteration = state.quality_loop_state?.iteration ?? 1;
```

This means a state.json from an older Concert version works with newer agents — missing fields fall back to defaults. New fields are added on the next state write.

---

## 7. GitHub Agentic Workflow Generation

Concert workflow definitions (`.md` files in `docs/concert/workflows/`) are the design-layer source of truth. During `init` and `update`, the npm package generates:

1. **GitHub agent stubs** (`.github/agents/concert-<name>.agent.md`) — one per agent, pointing to the full definition.
2. **GitHub Actions workflows** (`.github/workflows/concert-*.yml`) — the auto-continue and version-check workflows.

The generation is straightforward file copying from `templates/`, not a transformation engine. The Concert workflow `.md` files define orchestration logic for agents to follow at runtime. The GitHub workflow `.yml` files define CI/CD triggers. These are separate concerns:

- **Concert workflows** tell agents *what to do* (read by Claude at runtime)
- **GitHub workflows** tell GitHub Actions *when to trigger* (read by GitHub's CI system)

There is no code generation from `.md` to `.yml`. Both are maintained as templates in the npm package and copied during init/update.

**Trade-off:** This means adding a new Concert workflow does not auto-generate a new GitHub Actions workflow. For v1, this is acceptable — the set of GitHub workflows is small and stable (auto-continue, version-check). If future versions need dynamic workflow generation, the `templates/` directory can be replaced with a generation step.

**Lock files (.lock.yml):** If GitHub's agentic workflow infrastructure requires dual-file format (markdown + lock), the lock files are generated as static templates alongside the markdown stubs. The lock file content mirrors the agent stub — it locks the agent to a specific Concert version's definition.

**Future consideration (out of scope for v1):** A PR-triggered GitHub workflow that validates and/or fixes `state.json` consistency against the branch and PR — verifying the correct branch name, PR number, and pipeline status match what's actually on the branch. This would catch state drift caused by manual edits, failed handoffs, or out-of-band branch operations.

---

## 8. Code Quality Loop Architecture

### Interaction Model

```
┌──────────────┐
│ Orchestrator │  Keeps ~15% context. Passes file paths, not contents.
│ (runner)     │  Spawns fresh subagents per task.
└──────┬───────┘
       │
       ├──→ Spawn Coder (model from task frontmatter)
       │    ├── Read task file, skills, specs
       │    ├── TDD: tests → implement → verify
       │    ├── Commit
       │    └── Return confidence + commit SHA
       │
       ├──→ Spawn Reviewer (balanced model)
       │    ├── Read task file, skills, diff
       │    ├── Rate findings: CRIT/MAJ/MIN/NTH/PASS
       │    └── Return structured review
       │
       ├── If CRIT/MAJ: spawn Coder again with findings
       │    └── (repeat up to max_review_iterations)
       │
       └── On PASS or max iterations with only MIN/NTH:
            ├── Update state.json
            ├── Update PHASE-SUMMARY
            └── Proceed to next task

After all tasks in a phase complete:
       ├── Spawn Documentation Agent
       │    ├── Read PHASE-SUMMARY + all phase commits
       │    ├── Update higher-level docs (README, API docs, guides)
       │    └── Single conventional commit with all doc updates
       └── Mark phase complete
```

### State Tracking (quality_loop_state)

The `quality_loop_state` in `state.json` enables crash recovery and cross-environment handoff mid-loop:

```json
{
  "quality_loop_state": {
    "task_file": "TASK-2026-03-28-auth-middleware-sonnet.md",
    "task_index": 2,
    "iteration": 2,
    "phase": "reviewer",
    "prior_findings": [
      { "severity": "MAJ", "file": "src/auth.ts", "line": 42, "issue": "...", "resolved": true },
      { "severity": "MIN", "file": "src/auth.ts", "line": 15, "issue": "...", "resolved": false }
    ],
    "coder_commits": ["abc1234", "def5678"]
  }
}
```

When `concert-continue` reads this state, it knows:
- We are on task 2 of the auth-middleware task file
- The coder has run twice (iterations 1 and 2)
- The reviewer was about to run for iteration 2
- One MAJ finding was resolved, one MIN remains
- The coder's commits are preserved (not lost)

The continuation agent picks up at "spawn reviewer for iteration 2" without re-running the coder.

### Loop Availability

The full orchestrator-coder-reviewer loop is used for **every task** in both environments:

- **Claude Code:** Orchestrator spawns coder and reviewer subagents via the Task tool
- **GitHub Agents UI:** Orchestrator agent calls coder and reviewer subagents within the same session

There is no simple/bypass mode. Every task gets the full quality loop regardless of complexity. The cost of the loop is always justified by the reduction in downstream debugging and rework.

---

## 9. Branch and PR Strategy

### Branch Creation

All mission work happens on a dedicated branch. The branch is created during mission initialization (`concert-init` agent), not during `concert init` (npm CLI bootstrapping):

| Environment | Branch Behavior |
|-------------|----------------|
| CC Web UI | Branch auto-created by CC when session starts — `concert-init` detects and uses it |
| GitHub Agents UI | Branch auto-created by GitHub — `concert-init` detects and uses it |
| CC CLI | `concert-init` creates a mission branch (e.g., `concert/<slug>`) and pushes to origin |

The branch name is recorded in `state.json` → `branch`.

### WIP PR as Status Display

A WIP PR is the single human-readable status display across all environments:

- Created during mission initialization (by the agent, not the npm CLI)
- PR body is updated with pipeline progress after each stage transition and phase completion
- Shows visual pipeline, current position, recent history
- PR number is recorded in `state.json` → `pr_number`
- No STATUS.md alternative — the WIP PR is the only status display

### PR Merge Gate

A GitHub Actions CI workflow runs the full test suite on every push to the mission branch. The PR cannot be merged unless all tests pass. This is the regression safety net — individual coder agents run tests as part of TDD, but the CI gate catches anything that slips through (e.g., cross-task regressions, environment-specific failures).

This simplifies the logic: no `status_display` config option, no switching between display modes, and consistent status location regardless of which environment you're working in.

---

## 10. Cross-Environment Handoff

### The Problem

A developer working in Claude Code may exhaust plan usage mid-execution. They need to hand off to GitHub Agents UI to continue. The reverse also happens — GitHub sessions timeout and the developer continues in Claude Code.

### The Solution: concert-push + quality_loop_state

```
Claude Code session (plan exhausted)
  │
  ├── Plan usage exhausted (undetectable — session just stops)
  ├── State.json reflects last committed task
  ├── quality_loop_state saved if mid-loop (from last commit)
  │
  ▼
  User runs: npx @he3-org/concert push
  │
  ├── Commits any uncommitted state changes
  ├── Pushes branch to origin
  ├── Outputs: "Run concert-continue in GitHub Agents UI"
  │
  ▼
GitHub Agents UI
  │
  ├── User selects concert-continue agent
  ├── Agent reads state.json from the branch
  ├── Detects quality_loop_state → resumes at correct position
  ├── Continues execution
  └── Commits progress, updates state.json
```

**Key constraint:** `concert push` is a pure Node CLI command. It runs without an LLM session. This is essential because the most common trigger for handoff is exhausted plan usage — the user cannot start a new Claude session to push.

### Environment Detection

Agents detect their environment to adjust behavior:

| Signal | Environment |
|--------|-------------|
| Task tool available | Claude Code |
| Task tool unavailable | GitHub Agents UI (or other) |
| `process.env.GITHUB_ACTIONS` | GitHub Actions CI |

The npm CLI (`concert push`) does not need environment detection — it always runs locally.

---

## 11. Plan Usage Exhaustion (Deferred)

**Context/plan usage gating is deferred until Claude Code exposes plan usage programmatically.**

Claude Code does not currently provide a way for agents to read the plan usage percentage. The `/usage` UI widget shows it, but there is no API or environment variable to access it programmatically.

When plan usage is exhausted mid-session, the session simply stops. This is handled as an undetectable halt:

1. State.json reflects the last committed task (state is committed after every task completion)
2. The user runs `npx @he3-org/concert push` to push any uncommitted work to origin
3. The user runs `concert-continue` in another environment (GitHub Agents UI) to resume

**Future:** When CC provides programmatic plan usage access, implement gating at task boundaries — check usage before each new task and stop early with handoff instructions if the threshold is exceeded. The configurable threshold (`execution.max_plan_usage_percent`) and gating logic are straightforward to add once the data is available.

---

## 12. Model Tier Routing

### Configuration

```jsonc
// concert.jsonc
{
  "model_tiers": {
    // Claude Code: orchestrator spawns subagents with these models per task
    "claude_code": {
      "haiku": "claude-haiku-4-5-20251001",
      "sonnet": "claude-sonnet-4-6",
      "opus": "claude-opus-4-6"
    }
    // GitHub: model is selected by the user in the UI per session.
    // Task files are grouped by tier so the user launches separate sessions
    // per model. No config needed — the UI controls the model.
  }
}
```

### Routing Logic

The routing model differs by environment because of a key constraint: **GitHub Agents UI does not allow subagents to choose a different model than the one the user selected for the session.**

**Claude Code:**
```
1. Read task file frontmatter → model field (haiku|sonnet|opus)
2. Look up model_tiers["claude_code"][model] → resolved model ID
3. Spawn subagent with the resolved model
```
The orchestrator routes each task to its assigned model tier. Per-task model routing works because Claude Code's Task tool supports specifying the model for subagents.

**GitHub Agents UI:**
```
1. User selects an agent and a model in the GitHub UI
2. All tasks in that session run on the selected model
3. Task files are grouped by model tier so the user can launch separate sessions per tier
```
The planner groups tasks into task files by model tier. The user launches `concert-continue` multiple times — once with sonnet selected for sonnet-tier task files, once with opus for opus-tier files. The agent skips task files that don't match the session's model tier, or the user specifies which tier to run.

This is why task filenames include the model suffix (e.g., `TASK-2026-03-28-auth-middleware-sonnet.md`) — it tells the user which model to select in the GitHub UI.

### Task Assignment Guidelines (for the planner agent)

| Tier | Use When |
|------|----------|
| haiku | Scaffolding, config files, boilerplate, type definitions, simple CRUD, file copying |
| sonnet | Business logic, API endpoints, test suites, multi-file coordination, data validation |
| opus | Security-critical code, complex algorithms, architectural decisions, cross-cutting concerns |

The planner actively downtiers: for tasks that would naturally require sonnet, the planner adds extra detail (explicit file paths, code snippets, step-by-step instructions) so haiku can handle them. The goal is to maximize haiku usage for cost efficiency.

---

## 13. Update Mechanism

### File Categories

| Category | Update Behavior | How Identified |
|----------|----------------|----------------|
| Managed files | Overwrite entirely | Have `AUTO-GENERATED BY CONCERT` header |
| User config (`concert.jsonc`) | Surgical merge | Known path, always present |
| User state (`state.json`) | Surgical merge | Known path, always present |
| User content (mission files) | Never touched | Inside `docs/concert/missions/` |
| CLAUDE.md | Append-only | Known path, checked for Concert section |

### Version Tracking

The npm package version is embedded in managed file headers:

```
<!-- AUTO-GENERATED BY CONCERT v0.3.0 — DO NOT EDIT -->
```

During update:
1. Read the header of each managed file in the repo
2. Compare its version to the npm package's version
3. If older → overwrite with new version
4. If same → skip (already current)
5. If newer → warn (user somehow has a newer version than the package)

### CLAUDE.md Handling

CLAUDE.md is special — it contains both Concert-managed content (command references) and user-written content. The update command:

1. Reads the existing CLAUDE.md
2. Looks for the Concert section (delimited by markers)
3. Replaces only the Concert section, preserving everything else
4. If no Concert section exists, appends it

```markdown
<!-- CONCERT:START — DO NOT MODIFY THIS SECTION. It is managed by Concert and will be overwritten on `concert update`. -->
## Commands
- `/concert:init` — Start a new mission
...
<!-- CONCERT:END — DO NOT MODIFY THIS SECTION -->
```

---

## 14. Documentation Currency

### Hybrid Approach

Documentation is kept current through two mechanisms:

**Inline (during quality loop):** The coder updates documentation within files it already touches — inline comments, JSDoc/TSDoc, function-level docs. The reviewer flags missing or outdated inline docs as MIN findings. This keeps the coder focused on its current files and preserves cache optimization.

**Phase-level (after each phase):** After all tasks in a phase complete, a documentation agent runs. It reads the PHASE-SUMMARY and all commits from the phase, then updates higher-level documentation (README sections, API docs, architecture docs, guides). It produces a single conventional commit with all doc updates.

**Trade-off:** The coder does not update external documentation files (README, API docs). This is intentional — the coder has a fragmented view (one task at a time), while the documentation agent has a holistic view (all tasks in the phase). The cost is a slight delay in doc currency (docs are updated after the phase, not after each task). The benefit is better-quality documentation from a broader perspective.

---

## 15. Security Considerations

### Managed File Headers

All managed files carry headers that warn against manual editing. This prevents users from customizing agent behavior in ways that would be lost on update. Users who want custom behavior should create separate skill files or agent extensions.

### State.json as Source of Truth

State.json is committed to git after every mutation. This means:
- History of all state changes is in git log
- Unauthorized state modifications are visible in diffs
- State can be recovered from any prior commit

### concert-push Safety

The push command never does destructive operations:
- No force push
- No branch deletion
- No file deletion
- No state reset
- Fails safely if nothing to push

### No Secrets in State

State.json, concert.jsonc, and all agent files are committed to git. No secrets, API keys, or credentials should ever be stored in these files. The agents use environment-provided authentication (GitHub token, Claude API key) which are never written to disk by Concert.

### Dependency Minimalism

The npm package targets fewer than 20 production dependencies. Each dependency is evaluated for:
- Maintenance status (updated within 12 months)
- No native compilation requirements
- No unnecessary transitive dependency trees
- Known security track record

---

## 16. Trade-offs and Alternatives

### Decision: No Dynamic Template Expansion

**Chose:** Static file copying from `templates/`
**Over:** Template engine (Handlebars, EJS) with variable interpolation
**Why:** No variables need interpolation in current templates. The `project_name` in concert.jsonc is set by the init command after copying, not during template expansion. Static copying is simpler, debuggable, and has zero edge cases.
**Risk:** If future templates need dynamic content, we will need to add a template step. This is low-risk because the template set is small and controlled.

### Decision: Single state.json vs. Separate State Files

**Chose:** Single `docs/concert/state.json` for all state
**Over:** Separate files for execution state, telemetry, failure log, etc.
**Why:** Single file means single commit for state updates. Separate files would require multi-file atomic commits or risk inconsistent state. The file size concern is mitigated by the fact that telemetry and failure_log arrays grow slowly (one entry per task/failure).
**Risk:** For very large missions (100+ tasks), telemetry array could make state.json large. Mitigation: the retrospective agent archives telemetry to a separate file at mission end.

### Decision: File Copying vs. Git Subtree/Submodule

**Chose:** Copy files from npm package into target repo
**Over:** Git subtree or submodule pointing to Concert repo
**Why:** Subtrees and submodules add git complexity that creates friction for a single developer. Copied files are self-contained — the repo works even if the Concert npm package disappears. The update command replaces files, which is simpler than subtree merges.
**Risk:** File drift if updates are not run. Mitigation: version headers in managed files make drift visible.

### Decision: No Programmatic API (v1)

**Chose:** CLI-only interface (3 commands)
**Over:** Exposing Concert as a library with a programmatic API
**Why:** There is no consumer for a programmatic API. The agents interact with Concert through file reads/writes and git operations, not function calls. Adding an API would add surface area with no user.
**Risk:** If future integrations need programmatic access, we will need to refactor. Low-risk because the core logic (copy, merge, push) is already in library functions internally.

### Decision: Agents Read Workflows at Runtime vs. Compiled Behavior

**Chose:** Agents read workflow .md files at runtime and follow them
**Over:** "Compiling" workflow definitions into agent behavior at build time
**Why:** Runtime reading means workflow changes take effect immediately without rebuilding agents. It also means the workflow files serve as both documentation and executable specification. The cost is agents spending context tokens reading workflow files, but this is a small fraction of the context window.
**Risk:** Agents may misinterpret workflow files. Mitigation: workflow files use structured formats (tables, numbered steps) that LLMs parse reliably.

### Decision: Orchestrator Spawns Fresh Subagents vs. Persistent Workers

**Chose:** Fresh subagent per task via Task tool
**Over:** Persistent coder/reviewer agents that handle multiple tasks
**Why:** Fresh subagents get clean context windows — no accumulation of irrelevant context from prior tasks. This is critical for haiku-tier tasks where context efficiency directly impacts quality. The overhead of spawning is negligible compared to the task execution time.
**Risk:** Subagent spawn latency adds up for phases with many small tasks. Acceptable for v1 — if problematic, batching can be added later.

---

## 17. Dependency Budget

Target: fewer than 20 production dependencies.

| Dependency | Purpose | Approx Size |
|-----------|---------|-------------|
| jsonc-parser | Parse/modify concert.jsonc with comment preservation | ~50KB |

That is the only required external dependency for v1. All other functionality (file copying, git operations, JSON parsing, CLI argument routing) uses Node built-in APIs:

- `node:fs` — file operations
- `node:path` — path manipulation
- `node:child_process` — git commands (`execSync`)
- `node:process` — argv, cwd, exit codes
- `JSON.parse/stringify` — state.json (plain JSON, no comments)

**Trade-off:** Using `child_process.execSync` for git instead of a library like `simple-git` keeps dependencies at 1 but means we handle git errors via exit codes and stderr parsing. For the 4-5 git operations Concert performs (status, add, commit, push), this is acceptable.

