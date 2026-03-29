# Concert

Opinionated agentic development lifecycle orchestrator. Concert manages missions through a structured pipeline — from vision through requirements, architecture, UX, task decomposition, and execution — all driven by AI agents inside Claude Code.

## Install

No global install needed. Run Concert commands directly with `npx`:

```bash
npx @he3-org/concert@latest init
```

## Update

To update Concert's managed files in an existing project:

```bash
npx @he3-org/concert@latest update
```

This pulls the latest templates, agents, and workflows while preserving your customizations to `concert.jsonc` and `state.json`.

## Usage

### 1. Initialize a project

In any git repository with at least one commit:

```bash
npx @he3-org/concert@latest init
```

This creates `docs/concert/`, `concert.jsonc`, and adds Concert commands to your `CLAUDE.md`.

### 2. Start a mission

Open Claude Code in the project directory and kick things off:

```
/concert:init Build a user authentication system with OAuth support
```

Concert interviews you to capture a vision, then advances through the pipeline.

### 3. Plan and review each stage

Concert moves through stages sequentially: **vision → requirements → architecture → UX → tasks → execution**. At each stage:

```
/concert:review        # Review the current stage draft
/concert:accept        # Accept and advance to next stage
```

### 4. Execute

Once tasks are planned and accepted, start execution:

```
/concert:continue      # Start or resume execution
```

Concert decomposes work into phases and tasks, then executes them with commits along the way. If you need to stop and pick up later, `/concert:continue` resumes where you left off.

### 5. Hand off between environments

If you need to switch machines or CI:

```
/concert:push          # Commit state and push branch
```

On the new machine, ensure Concert is up to date:

```bash
npx @he3-org/concert@latest update
```

Then on the other side:

```
/concert:continue      # Pick up where you left off
```

### 6. Other commands

```
/concert:status        # Check current mission status
/concert:verify        # Run QA verification
/concert:debug <issue> # Debug a specific issue
/concert:quick <task>  # Quick one-off task outside the pipeline
/concert:restart       # Restart a stage
/concert:replan        # Replan a stage
/concert:archive       # Archive completed mission and reset state
```

## Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
git clone https://github.com/he3-org/concert.git
cd concert
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Type check

```bash
npm run typecheck
```

### Watch mode

```bash
npm run dev          # Rebuild on changes
npm run test:watch   # Re-run tests on changes
```

### Deploying a new version

Releases are automated via [release-please](https://github.com/googleapis/release-please). On merge to `main`:

1. **release-please** analyzes conventional commits and opens a release PR with a version bump and changelog entry:
   - `fix:` commits → patch bump
   - `feat:` commits → minor bump
   - `feat!:` or `BREAKING CHANGE:` → major bump
2. When the release PR is merged, the workflow builds, tests, and **publishes to npm** automatically.

To trigger a release, just merge PRs with conventional commit titles to `main`. No manual version bumps needed.

**Setup required:** Link the GitHub repo to npm via OIDC for provenance publishing. See npm's [configuring provenance with GitHub Actions](https://docs.npmjs.com/generating-provenance-statements#publishing-packages-with-provenance-via-github-actions) docs.
