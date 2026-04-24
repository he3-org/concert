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
Vision → Review → Requirements → Review → Architecture → Review → UX Design → Review → Planning → Development → Development Review → Fix Gaps → Re-review → Finish → Refactor
                        ↕                      ↕                      ↕
                    Alignment              Alignment              Alignment
```

### Where to Run Each Stage

| Stages                                                      | Recommended Environment                | Why                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vision, Requirements, Architecture, UX Design               | **Claude Code CLI** or **Copilot CLI** | The review-docs agent conducts interactive conversations — it asks you questions one at a time and refines the document based on your answers. This requires an environment that supports back-and-forth dialogue. |
| Planning, Development, Development Review, Finish, Refactor | **GitHub Copilot cloud agents**        | These stages are autonomous (no conversation needed) and can be long-running. Cloud agents are more cost-effective for model usage and can run unattended.                                                         |

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
- `fix-gaps` — fix all gaps from DEVELOPMENT-REVIEW.md (see Stage 8)
- `fix-gaps DEV-G001 DEV-G003` — fix specific gaps by ID
- `fix-gaps --severity critical` — fix only critical/major gaps
- `status` — show current progress without doing work

### Stage 7: Development Review

Validate that the implementation is complete and accurate against the mission specification documents.

**GitHub Copilot (cloud agent):**

> Select `concert-develop-review`, then type: `review`

The develop-review agent reads all specification documents (VISION.md, REQUIREMENTS.md, ARCHITECTURE.md, UX-DESIGN.md) alongside the actual implementation, then produces a `DEVELOPMENT-REVIEW.md` with a requirements traceability matrix, architecture compliance check, and a categorized list of deviations and gaps. Each gap includes a **Recommended Model** tier (Opus or Sonnet) indicating the complexity of the fix. It does not modify code or specs — it only reviews and reports.

Other develop-review commands:

- `review --scope requirements` — review only against REQUIREMENTS.md
- `review --scope architecture` — review only against ARCHITECTURE.md
- `review --scope ux` — review only against UX-DESIGN.md
- `review --scope phase <phase-slug>` — review only a specific implementation phase
- `status` — show current DEVELOPMENT-STATUS.md and any existing DEVELOPMENT-REVIEW.md summary

### Stage 8: Fix Gaps

After the development review produces `DEVELOPMENT-REVIEW.md`, use the develop agent to fix any documented gaps. The develop agent reads the gap descriptions and implements fixes using the same TDD discipline as regular task implementation.

**GitHub Copilot (cloud agent):**

> Select `concert-develop`, then type: `fix-gaps`

This fixes all gaps starting with critical severity. Each gap is treated as an independent mini-task: the agent reads the gap, writes tests for the acceptance criteria, implements the fix, self-reviews, and commits.

**Fix specific gaps:**

> Select `concert-develop`, then type: `fix-gaps DEV-G001 DEV-G003`

**Fix by severity:**

> Select `concert-develop`, then type: `fix-gaps --severity critical`

Severity levels are cumulative: `critical` fixes only critical gaps, `major` fixes critical and major, `minor` fixes all.

Each gap in the review document includes a **Recommended Model** (Opus or Sonnet). If a gap recommends Opus but you are running on a standard-tier model, the agent will warn you and offer to skip that gap.

After fixing gaps, run the development review again to verify all fixes:

> Select `concert-develop-review`, then type: `review`

### Stage 9: Finish

After all development and review are complete, archive the mission's working documents and produce durable application reference documentation.

**GitHub Copilot (cloud agent):**

> Select `concert-develop-finish`, then type: `finish`

The finish agent:

1. **Archives** all working documents (VISION.md, REQUIREMENTS.md, ARCHITECTURE.md, UX-DESIGN.md, PLAN.md, DEVELOPMENT-STATUS.md, DEVELOPMENT-REVIEW.md, task files, etc.) into a `DELETE-ME/` subfolder within the mission folder. This is your safety net — inspect it and delete it when satisfied.
2. **Synthesizes** information from all archived documents to write one or more application reference `.md` files in the mission folder. These are developer-facing reference docs — not user guides — that document what was built, how it is structured, and crucially **why** key decisions were made.

The generated documentation captures:

- What problem the feature solves and how it fits the broader application
- Component and data flow architecture
- Key design decisions with context, rationale, and trade-offs (sourced from ADRs and DEVELOPMENT-REVIEW.md deviations)
- API surfaces, data models, and configuration options
- Known limitations, technical debt, and out-of-scope items

Other finish commands:

- `finish --dry-run` — preview the document structure without making any changes
- `docs-only` — regenerate documentation without re-archiving (use if DELETE-ME already exists)
- `status` — show the current state of the mission folder

After the agent completes, move the generated `.md` file(s) to your project's documentation folder and delete the `DELETE-ME/` folder.

### Stage 10: Refactor (recommended after every feature)

Refactoring after a feature lands — while the design tradeoffs are still fresh — is one of the highest-leverage things you can do for long-term code health. Concert ships a dedicated agent for this.

**GitHub Copilot (cloud agent):**

> Select `concert-refactor`, then type: `create`

The refactor agent surveys the repository, identifies behavior-preserving improvements (duplication, cohesion, coupling, naming, dead code, complexity, error handling, test quality, type safety, etc.), and writes a ranked plan to `.concert/REFACTOR-PLAN-YYYY-MM-DD.md` at the root of `.concert/`. Each item is ranked using the same severity scheme as the development review agent (Critical / Major / Minor / Nice-to-have) and includes reasoning plus enough guidance for `concert-develop` to pick it up and resolve it without re-investigating.

Other refactor commands:

- `create --scope <path>` — limit analysis to a directory or file glob
- `create --scope mission` — limit to code touched by the current mission
- `create --scope tests` — focus on test code only
- `update` — refresh the most recent plan in place (preserves item statuses, marks resolved items, appends new findings)
- `status` — summarize the most recent plan without re-analyzing

> **💡 Tip:** Although `concert-refactor` is presented here at the end of the SDLC, it is a **utility agent** — you can run it any time you want a structured, ranked view of refactor opportunities. Common uses include: after merging a large feature, before starting a major new initiative, or when onboarding a new contributor who needs a curated list of safe cleanups.

Then hand the plan to the develop agent to apply the changes:

> Select `concert-develop`, then type: `refactor`

The develop agent reads the most recent `REFACTOR-PLAN-*.md`, works through items in priority order (Critical → Major → Minor → Nice-to-have), locks in current behavior with tests where needed, applies each refactor, and **updates the `Status` field of each item directly in the refactor plan** (no DEVELOPMENT-STATUS.md update — refactors are not tied to a mission).

Other develop commands for refactor work:

- `refactor REF-001 REF-003` — apply specific items by ID, in the order given
- `refactor --severity critical` — apply only Critical items (cumulative: critical | major | minor | nice-to-have)

After applying refactors, run `concert-refactor update` to refresh the plan and confirm what was resolved.

## Project Structure

After initialization and running through the SDLC, your repo will contain:

```
your-repo/
├── concert.jsonc                          # Concert configuration
├── CLAUDE.md                              # Concert section with agent instructions
├── .concert/
│   ├── state.json                         # Current mission pointer
│   ├── REFACTOR-PLAN-YYYY-MM-DD.md        # Stage 10 output (utility — runnable any time)
│   ├── missions/
│   │   └── <mission-slug>/
│   │       ├── VISION.md                  # Stage 1 output
│   │       ├── REQUIREMENTS.md            # Stage 2 output
│   │       ├── ARCHITECTURE.md            # Stage 3 output
│   │       ├── UX-DESIGN.md               # Stage 4 output (if applicable)
│   │       ├── PLAN.md                    # Stage 5 output
│   │       ├── DEVELOPMENT-STATUS.md      # Stage 6 progress tracker
│   │       ├── DEVELOPMENT-REVIEW.md      # Stage 7 output
│   │       ├── <FEATURE-SLUG>.md          # Stage 9 output — application reference doc(s)
│   │       ├── DELETE-ME/                 # Stage 9 archive — delete when satisfied
│   │       │   ├── VISION.md
│   │       │   ├── REQUIREMENTS.md
│   │       │   └── ...                    # All working documents moved here
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
