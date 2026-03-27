---
task: "cli-router"
title: "Wire up the CLI entry point to route commands to init/update/push"
depends_on: ["cmd-init", "cmd-update", "cmd-push"]
wave: 2
model: haiku
---

## Objective

Replace the stub `src/cli.ts` with the real CLI router that dispatches to the init, update, and push command handlers. Handle `--help`, `--version`, and unknown commands.

## Files

- `src/cli.ts` (modify existing stub)

## Requirements

- FR-025: npm Package Distribution
- UX Section 10.1: CLI Conventions

## Detailed Instructions

### src/cli.ts

Replace the stub with:

```typescript
import { getPackageVersion } from "./lib/version.js";

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  if (command === "--version" || command === "-V") {
    console.log(getPackageVersion());
    process.exit(0);
  }

  if (command === "--help" || command === "-h" || !command) {
    printHelp();
    process.exit(0);
  }

  const cwd = process.cwd();

  switch (command) {
    case "init": {
      const { runInit } = await import("./commands/init.js");
      process.exit(await runInit(cwd));
    }
    case "update": {
      const { runUpdate } = await import("./commands/update.js");
      process.exit(await runUpdate(cwd));
    }
    case "push": {
      const { runPush } = await import("./commands/push.js");
      process.exit(await runPush(cwd));
    }
    default:
      console.error(`Error: unknown command "${command}"

  Available commands: init, update, push

  Run "concert --help" for usage information.`);
      process.exit(2);
  }
}

function printHelp(): void {
  console.log(`Usage: concert <command>

Commands:
  init     Initialize Concert in a repository
  update   Update Concert files to latest version
  push     Push current branch to origin

Options:
  --help, -h       Show this help message
  --version, -V    Show version number`);
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

### Key behaviors

- Dynamic imports for commands (lazy loading)
- Each command handler returns an exit code
- Top-level catch for unhandled errors
- --help and --version before command dispatch
- Unknown commands exit with code 2

## Tests

Update `src/__tests__/cli.test.ts`:

1. `--help` prints usage and exits 0
2. `--version` prints version and exits 0
3. Unknown command exits with code 2
4. `init` command is routed correctly
5. `update` command is routed correctly
6. `push` command is routed correctly

## Acceptance Criteria

- [ ] `concert --help` prints usage information
- [ ] `concert --version` prints the package version
- [ ] `concert init` routes to the init command
- [ ] `concert update` routes to the update command
- [ ] `concert push` routes to the push command
- [ ] Unknown commands print an error and exit with code 2
- [ ] Unhandled errors are caught and printed
- [ ] All tests pass
- [ ] `npm run typecheck` passes
- [ ] `npm run build` produces a working CLI binary
