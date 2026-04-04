# Concert

AI-guided SDLC orchestration — from vision to verified, shipped code.

## Install / Update

```bash
# Install Concert into any git repo (creates .concert/, agents, workflows, CLAUDE.md section)
npx @he3-org/concert@latest init

# Update managed files to latest version (preserves your concert.jsonc customizations)
npx @he3-org/concert@latest update
```

## Command Cheat Sheet

| Command                | Claude Code         | Copilot / GitHub Agents |
| ---------------------- | ------------------- | ----------------------- |
| Start a new mission    | `/concert:init`     | `@concert-init`         |
| Review a stage         | `/concert:review`   | `@concert-review`       |
| Accept a stage         | `/concert:accept`   | `@concert-accept`       |
| Check current status   | `/concert:status`   | `@concert-status`       |
| Continue to next stage | `/concert:continue` | `@concert-continue`     |
| Debug an issue         | `/concert:debug`    | `@concert-debug`        |
| Fix an error (TDD)     | `/concert:fix`      | `@concert-fix`          |
| Verify work            | `/concert:verify`   | `@concert-verify`       |
| Run a quick task       | `/concert:quick`    | `@concert-quick`        |
| Push state & branch    | `/concert:push`     | `@concert-push`         |
| Restart a stage        | `/concert:restart`  | `@concert-restart`      |
| Replan from a stage    | `/concert:replan`   | `@concert-replan`       |
| Archive mission        | `/concert:archive`  | `@concert-archive`      |

---

## Full Pipeline Stages (Large Feature)

| #   | Stage         | Agent                | Output                                | Description                                                                      |
| --- | ------------- | -------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Vision        | `concert-init`       | `VISION.md`                           | Interactive interview — captures what, who, why, scope, and success criteria     |
| 2   | Requirements  | `concert-analyst`    | `REQUIREMENTS.md`                     | Formalizes testable requirements with acceptance criteria from codebase analysis |
| 3   | Architecture  | `concert-architect`  | `ARCHITECTURE.md`                     | Tech stack decisions, component design, data models, trade-offs                  |
| 4   | UX Design     | `concert-designer`   | `UX.md`                               | User flows, component specs, interaction patterns, accessibility                 |
| 5   | Task Planning | `concert-planner`    | `phases/TASK-*.md`                    | Decomposes work into phased task files with model tier assignments               |
| 6   | Execution     | `concert-coder`      | Code + `PHASE-SUMMARY` files          | Implements tasks with TDD, commits along the way                                 |
| 7   | Verification  | `concert-verifier`   | `VERIFICATION.md`, `COST-REPORT.md`   | Acceptance checks against requirements                                           |
| 8   | Refactoring   | `concert-refactorer` | `docs/REFACTORING-PLAN-YYYY-MM-DD.md` | Prioritized refactoring plan (CRIT/MAJ/MIN/NTH) — human reviews and executes     |
| 9   | Retrospective | _(self-improvement)_ | `CONCERT-IMPROVEMENT.md`              | Analyzes mission telemetry to suggest Concert improvements                       |

> **Note:** Outputs listed above are relative to the active mission folder at `.concert/missions/<mission>/`. Accepted specs are saved separately to `.concert/*-SPEC.md`.

> **Medium missions** skip UX (stage 4). **Small missions** skip requirements, architecture, and UX (stages 2–4).

### Model Recommendations

| Stages            | Recommended Model                                       | Why                                                                               |
| ----------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1–4 (Vision → UX) | **Opus**                                                | Specification stages benefit from deep reasoning for thoroughness and consistency |
| 5 (Task Planning) | **Sonnet**                                              | Task decomposition is structured work — Sonnet handles it efficiently             |
| 6 (Execution)     | **Sonnet** (default), **Opus** for opus-tier task files | Task files specify their model tier; most tasks run well on Sonnet                |
| 7 (Verification)  | **Sonnet**                                              | Mechanical acceptance checking against requirements                               |
| 8 (Refactoring)   | **Opus**                                                | Deep codebase analysis requires strongest reasoning                               |
| 9 (Retrospective) | **Sonnet**                                              | Pattern matching on telemetry data                                                |

---

## Walkthrough: Real-World Example

### 1. Install Concert into your project

```bash
cd my-project
npx @he3-org/concert@latest init
```

This creates `.concert/`, `concert.jsonc`, agent definitions, workflows, and injects the Concert section into your `CLAUDE.md`.

### 2. Start a mission (Claude Code — Opus)

Open Claude Code with an **Opus** model and start a new mission:

```
/concert:init [prompt, file, or blank]
```

