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

### Check Mission Status (read-only)

```
/concert-status
```

A read-only composite snapshot of the current mission: stage, pipeline status, branch, modified-but-not-re-evaluated documents (with the changed section slugs), open development-review gaps by severity, refactor-plan items by priority, recent failures, and the single recommended next action. Never edits anything; safe to run at any time.

### Audit Token Cost (read-only)

```bash
npx concert doctor
```

Walks all Concert-managed files (agents, skills, slash commands, rules, instruction files) and reports lines, KB, and estimated tokens per file and per category. Flags any file that exceeds the size targets in `docs/TOKEN-OPTIMIZATION.md` (e.g. agents > 250 lines or > 12 KB, skills > 150 lines or > 6 KB). Exits non-zero when any file is over a target so you can wire it into CI as a guardrail.

## SDLC Workflow

Concert structures development as a pipeline of specialized agents. Each agent produces a document that feeds the next stage. You drive each stage by invoking the corresponding agent.

```
Vision → Review → Requirements → Review → Architecture → Review → UX Design → Review → Planning → Development → Development Review → Fix Gaps → Re-review → Finish → Refactor
```

`/concert-review-docs review` automatically runs `/concert-alignment check` whenever it makes a change, so you no longer need to alternate between review and alignment by hand. To skip the review-then-re-evaluate ping-pong entirely, use `/concert-review-docs review-and-reconcile <doc>` — one command, both steps.

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

**Optional: start the mission from a GitHub issue.** When you'd rather start the SDLC from an existing issue body than retype the description:

```
/concert-vision from-issue 123
```

The agent fetches issue #123 (via `gh issue view` or the GitHub MCP `issue_read` tool — `read:issues` scope required), uses the title + body as the feature description, prefixes the mission slug with `issue-123-` for traceability, links the issue from the mission's `DEVELOPMENT-STATUS.md`, and posts a one-line comment back on the issue if it has `issues:write` permission.

**Optional: also create a mission branch.** Add `--branch` to either `create` or `from-issue` to check out a `mission/<slug>` branch in one step:

```
/concert-vision create --branch Add OAuth2 login with Google and GitHub providers
/concert-vision from-issue 123 --branch
```

The agent skips branch creation silently (with a warning) if the working tree is dirty, the branch already exists, or `git` is unavailable. The branch is recorded in `state.json` so downstream agents and `/concert-status` know about it.

### Review the Vision

**Run review-docs immediately after creating the vision.** The review-docs agent conducts a structured conversation with you to refine the document — resolving open questions, improving clarity, and catching gaps before they propagate downstream.

```
/concert-review-docs review vision
```

The agent asks you one question at a time, updates the document based on your answers, and marks the changed sections for re-evaluation when done. When `review` makes any change, it **automatically runs `/concert-alignment check`** as the final step — you no longer need to remember to run alignment yourself.

**Modes:**

- **Conversational** (default when an interview tool like `AskUserQuestion`, `ask_user`, or `vscode_askQuestions` is detected): one question at a time, you steer.
- **Batch** (automatic when no interview tool is present, or explicit with `--batch`): the agent does the full evaluation, applies high-confidence edits directly, and stages everything else as `- [ ]` items in the doc's questions section. This is the right mode for GitHub Copilot cloud-agent runs and for users who prefer "give me the whole list, then I'll answer".

```
/concert-review-docs review vision --batch
```

This is the single most valuable step in the pipeline — every issue caught here saves significant rework in later stages.

> **💡 Tip:** Run `review-docs` after creating _every_ spec document (Vision, Requirements, Architecture, UX Design). The auto-alignment step means you get cross-document consistency checks for free.

### Re-evaluate After Review (selective)

If review-docs modified the vision, re-evaluate downstream docs whose impacted sections changed:

```
/concert-review-docs re-evaluate-all
```

`re-evaluate-all` is **selective**: it reads the per-section `CONCERT:MODIFIED:<section-slug>` markers that `review` left behind, walks an upstream→downstream dependency map, and only re-evaluates documents whose impacted sections actually changed. This is dramatically cheaper than re-running every downstream agent. The legacy whole-doc marker is still respected for backwards compatibility.

### One-shot: review and re-evaluate together

If you want to skip the agent-switching ping-pong (review, then switch agents, then re-evaluate, then switch back), use the convenience command:

