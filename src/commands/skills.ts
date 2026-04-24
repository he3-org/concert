import {
  fetchSkillFiles,
  getAssetsRepoConfig,
  listAvailableSkills,
  searchSkills,
  writeSkillToTarget,
  type SkillSummary,
} from '../lib/skills.js';

/**
 * Top-level entry point for the `concert skills` command. The first argument
 * is the subcommand (list / search / add). Returns a process exit code.
 */
export async function runSkills(cwd: string, args: string[]): Promise<number> {
  const sub = args[0];

  if (!sub) {
    // No subcommand at all — show usage on stdout and exit non-zero
    // so that scripts can detect missing input.
    printSkillsHelp();
    return 2;
  }
  if (sub === '--help' || sub === '-h') {
    printSkillsHelp();
    return 0;
  }

  switch (sub) {
    case 'list':
      return runSkillsList();
    case 'search':
      return runSkillsSearch(args.slice(1));
    case 'add':
      return runSkillsAdd(cwd, args.slice(1));
    default:
      process.stderr.write(`Error: unknown skills subcommand "${sub}"\n\n`);
      printSkillsHelp(process.stderr);
      return 2;
  }
}

function printSkillsHelp(stream: NodeJS.WritableStream = process.stdout): void {
  stream.write(`Usage: concert skills <subcommand> [args]

Browse and install GitHub Copilot skills from the Concert assets repo
into the current project's .github/skills/ folder.

Subcommands:
  list                       List all skills available in the assets repo
  search <term>              Search skills by name or description
  add <skill>...             Copy one or more skills into .github/skills/

Environment:
  CONCERT_ASSETS_REPO        Override the assets repo (default: he3-org/concert-assets)
  CONCERT_ASSETS_REF         Override the git ref to fetch from (default: HEAD)

Examples:
  concert skills list
  concert skills search commit
  concert skills add skill-authoring conventional-commits
`);
}

function formatSkillsTable(skills: SkillSummary[]): string {
  if (skills.length === 0) return '  (no skills found)\n';
  const nameWidth = Math.max(4, ...skills.map((s) => s.name.length));
  const lines: string[] = [];
  lines.push(`  ${'NAME'.padEnd(nameWidth)}  DESCRIPTION`);
  lines.push(`  ${'-'.repeat(nameWidth)}  ${'-'.repeat(40)}`);
  for (const s of skills) {
    const desc = s.description || '(no description)';
    lines.push(`  ${s.name.padEnd(nameWidth)}  ${desc}`);
  }
  return lines.join('\n') + '\n';
}

async function runSkillsList(): Promise<number> {
  const cfg = getAssetsRepoConfig();
  process.stdout.write(`Fetching skills from ${cfg.repo}@${cfg.ref}...\n\n`);
  let skills: SkillSummary[];
  try {
    skills = await listAvailableSkills(cfg);
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
  process.stdout.write(formatSkillsTable(skills));
  process.stdout.write(
    `\n  ${skills.length} skill${skills.length === 1 ? '' : 's'} available.  Run \`concert skills add <name>\` to install one into this repo.\n`
  );
  return 0;
}

async function runSkillsSearch(args: string[]): Promise<number> {
  if (args.length === 0) {
    process.stderr.write(`Error: search requires a term

  Usage: concert skills search <term>
`);
    return 2;
  }
  const term = args.join(' ');
  const cfg = getAssetsRepoConfig();
  process.stdout.write(`Searching skills in ${cfg.repo}@${cfg.ref} for "${term}"...\n\n`);
  let all: SkillSummary[];
  try {
    all = await listAvailableSkills(cfg);
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
  const matches = searchSkills(all, term);
  process.stdout.write(formatSkillsTable(matches));
  process.stdout.write(
    `\n  ${matches.length} match${matches.length === 1 ? '' : 'es'} of ${all.length} skill${all.length === 1 ? '' : 's'}.\n`
  );
  return 0;
}

async function runSkillsAdd(cwd: string, args: string[]): Promise<number> {
  if (args.length === 0) {
    process.stderr.write(`Error: add requires at least one skill name

  Usage: concert skills add <skill>...
  Tip:   run \`concert skills list\` to see what's available
`);
    return 2;
  }

  const cfg = getAssetsRepoConfig();
  let exit = 0;
  const lines: string[] = [];
  for (const name of args) {
    try {
      const files = await fetchSkillFiles(name, cfg);
      const result = writeSkillToTarget(cwd, name, files);
      const verb = result.overwritten ? 'Overwrote' : 'Installed';
      lines.push(
        `  ${verb} skill "${name}" (${result.files.length} file${result.files.length === 1 ? '' : 's'})`
      );
      for (const f of result.files) {
        lines.push(`    ${f}`);
      }
    } catch (err) {
      exit = 1;
      lines.push(
        `  Failed to install "${name}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  process.stdout.write(lines.join('\n') + '\n');
  if (exit === 0) {
    process.stdout.write(
      `\n  Skills are now available under .github/skills/ for Copilot to load.\n`
    );
  }
  return exit;
}
