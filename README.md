# Concert

Opinionated agentic development lifecycle orchestrator. Concert manages missions through a structured pipeline — from vision through requirements, architecture, UX, task decomposition, and execution — all driven by AI agents inside Claude Code.

## Install

```bash
npm install -g @he3-org/concert
```

## Update

```bash
npm update -g @he3-org/concert
```

To update Concert's managed files in an existing project:

```bash
concert update
```

## Usage

### 1. Initialize a project

In any git repository with at least one commit:

```bash
concert init
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
/concert:plan          # Draft the current stage
/concert:review        # Review the draft
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

1. Update the version in `package.json`:

```bash
npm version patch   # or minor / major
```

2. Build and test:

```bash
npm run build && npm test
```

3. Publish to npm:

```bash
npm publish --access public
```

The package is scoped to `@he3-org/concert`, so `--access public` is required on first publish or if the scope default is private.
