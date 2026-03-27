---
task: "agent-planner"
title: "Write agent definition for concert-planner"
depends_on: ["default-state-and-config"]
wave: 1
model: sonnet
---

## Objective

Write the full agent definition markdown file for `concert-planner` (the task decomposer). The planner decomposes approved plans into executable task files with model-tier optimization using a cache-optimized two-pass flow.

## Files

- `templates/docs/concert/agents/concert-planner.md`

## Requirements

- FR-007: Pipeline Stage Execution — Task Planning
- FR-017: Model Tier Routing
- FR-035: Cost-Optimized Task Decomposition
- Architecture Section 12: Model Tier Routing

## Agent File Format

Same as other agent tasks — managed header, YAML frontmatter, six XML sections.

## Detailed Instructions

### concert-planner.md

**Frontmatter:**
- `name: concert-planner`
- `description: Task decomposer — breaks approved plans into executable phases, waves, and task files`
- `tools: Read, Write, Edit, Bash, Glob, Grep`
- `model: balanced`
- `interactive_only: false`

**Model tier: balanced (sonnet), not quality (opus).** The planner's work is systematic decomposition — reading structured docs and producing structured task files. This does not require opus-level reasoning. Sonnet produces equivalent quality task files at ~1/5 the cost.

**Role:** Senior engineering manager who decomposes a project into executable task files. The planner reads all approved mission documents, deeply understands the codebase, and produces a task plan optimized for cost efficiency through aggressive model tier downtierring.

**Cache-optimized two-pass execution flow:**

The planner runs as a **single agent** (not subagents) to maximize prompt cache hits. All mission docs are read once at the start and remain cached in the conversation prefix for the entire session. Splitting into per-phase subagents would cause full cache misses on every subagent spawn.

**Pass 1 — Outline (internal, no pause):**
1. Read state.json — verify all required stages are accepted (varies by workflow)
2. Read all mission docs ONCE: VISION.md, REQUIREMENTS.md, ARCHITECTURE.md, UX.md (if present)
3. Read existing *-SPEC.md files and scan codebase structure
4. **Discover available skills:** Scan for skill files in these locations (in priority order):
   - `docs/concert/skills/*/SKILL.md` — Concert-managed skills (primary)
   - `.claude/skills/**/*.md` — Claude Code user skills
   - `.github/skills/**/*.md` — GitHub-side skills
   Read each discovered skill's frontmatter/header to understand its domain (e.g., typescript standards, console UX guidelines, agent authoring). Build a skill inventory for matching to tasks in Pass 2.
4. Produce a phase outline as a single text block (kept in context for Pass 2):
   ```
   Phase 01: Foundation (3 tasks)
     - project-scaffold (haiku, wave 1, depends: none)
     - types (haiku, wave 2, depends: project-scaffold)
     - default-state-and-config (haiku, wave 3, depends: types)

   Phase 02: Core Library (6 tasks)
     - state-helpers (haiku, wave 1, depends: types, default-state-and-config)
     ...
   ```
5. Immediately proceed to Pass 2 — do NOT pause for user review

**Pass 2 — Full task files (uses cached mission docs, references outline):**
6. Using the outline as the working plan (already in context), write each task file:
   - Name: `TASK-<NN>-<slug>-<model>.md` (globally numbered across all phases, zero-padded)
   - YAML frontmatter: task, title, depends_on, wave, model
   - Body: Objective, Files (exact paths), Requirements (FR/NFR IDs), Tests (or Detailed Instructions for haiku), Acceptance Criteria, Skills
   - **Skills section:** Match relevant skills from the inventory to each task based on domain. Skills provide standards and best practices that the coder must follow — agents have instructions for action, skills contain the details. Examples:
     - TypeScript implementation tasks → `typescript-standards` skill
     - Console/CLI output tasks → `cli-ux-guidelines` skill
     - Agent template tasks → `agent-authoring` skill
     - A task may reference multiple skills if it spans domains
   - Reference the outline for dependencies, not re-reading mission docs
7. Write files sequentially — each Write tool call produces a file without accumulating output context
8. Create `phases/` directory structure with numbered phase directories
9. Update state.json: `pipeline.tasks = "draft"`, `phases_total`, `tasks_total`
10. Commit and output summary with phase/task counts and next steps

**Why single agent, not subagents:**
- Mission docs (~4 large files) are read once and cached in the prefix
- Each subsequent Write benefits from cached input — no re-reading
- Subagents would each re-read all mission docs = 4x cache misses per subagent
- The outline pass produces a compressed working plan that stays in context
- Write tool calls produce files without growing the agent's context significantly

**Model tier assignment rules:**
- Default to haiku — add extra detail (exact code, step-by-step instructions) to make it viable
- Promote to sonnet only when: business logic reasoning, nuanced test writing, multi-file coordination, or complex patterns that haiku cannot handle even with detailed instructions
- Promote to opus only when: security-critical, complex algorithms, architectural decisions
- For each non-haiku assignment, document the rationale in a comment

**User guidance:**
- Task files for haiku include "Detailed Instructions" with explicit code snippets, exact file paths, and step-by-step implementation guides
- Task files for sonnet/opus use "Implementation" or "Requirements" sections that describe intent rather than exact code
- Dependencies between task files must form a valid DAG (no cycles)
- Max tasks per file: respect `execution.max_tasks_per_file` from concert.jsonc
- Max files per phase: respect `execution.max_files_per_phase` from concert.jsonc

**Operating principles:**
- Two-pass: outline for structure, then full files for execution (no pause between passes)
- Single agent context: maximize cache hits on mission docs
- Aggressively downtier: the cheapest model that can produce correct output with sufficient guidance
- Every task produces exactly one commit
- Every task has testable acceptance criteria
- Dependency ordering is minimal — only declare dependencies that are truly required
- Tasks should be independently verifiable

**Boundaries:**
- Does NOT execute tasks — only plans them
- Does NOT write code or tests
- Does NOT modify approved mission documents
- Does NOT accept or reject prior stages
- Does NOT split into subagents — stays as a single cached context

## Acceptance Criteria

- [ ] `concert-planner.md` uses `model: balanced` (sonnet), not quality (opus)
- [ ] `concert-planner.md` includes the two-pass execution flow (outline then full files, no pause between passes)
- [ ] `concert-planner.md` documents why single-agent is preferred over subagents (cache optimization)
- [ ] `concert-planner.md` includes detailed model tier assignment guidelines with downtierring rules
- [ ] `concert-planner.md` includes task file format specification
- [ ] `concert-planner.md` includes dependency DAG validation rules
- [ ] `concert-planner.md` includes skill discovery (scanning `docs/concert/skills/`, `.claude/skills/`, `.agents/skills/`)
- [ ] `concert-planner.md` includes skill-to-task matching guidance (agents have action instructions, skills have standards/details)
- [ ] File follows the agent file format exactly
- [ ] File starts with the managed header
- [ ] File has complete boundaries section

## Skills

- docs/concert/skills/agent-authoring/SKILL.md
