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

