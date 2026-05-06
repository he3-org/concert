# Concert

Opinionated agentic development lifecycle orchestrator. Concert installs a curated set of AI agents and slash commands into your repository that guide you through a structured SDLC — from vision to requirements to architecture to planning to implementation, review, and refactor — using Claude Code and GitHub Copilot.

- [Installation](#installation)
- [Usage Example](#usage-example)
- [Agents & Commands Reference](#agents--commands-reference)
- [Skills](#skills)
- [Rules](#rules)
- [Project Structure](#project-structure)
- [Managed Files](#managed-files)
- [Configuration](#configuration)

## Installation

### Prerequisites

- Node.js ≥ 18
- A git repository (with at least one commit)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI **or** [GitHub Copilot](https://github.com/features/copilot) with agent mode

### 1. Add Concert to your project

Concert is designed to be **pinned per repository** — different projects often track different Concert versions, so we recommend installing it as a project-local dev dependency rather than globally.

```bash
npm install --save-dev @he3-org/concert
```

To use the read-only MCP server (recommended — see step 3), also add the MCP SDK as a dev dependency:

```bash
npm install --save-dev @he3-org/concert @modelcontextprotocol/sdk
```

All Concert commands are then run via `npx concert <command>`, which resolves to your project's pinned version automatically.

> **Prefer a global install?** `npm install -g @he3-org/concert` works too and lets you drop the `npx` prefix. Just be aware that a global binary is shared across every repo on your machine, so you lose per-project version pinning.

### 2. Initialize Concert in your repository

From the root of your project:

```bash
npx concert init
```

This creates the following files. Edit `concert.jsonc` to fit your project; the rest are managed by Concert and refreshed on `concert update`.

| Path                                | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| `concert.jsonc`                     | Project configuration (edit to customize) |
| `.concert/`                         | State, missions, and workflow definitions |
| `.github/agents/concert-*.agent.md` | GitHub Copilot agent definitions          |
| `.claude/commands/concert-*.md`     | Claude Code slash commands                |
| `CLAUDE.md`                         | Concert section appended (or created)     |

To update Concert later:

```bash
npm install --save-dev @he3-org/concert@latest
npx concert update
```

This updates the pinned npm package first, then refreshes Concert-managed files from that version. `concert update` overwrites managed agent/command files, merges any new `concert.jsonc` or state fields into your existing files, and removes stale managed files from older Concert releases. Review and commit both the package file changes and the refreshed managed files.

If you use the MCP server and installed the SDK explicitly, keep it current too:

```bash
npm install --save-dev @modelcontextprotocol/sdk@latest
```

### 3. Install the Concert MCP server in your client

Concert ships a read-only MCP (Model Context Protocol) server that exposes mission state as structured tool calls. Wiring this up is **strongly recommended**: it lets the agents query mission status, state, and individual document sections directly instead of reading and re-parsing markdown — typically a 20–40× reduction in tokens for status-style operations. See [`docs/MCP.md`](docs/MCP.md) for the full tool catalog.

The snippets below all launch Concert via `npx`, so each client picks up the version pinned in the project's `package.json` automatically — no global install required. The `-y` flag suppresses npx's first-time install prompt.

**Claude Desktop** — `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "concert": { "command": "npx", "args": ["-y", "@he3-org/concert", "serve"] }
  }
}
```

**GitHub Copilot (VS Code)** — `.vscode/settings.json` in your project

```json
{
  "github.copilot.mcp.servers": {
    "concert": { "command": "npx", "args": ["-y", "@he3-org/concert", "serve"] }
  }
}
```

**GitHub Copilot cloud agents (GitHub.com)** — repository settings

Repository administrators can enable the MCP server for GitHub.com cloud agents:

1. Open the repository on GitHub.com.
2. Go to **Settings → Copilot → Cloud agent**.
3. Paste this JSON into **MCP configuration** and save:

```json
{
  "mcpServers": {
    "concert": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@he3-org/concert", "serve"],
      "tools": [
        "concert.get_status",
        "concert.get_state",
        "concert.list_missions",
        "concert.get_section",
        "concert.list_modified_sections"
      ]
    }
  }
}
```

The cloud agent can then call Concert's read-only tools autonomously during tasks. No secrets are required for Concert's local MCP server.

**Cursor** — Cursor MCP settings

```json
{
  "concert": { "command": "npx", "args": ["-y", "@he3-org/concert", "serve"] }
}
```

**Codex CLI** — Codex MCP config

```json
{
  "servers": {
    "concert": { "command": "npx", "args": ["-y", "@he3-org/concert", "serve"] }
  }
}
```

> If you opted for a global install in step 1, you can replace `"command": "npx", "args": ["-y", "@he3-org/concert", "serve"]` with `"command": "concert", "args": ["serve"]` in any of the snippets above.

You can verify the server starts and inspect the tool schemas with:

```bash
npx concert serve --inspect
```

The same data is also reachable from the CLI without an MCP client (`npx concert get-status`, `npx concert get-state`, `npx concert list-missions`, `npx concert get-section <doc> <section>`).

## Usage Example

This walkthrough takes a single feature through the entire Concert SDLC. Each step names the agent to invoke, the purpose of the step, and a brief note on how Concert keeps tokens low along the way.

For each stage the recommended environment is:

| Stages                                          | Recommended environment                | Why                                                                                |
| ----------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| Vision, Requirements, Architecture, UX Design   | **Claude Code CLI** or **Copilot CLI** | These stages interview you one question at a time; they need an interactive shell. |
| Planning, Development, Review, Finish, Refactor | **GitHub Copilot cloud agents**        | Autonomous and long-running; cloud agents are cheaper and run unattended.          |

> Throughout the flow, agents call the Concert MCP tools (`concert.get_status`, `concert.get_state`, `concert.get_section`, `concert.list_modified_sections`) to fetch only the precise mission data they need rather than reading whole documents. Run `concert doctor` at any time to audit token cost across all managed files.

### Step 1 — Create the vision (`/concert-vision`)

```
/concert-vision create Add OAuth2 login with Google and GitHub providers
```

**Purpose:** Produce `.concert/missions/<slug>/VISION.md` capturing the goals, audience, success criteria, and constraints of the feature. The agent researches your codebase and the feature domain, and asks you targeted questions to fill any gaps.

Variants:

- `/concert-vision from-issue 123` — start the mission from GitHub issue #123 (title + body become the description; mission slug prefixed with `issue-123-`).
- Append `--branch` to either `create` or `from-issue` to also check out a `mission/<slug>` branch.

### Step 2 — Review the vision (`/concert-review-docs review`)

```
/concert-review-docs review vision
```

**Purpose:** This is the single highest-leverage step in the pipeline — every issue caught here saves significant rework downstream. The reviewer interviews you to refine the document, marks the changed sections with `CONCERT:MODIFIED:<slug>` markers, and **automatically runs `/concert-alignment check`** when it makes any edit so cross-document consistency is verified for free.

Modes:

- **Conversational** (default in interactive shells): one question at a time, you steer.
- **Batch** (`--batch`, also automatic in cloud agent runs): the agent does the full evaluation, applies high-confidence edits directly, and stages everything else as `- [ ]` items in the doc's _Open Questions_ section.

To skip the review-then-re-evaluate ping-pong on subsequent stages, prefer the one-shot:

```
/concert-review-docs review-and-reconcile vision
```

This runs `review` immediately followed by `re-evaluate-all`, which uses the per-section `CONCERT:MODIFIED` markers to **selectively** re-evaluate only the downstream documents whose impacted sections actually changed — dramatically cheaper than re-running every downstream agent.

> **💡 Tip:** Run `review-docs` after creating _every_ spec document (Vision, Requirements, Architecture, UX Design). Auto-alignment + selective re-evaluation make the cost of catching issues early very low.

### Step 3 — Decompose into requirements (`/concert-requirements`)

```
/concert-requirements create
```

**Purpose:** Reads the mission's `VISION.md` (via the MCP `get_section` tool — only the sections it needs) and produces `REQUIREMENTS.md` with SHALL/SHOULD/MAY requirements, dependencies, assumptions, and open questions. Then review and reconcile:

```
/concert-review-docs review-and-reconcile requirements
```

### Step 4 — Design the architecture (`/concert-architect`)

```
/concert-architect create
```

**Purpose:** Designs a system that satisfies the requirements. Produces `ARCHITECTURE.md` with components, data models, interfaces, and Architectural Decision Records. Then:

```
/concert-review-docs review-and-reconcile architecture
```

### Step 5 — UX design (optional, `/concert-ux-design`)

```
/concert-ux-design create
```

**Purpose:** For features with a UI, designs information architecture, navigation flows, component specifications, and accessibility considerations into `UX-DESIGN.md`. Then:

```
/concert-review-docs review-and-reconcile ux-design
```

### Step 6 — Plan the implementation (`concert-planner`)

> 🖥️ Switch to a **GitHub Copilot cloud agent** from here on. The remaining stages are autonomous and long-running.

> Select `concert-planner`, then type: `create`

**Purpose:** Decomposes the architecture into a `PLAN.md` of phases plus individual `TASK-*.md` files. Each task specifies the exact files to create/modify, the tests to write, acceptance criteria, and a **model tier** (haiku / sonnet / opus) sized to its complexity — the planner does the cost shaping so the developer agent can route accordingly.

### Step 7 — Implement (`concert-develop`, `implement`)

> Select `concert-develop`, then type: `implement`

**Purpose:** Works through task files in order using TDD: write tests → implement → commit → self-review → fix → commit → next task. The agent reads `DEVELOPMENT-STATUS.md` (via MCP `get_state`) to find where it left off, so sessions can be interrupted at any time and resumed without re-reading the world. Variants:

- `implement --model sonnet` — process only haiku/sonnet tasks, stop before opus.
- `implement --phase 01-foundation` — process tasks in a specific phase.
- `implement <path-to-task-file>` — run a specific task.
- `status` — show progress without doing work.

### Step 8 — Review the implementation (`concert-develop-review`, `review`)

> Select `concert-develop-review`, then type: `review`

**Purpose:** Validates the implementation against the specification documents, producing `DEVELOPMENT-REVIEW.md` with a requirements traceability matrix, architecture compliance check, and a categorized list of gaps. Each gap carries a **Recommended Model** tier so the developer agent knows whether the fix needs Sonnet or Opus. Read-only — does not modify code or specs. Variants: `review --scope requirements | architecture | ux | phase <slug>`, `status`.

### Step 9 — Fix the gaps (`concert-develop`, `fix-gaps`)

> Select `concert-develop`, then type: `fix-gaps`

**Purpose:** Treats each gap from the review as an independent mini-task and fixes it with the same TDD discipline. Variants:

- `fix-gaps DEV-G001 DEV-G003` — fix specific gaps by ID.
- `fix-gaps --severity critical` — fix only Critical gaps (severity is cumulative: `critical` < `major` < `minor`).

After fixing, re-run `concert-develop-review` → `review` to confirm.

### Step 10 — Finish & document (`concert-develop-finish`, `finish`)

> Select `concert-develop-finish`, then type: `finish`

**Purpose:** Archives all working specs (VISION, REQUIREMENTS, ARCHITECTURE, UX-DESIGN, PLAN, DEVELOPMENT-STATUS, DEVELOPMENT-REVIEW, task files…) into a `DELETE-ME/` subfolder of the mission, then synthesizes them into a small set of durable, developer-facing reference docs that capture **what** was built and **why** the key decisions were made (sourced from the ADRs and review deviations). Variants: `finish --dry-run`, `docs-only`, `status`.

When you are happy with the generated docs, move them into your project's `docs/` folder and delete `DELETE-ME/`.

### Step 11 — Refactor (`concert-refactor`, `create`)

> Select `concert-refactor`, then type: `create`

**Purpose:** Surveys the repository and writes a ranked plan to `.concert/REFACTOR-PLAN-YYYY-MM-DD.md` covering duplication, cohesion, coupling, naming, dead code, complexity, error handling, test quality, type safety, and so on. Items are ranked Critical / Major / Minor / Nice-to-have. Then hand the plan to the developer agent:

> Select `concert-develop`, then type: `refactor`

The developer agent works through items in priority order, locks in current behavior with tests where needed, applies each refactor, and updates the `Status` field of each item directly in the refactor plan.

> **💡 Tip:** `concert-refactor` is a **utility agent** — runnable any time you want a ranked refactor view, not only at the end of a mission.

### At any time

```
/concert-status      # current stage, modified docs, gaps, refactor items, next action
npx concert doctor   # audit lines/KB/tokens for every Concert-managed file
npx concert push     # stage + commit pending state changes and push the branch
```

`/concert-status` is the single biggest beneficiary of the MCP integration: it used to read 5–8 files (~3,500–6,000 input tokens); via `concert.get_status` it now consumes ~150 tokens.

### Small ad-hoc tasks (no mission)

Not every change deserves a full mission. When the requirements fit in a few paragraphs — a tiny feature, a chore, a one-off bug — Concert ships two agents that take a free-text description (or a GitHub issue) and run the same TDD + self-review + commit discipline as the mission flow, without any mission docs.

#### Small feature or chore (`concert-develop`, `task`)

> Select `concert-develop`, then type one of:

```
task Add a --json flag to the doctor command that prints token costs as JSON
task --from-issue 142
task ./notes/small-feature.md
```

**Purpose:** The agent derives a slug from the description, writes failing tests for the requirement, commits the red tests, implements the minimum code to pass, runs the full test suite, commits the implementation, self-reviews (up to 3 cycles, fixing CRIT/MAJ findings), and commits a final completion entry. When invoked with `--from-issue <num>` it cross-links the commit to the issue and posts a short comment when it finishes.

#### Bug fix (`concert-fix`, `fix`)

> Select `concert-fix`, then type one of:

```
fix Login button throws "Cannot read property 'id' of undefined" when the session cookie is missing
fix --from-issue 142
fix ./bug-reports/login-crash.md
```

**Purpose:** The agent reproduces the bug with a failing test first (commits the red test), applies the smallest change that turns the test green (commits the fix, with `Refs #<num>` when sourced from an issue), runs the full test suite, self-reviews (up to 3 cycles), and records the fix. When invoked with `--from-issue <num>` it cross-links the commit to the issue and posts a short comment when it finishes.

> **💡 Tip:** Both `task` and `fix` write to `<mission_path>/DEVELOPMENT-STATUS.md` only when a mission is active. Outside a mission they leave no Concert-managed files behind beyond the commits themselves.

## Agents & Commands Reference

Concert ships 14 agents. Each has a corresponding Claude Code slash command (`/concert-<name>`) and a Copilot cloud-agent definition selectable as `concert-<name>`. The slash command and the cloud agent share the same underlying agent definition, so behavior and sub-commands are identical across surfaces.

### Specification agents (Claude Code / Copilot CLI)

| Agent                      | Purpose                                                                                                                                                        | Common sub-commands                                                       | Example                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| **`concert-vision`**       | Creates `VISION.md` from a feature description. Researches the codebase and the feature domain; can start a mission from a GitHub issue.                       | `create <description>`, `from-issue <n>`, `--branch`                      | `/concert-vision create Add OAuth2 login`          |
| **`concert-requirements`** | Decomposes `VISION.md` into SHALL/SHOULD/MAY requirements with dependencies, assumptions, and open questions in `REQUIREMENTS.md`.                             | `create`                                                                  | `/concert-requirements create`                     |
| **`concert-architect`**    | Produces `ARCHITECTURE.md` with components, data models, interfaces, and ADRs from the upstream specs.                                                         | `create`                                                                  | `/concert-architect create`                        |
| **`concert-ux-design`**    | (Optional) Produces `UX-DESIGN.md` with information architecture, navigation flows, component specs, and accessibility notes.                                  | `create`                                                                  | `/concert-ux-design create`                        |
| **`concert-review-docs`**  | Interactive document reviewer. Refines a spec doc through a structured Q&A, marks changed sections, auto-runs alignment.                                       | `review <doc> [--batch]`, `re-evaluate-all`, `review-and-reconcile <doc>` | `/concert-review-docs review-and-reconcile vision` |
| **`concert-alignment`**    | Cross-checks all existing mission documents for contradictions, gaps, and traceability breaks. Run automatically by review-docs; can also be invoked manually. | `check`                                                                   | `/concert-alignment check`                         |

### Implementation agents (GitHub Copilot cloud agent recommended)

| Agent                        | Purpose                                                                                                                                                      | Common sub-commands                                                                                                                                       | Example                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **`concert-planner`**        | Decomposes the spec set into a phased `PLAN.md` and per-task `TASK-*.md` files, each tagged with a model tier.                                               | `create`                                                                                                                                                  | `concert-planner` → `create`                          |
| **`concert-develop`**        | TDD developer. Implements task files, fixes review gaps, applies refactors, runs token-optimization plans, and handles small ad-hoc tasks without a mission. | `implement [task]`, `task [--from-issue <num>] [<description>]`, `fix-gaps [IDs] [--severity]`, `refactor [IDs] [--severity]`, `token-optimize`, `status` | `concert-develop` → `implement --phase 01-foundation` |
| **`concert-fix`**            | TDD bug-fix agent. Reproduces a bug with a failing test, applies the smallest fix, self-reviews, and verifies. Accepts inline text or a GitHub issue.        | `fix <description>`, `fix --from-issue <num>`                                                                                                             | `concert-fix` → `fix --from-issue 142`                |
| **`concert-develop-review`** | Read-only validator. Compares implementation to specs and produces `DEVELOPMENT-REVIEW.md` with traceability + categorized gaps.                             | `review [--scope requirements\|architecture\|ux\|phase <slug>]`, `status`                                                                                 | `concert-develop-review` → `review`                   |
| **`concert-develop-finish`** | Archives working spec docs to `DELETE-ME/` and synthesizes durable application reference docs in the mission folder.                                         | `finish [--dry-run]`, `docs-only`, `status`                                                                                                               | `concert-develop-finish` → `finish`                   |
| **`concert-refactor`**       | Surveys the repo and writes a ranked refactor plan to `.concert/REFACTOR-PLAN-YYYY-MM-DD.md`. Utility agent — runnable any time.                             | `create [--scope <path>\|mission\|tests]`, `update`, `status`                                                                                             | `concert-refactor` → `create --scope mission`         |

### Utility agents

| Agent                         | Purpose                                                                                                                                                                                                                                   | Common sub-commands                                                        | Example                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| **`concert-status`**          | Read-only composite snapshot of the current mission: stage, pipeline status, branch, modified-but-not-re-evaluated documents, open review gaps by severity, refactor items by priority, next action. Backed by the MCP `get_status` tool. | _(none — invoking the agent is the command)_                               | `/concert-status`                               |
| **`concert-token-optimizer`** | Audits agents, skills, and instruction files against the rules in `docs/TOKEN-OPTIMIZATION.md` and produces a ranked `TOKEN-OPTIMIZATION-PLAN-*.md` that `concert-develop token-optimize` can execute.                                    | `audit [--scope agents\|skills\|instructions\|<path>]`, `update`, `status` | `/concert-token-optimizer audit --scope agents` |

## Skills

Concert ships only a small core of agents and commands so `concert init` and `concert update` stay tidy. Optional GitHub Copilot **skills** — focused, reusable guides Copilot can load on demand — live in a separate public repo: [`he3-org/concert-assets`](https://github.com/he3-org/concert-assets), under `.github/skills/<skill-name>/SKILL.md`.

The Concert CLI lets you browse that catalog and pull just the skills you want into your repo's `.github/skills/` folder, without any of the others cluttering your tree.

```bash
npx concert skills list                                # list all available skills
npx concert skills search <term>                       # filter by name/description
npx concert skills add <skill-name> [<skill-name>...]  # download into .github/skills/
```

Installed skill files are normal files in your repository — commit them like any other code. They are **not** tracked or removed by `concert update`; you choose which skills your project uses and when to refresh them.

> **📝 Authoring new skills?** Skills are intended to be shared across projects. Add new skills to [`he3-org/concert-assets`](https://github.com/he3-org/concert-assets) (so every Concert user can `skills add` them) rather than to your target repo. Use the `skill-authoring` skill (`concert skills add skill-authoring`) for the authoring conventions and size targets.

### Pinning to a specific source

Both the source repo and the git ref can be overridden with environment variables, useful for trying a fork or pinning to a tag:

```bash
CONCERT_ASSETS_REPO=my-org/my-fork CONCERT_ASSETS_REF=v1.2.3 \
  npx concert skills list
```

Defaults are `he3-org/concert-assets` and `HEAD`.

## Rules

Optional Claude Code **rules** — focused project conventions Claude should follow (commit message format, PR descriptions, code style, etc.) — live in the same [`he3-org/concert-assets`](https://github.com/he3-org/concert-assets) repo, but as flat `.md` files under `.claude/rules/`.

The CLI mirrors the Skills feature:

```bash
npx concert rules list                               # list all available rules
npx concert rules search <term>                      # filter by name/description
npx concert rules add <rule-name> [<rule-name>...]   # download into .claude/rules/
```

Installed rule files are normal files in your repository — commit them like any other code. They are **not** tracked or removed by `concert update`.

> **📝 Authoring new rules?** Like skills, rules are intended to be shared across projects. Add new rules to [`he3-org/concert-assets`](https://github.com/he3-org/concert-assets) under `.claude/rules/` rather than to your target repo, so every Concert user can `rules add` them.

The same `CONCERT_ASSETS_REPO` and `CONCERT_ASSETS_REF` environment variables described above for Skills also apply to Rules.

## Project Structure

After initialization and running through the SDLC, your repo will contain:

```
your-repo/
├── concert.jsonc                          # Concert configuration
├── CLAUDE.md                              # Concert section with agent instructions
├── .concert/
│   ├── state.json                         # Current mission pointer
│   ├── REFACTOR-PLAN-YYYY-MM-DD.md        # Step 11 output (utility — runnable any time)
│   ├── missions/
│   │   └── <mission-slug>/
│   │       ├── VISION.md                  # Step 1 output
│   │       ├── REQUIREMENTS.md            # Step 3 output
│   │       ├── ARCHITECTURE.md            # Step 4 output
│   │       ├── UX-DESIGN.md               # Step 5 output (if applicable)
│   │       ├── PLAN.md                    # Step 6 output
│   │       ├── DEVELOPMENT-STATUS.md      # Step 7 progress tracker
│   │       ├── DEVELOPMENT-REVIEW.md      # Step 8 output
│   │       ├── <FEATURE-SLUG>.md          # Step 10 output — application reference doc(s)
│   │       ├── DELETE-ME/                 # Step 10 archive — delete when satisfied
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
  "concert_version": "1.22.0",
}
```

Concert preserves your values when updating — only new fields are added and removed fields are cleaned up.

## License

[MIT](LICENSE)