Concert interviews you one question at a time — what you're building, who it's for, scope, constraints. It proposes a feature size (small/medium/large) and writes `VISION.md`.

> **⏸ Breakpoint** — Concert pauses here. You can review the vision output before continuing.

### 3. Review the vision

```
/concert:review
```

The reviewer walks through the document with you. It asks if you have changes first, then presents its own concerns one at a time by severity (critical → important → suggestion). You can:

- **Ask questions** — "Why did you include OAuth here?"
- **Request changes** — "Add rate limiting to the scope"
- **Accept as-is** — "Looks good, let's move on"

After changes, the specialist agent re-reviews the updated document. If it has new questions, you'll be guided to review again. If clean, you're prompted to accept.

```
/concert:accept
```

> **⏸ Breakpoint** — After accept, Concert guides you: continue to the next stage or stop here and come back later.

### 4. Continue through specification stages (Opus)

Stay on **Opus** for the specification stages — each one follows the same review cycle:

```
/concert:continue      # → Requirements stage (concert-analyst runs)
```

> **⏸ Breakpoint** — Review the requirements output.

```
/concert:review        # Review requirements, ask questions, request changes
/concert:accept        # Accept requirements → creates .concert/REQUIREMENTS-SPEC.md
```

```
/concert:continue      # → Architecture stage
```

> **⏸ Breakpoint** — Review the architecture output.

```
/concert:review        # Review architecture
/concert:accept        # Accept → .concert/ARCHITECTURE-SPEC.md
```

```
/concert:continue      # → UX Design stage
```

> **⏸ Breakpoint** — Review the UX output.

```
/concert:review
/concert:accept        # Accept → .concert/UX-SPEC.md
```

At every breakpoint between stages, you control whether to continue immediately or pause, review the output files, and come back later with `/concert:continue`.

### 5. Push and switch to Copilot + Sonnet for task planning

Before starting task planning, push your state so you can switch environments:

```
/concert:push
```

Now switch to **GitHub Copilot** coding agent on a **Sonnet-level** model. Task planning is structured decomposition work that Sonnet handles efficiently:

```
@concert-continue      # → Task Planning stage (concert-planner runs)
```

> **⏸ Breakpoint** — Review the generated task files in `phases/`.

```
@concert-review        # Review task plan
@concert-accept        # Accept task plan
```

### 6. Execute tasks (Copilot — Sonnet)

Continue on **Sonnet** for execution. Most task files are assigned haiku or sonnet tier. The coder agent picks up tasks in wave order:

```
@concert-continue      # → Execution starts
```

Concert commits code as it goes. If you need to pause:

```
@concert-push          # Save progress and push
@concert-continue      # Resume later
```

### 7. Verify (Sonnet)

After execution completes:

```
@concert-continue      # → Verification stage
```

The verifier checks implemented code against `REQUIREMENTS-SPEC.md` and produces `VERIFICATION.md` and `COST-REPORT.md`.

### 8. Refactoring plan (Opus)

Switch back to **Opus** for the refactoring stage — deep codebase analysis needs strong reasoning:

```
@concert-continue      # → Refactoring stage
```

The refactoring agent produces a prioritized plan in `docs/REFACTORING-PLAN-YYYY-MM-DD.md` with checkbox items categorized by severity. You review and execute the refactoring items yourself.

### 9. Retrospective (Sonnet)

Switch to **Sonnet** for the final stage:

```
@concert-continue      # → Retrospective
```

Produces `CONCERT-IMPROVEMENT.md` with suggestions for improving Concert's agents and workflows based on mission data.

### 10. Archive

```
@concert-archive       # Clean up mission state for next feature
```

---

## Key Concepts

- **Breakpoints** — Concert pauses after every stage. You always control the pace.
- **Review loop** — `/concert:review` lets you go line-by-line through any stage document, ask questions, and request changes. The specialist agent re-reviews after modifications to catch new issues.
- **Push/continue** — `/concert:push` saves state for environment switching. `/concert:continue` resumes from wherever you left off.
- **Model flexibility** — Use Opus for deep reasoning (specs, refactoring), Sonnet for structured work (tasks, execution, verification).
- **Feature sizes** — `init` proposes small/medium/large. Each size skips stages that aren't needed.

---

## Development

```bash
git clone https://github.com/he3-org/concert.git && cd concert && npm install
npm run build          # Build with tsup
npm test               # Run tests (vitest)
npm run typecheck      # Type check (tsc --noEmit)
```

Releases are automated via [release-please](https://github.com/googleapis/release-please) — merge PRs with conventional commit titles to `main`.
