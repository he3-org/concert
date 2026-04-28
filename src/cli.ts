import { getPackageVersion } from './lib/version.js';

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  if (command === '--version' || command === '-V') {
    console.log(getPackageVersion());
    process.exit(0);
  }

  if (command === '--help' || command === '-h' || !command) {
    printHelp();
    process.exit(0);
  }

  const cwd = process.cwd();

  switch (command) {
    case 'init': {
      const { runInit } = await import('./commands/init.js');
      process.exit(await runInit(cwd));
    }
    case 'update': {
      const { runUpdate } = await import('./commands/update.js');
      process.exit(await runUpdate(cwd));
    }
    case 'push': {
      const { runPush } = await import('./commands/push.js');
      process.exit(await runPush(cwd));
    }
    case 'skills':
    case 'skill': {
      const { runSkills } = await import('./commands/skills.js');
      process.exit(await runSkills(cwd, args.slice(1)));
    }
    case 'rules':
    case 'rule': {
      const { runRules } = await import('./commands/rules.js');
      process.exit(await runRules(cwd, args.slice(1)));
    }
    case 'doctor': {
      const { runDoctor } = await import('./commands/doctor.js');
      process.exit(await runDoctor(cwd));
    }
    case 'serve': {
      const { runServe } = await import('./commands/serve.js');
      process.exit(await runServe(cwd, args.slice(1)));
    }
    case 'get-status': {
      const { runGetStatus } = await import('./commands/getStatus.js');
      process.exit(await runGetStatus(cwd, args.slice(1)));
    }
    case 'get-state': {
      const { runGetState } = await import('./commands/getState.js');
      process.exit(await runGetState(cwd, args.slice(1)));
    }
    case 'list-missions': {
      const { runListMissions } = await import('./commands/listMissions.js');
      process.exit(await runListMissions(cwd, args.slice(1)));
    }
    case 'get-section': {
      const { runGetSection } = await import('./commands/getSection.js');
      process.exit(await runGetSection(cwd, args.slice(1)));
    }
    case 'list-modified-sections': {
      const { runListModifiedSections } = await import('./commands/listModifiedSections.js');
      process.exit(await runListModifiedSections(cwd, args.slice(1)));
    }
    default:
      console.error(`Error: unknown command "${command}"

  Available commands: init, update, push, skills, rules, doctor, serve, get-status, get-state, list-missions, get-section, list-modified-sections

  Run "concert --help" for usage information.`);
      process.exit(2);
  }
}

function printHelp(): void {
  console.log(`Usage: concert <command>

Commands:
  init                     Initialize Concert in a repository
  update                   Update Concert files to latest version
  push                     Push current branch to origin
  skills                   List, search, and install skills from the Concert assets repo
  rules                    List, search, and install rules from the Concert assets repo
  doctor                   Report token cost of Concert-managed files (read-only)

Read-only inspection:
  serve                    Start MCP stdio server (use --inspect for tool catalogue)
  get-status               Get comprehensive mission status snapshot
  get-state                Get mission state from state.json
  list-missions            List all missions
  get-section              Get a markdown section from a mission document
  list-modified-sections   List documents with CONCERT:MODIFIED markers

Options:
  --help, -h       Show this help message
  --version, -V    Show version number

Run "concert <command> --help" for command-specific usage.`);
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
