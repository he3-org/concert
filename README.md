# Concert

Opinionated agentic development lifecycle orchestrator. Concert installs a set of AI agents and commands into your repository that guide you through a structured SDLC — from vision to requirements to architecture to planning to implementation — using Claude Code and GitHub Copilot.

## Quick Start

### Prerequisites

- Node.js ≥ 18
- A git repository (with at least one commit)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI or [GitHub Copilot](https://github.com/features/copilot) with agent mode

### Initialize in a Repository

```bash
npx @he3-org/concert init
```

This creates:

| Path                                | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| `concert.jsonc`                     | Project configuration (edit to customize) |
| `.concert/`                         | State, missions, and workflow definitions |
| `.github/agents/concert-*.agent.md` | GitHub Copilot agent definitions          |
| `.claude/commands/concert-*.md`     | Claude Code slash commands                |
| `CLAUDE.md`                         | Concert section appended (or created)     |

### Update to Latest Version

```bash
npx @he3-org/concert update
```

Update overwrites managed files, merges new config/state fields into your existing `concert.jsonc` and `.concert/state.json`, removes stale files from previous versions, and updates the Concert section in `CLAUDE.md`. Your user-edited values in `concert.jsonc` are preserved.

### Push Work Between Sessions

```bash
npx concert push
```

Stages and commits any pending state changes, then pushes the current branch to origin. Useful for handing off work between Claude Code and GitHub Copilot sessions.

## SDLC Workflow

Concert structures development as a pipeline of specialized agents. Each agent produces a document that feeds the next stage. You drive each stage by invoking the corresponding agent.

```
Vision → Review → Requirements → Review → Architecture → Review → UX Design → Review → Planning → Development
                        ↕                      ↕                      ↕
                    Alignment              Alignment              Alignment
```

### Where to Run Each Stage

| Stages                                        | Recommended Environment                | Why                                                                                                                                                                                                                |
| --------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vision, Requirements, Architecture, UX Design | **Claude Code CLI** or **Copilot CLI** | The review-docs agent conducts interactive conversations — it asks you questions one at a time and refines the document based on your answers. This requires an environment that supports back-and-forth dialogue. |
| Planning, Development                         | **GitHub Copilot cloud agents**        | These stages are autonomous (no conversation needed) and can be long-running. Cloud agents are more cost-effective for model usage and can run unattended.                                                         |

---

### Stage 1: Vision

Create a mission with a product vision document.

```
/concert-vision create Add OAuth2 login with Google and GitHub providers
```

The vision agent researches your codebase and the feature domain, then writes `.concert/missions/<slug>/VISION.md`. In interactive environments, it interviews you to fill gaps.

### Review the Vision

**Run review-docs immediately after creating the vision.** The review-docs agent conducts a structured conversation with you to refine the document — resolving open questions, improving clarity, and catching gaps before they propagate downstream.

```
/concert-review-docs review vision
```

The agent asks you one question at a time, updates the document based on your answers, and marks it for re-evaluation when done. This is the single most valuable step in the pipeline — every issue caught here saves significant rework in later stages.

> **💡 Tip:** Run `review-docs` after creating _every_ spec document (Vision, Requirements, Architecture, UX Design). Each review session catches ambiguities and gaps that would otherwise compound as they flow through the pipeline. The cost of a 5-minute review conversation is far less than reworking an implementation that was built on a vague requirement.

### Re-evaluate After Review

If review-docs modified the vision, re-evaluate to check for new implications:

```
/concert-vision re-evaluate
```

Or re-evaluate all modified documents at once:

```
/concert-review-docs re-evaluate-all
```

The `re-evaluate-all` command scans all mission documents for the `CONCERT:MODIFIED` flag and re-evaluates each in pipeline order (Vision → Requirements → Architecture → UX Design → Alignment → Plan). This is faster than running individual re-evaluate commands.

---

### Stage 2: Requirements

Decompose the vision into functional and non-functional requirements.

```
/concert-requirements create
```

Reads the current mission's `VISION.md` and produces `REQUIREMENTS.md` with SHALL/SHOULD/MAY requirements, dependencies, assumptions, and open questions.

### Alignment Check After Requirements

**Run alignment immediately after creating the requirements.** The alignment agent cross-checks all existing mission documents for contradictions, gaps, and traceability breaks.

```
/concert-alignment check
```

This is especially valuable after requirements because it verifies that every vision goal is covered by at least one requirement and that no requirement was invented without a vision basis.

> **💡 Tip:** Run alignment after creating or modifying _any_ spec document. It catches cross-document inconsistencies that individual agents can't see — a renamed concept in architecture that doesn't match the requirements, a success criterion in the vision with no corresponding acceptance test, etc.

### Review the Requirements

```
/concert-review-docs review requirements
```

Then re-evaluate all modified documents:

```
/concert-review-docs re-evaluate-all
```

---

### Stage 3: Architecture

Design the system to satisfy the requirements.

```
/concert-architect create
```

Reads `VISION.md` and `REQUIREMENTS.md`, researches technologies, and produces `ARCHITECTURE.md` with component design, data models, interfaces, and architectural decision records.

**Then review and align:**

```
/concert-review-docs review architecture
/concert-alignment check
/concert-review-docs re-evaluate-all
```

---

### Stage 4: UX Design (optional)

Design the user experience for features with a UI.

```
/concert-ux-design create
```

Reads all upstream documents and produces `UX-DESIGN.md` with information architecture, navigation flows, component specifications, and accessibility considerations.

**Then review and align:**

```
/concert-review-docs review ux-design
/concert-alignment check
/concert-review-docs re-evaluate-all
```

---

### Stage 5: Planning

Break the architecture into phased, executable task files.

> **🖥️ Switch to GitHub Copilot cloud agents for this stage and development.** Planning is autonomous — no interactive review needed — and cloud agents are more cost-effective for the compute involved.

**GitHub Copilot (cloud agent):**

> Select `concert-planner`, then type: `create`

Produces a `PLAN.md` with phases and individual `TASK-*.md` files. Each task specifies exact files to create/modify, tests to write, acceptance criteria, and a model tier (haiku/sonnet/opus) based on complexity.

### Stage 6: Development

Implement task files with TDD, self-review, and aggressive commits.

**GitHub Copilot (cloud agent):**

> Select `concert-develop`, then type: `implement`

The develop agent reads `DEVELOPMENT-STATUS.md` to find where it left off, then works through task files in order: write tests → implement → commit → self-review → fix → commit → next task. Sessions can be interrupted at any time — progress is saved after every step.

Other develop commands:

- `implement --model sonnet` — process only haiku/sonnet tasks, stop before opus
- `implement --phase 01-foundation` — process tasks in a specific phase
- `implement <path-to-task-file>` — start a specific task
- `status` — show current progress without doing work

## Project Structure

After initialization and running through the SDLC, your repo will contain:

```
your-repo/
├── concert.jsonc                          # Concert configuration
├── CLAUDE.md                              # Concert section with agent instructions
├── .concert/
│   ├── state.json                         # Current mission pointer
│   ├── missions/
│   │   └── <mission-slug>/
│   │       ├── VISION.md                  # Stage 1 output
│   │       ├── REQUIREMENTS.md            # Stage 2 output
│   │       ├── ARCHITECTURE.md            # Stage 3 output
│   │       ├── UX-DESIGN.md               # Stage 4 output (if applicable)
│   │       ├── PLAN.md                    # Stage 5 output
│   │       ├── DEVELOPMENT-STATUS.md      # Stage 6 progress tracker
│   │       └── phases/
│   │           ├── 01-foundation/
│   │           │   ├── TASK-setup-config-haiku.md
│   │           │   └── TASK-core-types-sonnet.md
│   │           └── 02-features/
│   │               └── TASK-api-routes-sonnet.md
│   └── workflows/                         # Execution workflow definitions
├── .github/agents/concert-*.agent.md      # GitHub Copilot agents
└── .claude/commands/concert-*.md          # Claude Code slash commands
```

## Managed Files

Files under `.github/agents/concert-*` and `.claude/commands/concert-*` are managed by Concert. They are overwritten on `concert update` and should not be edited manually. All managed files contain a header:

```
<!-- AUTO-GENERATED BY CONCERT vX.Y.Z — DO NOT EDIT. -->
```

Files with a stale version header are automatically removed during `concert update`.

## Configuration

Edit `concert.jsonc` to customize your project:

```jsonc
{
  // Concert configuration
  "project_name": "my-project",
  "concert_version": "1.13.0",
}
```

Concert preserves your values when updating — only new fields are added and removed fields are cleaned up.

## License

[MIT](LICENSE)
