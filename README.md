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

| Path | Purpose |
|---|---|
| `concert.jsonc` | Project configuration (edit to customize) |
| `.concert/` | State, missions, and workflow definitions |
| `.github/agents/concert-*.agent.md` | GitHub Copilot agent definitions |
| `.claude/commands/concert-*.md` | Claude Code slash commands |
| `CLAUDE.md` | Concert section appended (or created) |

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
Vision → Requirements → Architecture → UX Design → Planning → Development
                              ↕
                    Alignment (cross-check)
                    Review-Docs (refine any document)
```

### Stage 1: Vision

Create a mission with a product vision document.

**Claude Code:**
```
/concert-vision create Add OAuth2 login with Google and GitHub providers
```

**GitHub Copilot (agent mode):**
> Select the `concert-vision` agent, then type:
> `create Add OAuth2 login with Google and GitHub providers`

The vision agent researches your codebase and the feature domain, then writes `.concert/missions/<slug>/VISION.md`. If running in an interactive environment (Claude Code CLI, Copilot CLI/VS Code), it interviews you to fill gaps.

### Stage 2: Requirements

Decompose the vision into functional and non-functional requirements.

**Claude Code:**
```
/concert-requirements create
```

**GitHub Copilot:**
> Select `concert-requirements`, then type: `create`

Reads the current mission's `VISION.md` and produces `REQUIREMENTS.md` with SHALL/SHOULD/MAY requirements, dependencies, assumptions, and open questions.

### Stage 3: Architecture

Design the system to satisfy the requirements.

**Claude Code:**
```
/concert-architect create
```

**GitHub Copilot:**
> Select `concert-architect`, then type: `create`

Reads `VISION.md` and `REQUIREMENTS.md`, researches technologies, and produces `ARCHITECTURE.md` with component design, data models, interfaces, and architectural decision records.

### Stage 4: UX Design (optional)

Design the user experience for features with a UI.

**Claude Code:**
```
/concert-ux-design create
```

**GitHub Copilot:**
> Select `concert-ux-design`, then type: `create`

Reads all upstream documents and produces `UX-DESIGN.md` with information architecture, navigation flows, component specifications, and accessibility considerations.

### Stage 5: Planning

Break the architecture into phased, executable task files.

**Claude Code:**
```
/concert-planner create
```

**GitHub Copilot:**
> Select `concert-planner`, then type: `create`

Produces a `PLAN.md` with phases and individual `TASK-*.md` files. Each task specifies exact files to create/modify, tests to write, acceptance criteria, and a model tier (haiku/sonnet/opus) based on complexity.

### Stage 6: Development

Implement task files with TDD, self-review, and aggressive commits.

**Claude Code:**
```
/concert-develop implement
```

**GitHub Copilot:**
> Select `concert-develop`, then type: `implement`

The develop agent reads `DEVELOPMENT-STATUS.md` to find where it left off, then works through task files in order: write tests → implement → commit → self-review → fix → commit → next task. Sessions can be interrupted at any time — progress is saved after every step.

Other develop commands:
- `implement --model sonnet` — process only haiku/sonnet tasks, stop before opus
- `implement --phase 01-foundation` — process tasks in a specific phase
- `implement <path-to-task-file>` — start a specific task
- `status` — show current progress without doing work

### Supporting Agents

#### Alignment Check

Validate cross-document consistency at any point in the pipeline.

```
/concert-alignment check
```

Scans all mission documents and reports contradictions, gaps, orphaned content, and traceability breaks.

#### Document Review

Interactively refine any mission document.

```
/concert-review-docs review VISION.md
```

Conducts a structured review conversation, asking one question at a time and tracking modifications.

#### Re-evaluation

After a document is modified by review, the original authoring agent can re-evaluate it:

```
/concert-vision re-evaluate
```

Checks whether the modifications introduce new concerns that need to be addressed.

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
  "concert_version": "1.13.0"
}
```

Concert preserves your values when updating — only new fields are added and removed fields are cleaned up.

## License

[MIT](LICENSE)