```
/concert-review-docs review-and-reconcile vision
```

This runs `review` followed immediately by `re-evaluate-all` in the same session — one invocation, one wrap-up.

---

### Stage 2: Requirements

Decompose the vision into functional and non-functional requirements.

```
/concert-requirements create
```

Reads the current mission's `VISION.md` and produces `REQUIREMENTS.md` with SHALL/SHOULD/MAY requirements, dependencies, assumptions, and open questions.

### Alignment Check After Requirements

Alignment is now run automatically by `/concert-review-docs review` whenever it makes a change, so the typical Vision → Requirements flow no longer needs a manual alignment step. Run it explicitly only when you want to cross-check documents you edited by hand or to re-verify a mission you have just resumed:

```
/concert-alignment check
```

Alignment cross-checks all existing mission documents for contradictions, gaps, and traceability breaks — for example, that every vision goal is covered by at least one requirement and that no requirement was invented without a vision basis.

### Review the Requirements

```
/concert-review-docs review requirements
```

(Auto-runs alignment if changes were made.) Then re-evaluate downstream docs:

```
/concert-review-docs re-evaluate-all
```

Or, in one shot:

```
/concert-review-docs review-and-reconcile requirements
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

## Skills

Concert ships only a small core of agents and commands so `concert init` and `concert update` stay tidy. Optional GitHub Copilot **skills** — focused, reusable guides Copilot can load on demand — live in a separate public repo: [`he3-org/concert-assets`](https://github.com/he3-org/concert-assets), under `.github/skills/<skill-name>/SKILL.md`.

The Concert CLI lets you browse that catalog and pull just the skills you want into your repo's `.github/skills/` folder, without any of the others cluttering your tree.

### List available skills

```bash
npx @he3-org/concert skills list
```

Fetches the catalog from the assets repo and prints each skill's name and description.

### Search by name or description

```bash
npx @he3-org/concert skills search commit
```

Filters the catalog with a case-insensitive substring match against both the skill name and its description.

### Install one or more skills

```bash
npx @he3-org/concert skills add skill-authoring conventional-commits
```

Downloads each named skill folder (recursively) and writes it to `.github/skills/<skill-name>/` in the current repo. If a skill of the same name already exists locally, it is overwritten — re-run the command at any time to pull updated content.

Installed skill files are normal files in your repository — commit them like any other code. They are **not** tracked or removed by `concert update`; you choose which skills your project uses and when to refresh them.

### Pinning to a specific source

Both the source repo and the git ref can be overridden with environment variables, which is useful for trying a fork or pinning to a tag:

```bash
CONCERT_ASSETS_REPO=my-org/my-fork CONCERT_ASSETS_REF=v1.2.3 \
  npx @he3-org/concert skills list
```

Defaults are `he3-org/concert-assets` and `HEAD`.

## Rules

Optional Claude Code **rules** — focused project conventions Claude should follow (commit message format, PR descriptions, code style, etc.) — live in the same [`he3-org/concert-assets`](https://github.com/he3-org/concert-assets) repo, but as flat `.md` files under `.claude/rules/`.

The CLI mirrors the Skills feature: browse the catalog and pull just the rules you want into your repo's `.claude/rules/` folder.

### List available rules

```bash
npx @he3-org/concert rules list
```

Fetches the catalog from the assets repo and prints each rule's name and a one-line summary.

### Search by name or description

```bash
npx @he3-org/concert rules search commit
```

Filters the catalog with a case-insensitive substring match against both the rule name and its summary.

### Install one or more rules

```bash
npx @he3-org/concert rules add conventional-commits
```

Downloads each named rule and writes it to `.claude/rules/<rule-name>.md` in the current repo. If a rule of the same name already exists locally, it is overwritten — re-run the command at any time to pull updated content.

Installed rule files are normal files in your repository — commit them like any other code. They are **not** tracked or removed by `concert update`; you choose which rules your project uses and when to refresh them.

### Pinning to a specific source

The same `CONCERT_ASSETS_REPO` and `CONCERT_ASSETS_REF` environment variables described above for Skills also apply to Rules:

```bash
CONCERT_ASSETS_REPO=my-org/my-fork CONCERT_ASSETS_REF=v1.2.3 \
  npx @he3-org/concert rules list
```

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
