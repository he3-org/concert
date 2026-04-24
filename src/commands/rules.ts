import {
  fetchRuleContent,
  listAvailableRules,
  searchRules,
  writeRuleToTarget,
  type RuleSummary,
} from '../lib/rules.js';
import { getAssetsRepoConfig } from '../lib/assets.js';

/**
 * Top-level entry point for the `concert rules` command. The first argument
 * is the subcommand (list / search / add). Returns a process exit code.
 */
export async function runRules(cwd: string, args: string[]): Promise<number> {
  const sub = args[0];

  if (!sub) {
    // No subcommand at all — show usage on stdout and exit non-zero
    // so that scripts can detect missing input.
    printRulesHelp();
    return 2;
  }
  if (sub === '--help' || sub === '-h') {
    printRulesHelp();
    return 0;
  }

  switch (sub) {
    case 'list':
      return runRulesList();
    case 'search':
      return runRulesSearch(args.slice(1));
    case 'add':
      return runRulesAdd(cwd, args.slice(1));
    default:
      process.stderr.write(`Error: unknown rules subcommand "${sub}"\n\n`);
      printRulesHelp(process.stderr);
      return 2;
  }
}

function printRulesHelp(stream: NodeJS.WritableStream = process.stdout): void {
  stream.write(`Usage: concert rules <subcommand> [args]

Browse and install Claude Code rules from the Concert assets repo
into the current project's .claude/rules/ folder.

Subcommands:
  list                       List all rules available in the assets repo
  search <term>              Search rules by name or description
  add <rule>...              Copy one or more rules into .claude/rules/

Environment:
  CONCERT_ASSETS_REPO        Override the assets repo (default: he3-org/concert-assets)
  CONCERT_ASSETS_REF         Override the git ref to fetch from (default: HEAD)

Examples:
  concert rules list
  concert rules search commit
  concert rules add conventional-commits
`);
}

function formatRulesTable(rules: RuleSummary[]): string {
  if (rules.length === 0) return '  (no rules found)\n';
  const nameWidth = Math.max(4, ...rules.map((r) => r.name.length));
  const lines: string[] = [];
  lines.push(`  ${'NAME'.padEnd(nameWidth)}  DESCRIPTION`);
  lines.push(`  ${'-'.repeat(nameWidth)}  ${'-'.repeat(40)}`);
  for (const r of rules) {
    const desc = r.description || '(no description)';
    lines.push(`  ${r.name.padEnd(nameWidth)}  ${desc}`);
  }
  return lines.join('\n') + '\n';
}

async function runRulesList(): Promise<number> {
  const cfg = getAssetsRepoConfig();
  process.stdout.write(`Fetching rules from ${cfg.repo}@${cfg.ref}...\n\n`);
  let rules: RuleSummary[];
  try {
    rules = await listAvailableRules(cfg);
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
  process.stdout.write(formatRulesTable(rules));
  process.stdout.write(
    `\n  ${rules.length} rule${rules.length === 1 ? '' : 's'} available.  Run \`concert rules add <name>\` to install one into this repo.\n`
  );
  return 0;
}

async function runRulesSearch(args: string[]): Promise<number> {
  if (args.length === 0) {
    process.stderr.write(`Error: search requires a term

  Usage: concert rules search <term>
`);
    return 2;
  }
  const term = args.join(' ');
  const cfg = getAssetsRepoConfig();
  process.stdout.write(`Searching rules in ${cfg.repo}@${cfg.ref} for "${term}"...\n\n`);
  let all: RuleSummary[];
  try {
    all = await listAvailableRules(cfg);
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
  const matches = searchRules(all, term);
  process.stdout.write(formatRulesTable(matches));
  process.stdout.write(
    `\n  ${matches.length} match${matches.length === 1 ? '' : 'es'} of ${all.length} rule${all.length === 1 ? '' : 's'}.\n`
  );
  return 0;
}

async function runRulesAdd(cwd: string, args: string[]): Promise<number> {
  if (args.length === 0) {
    process.stderr.write(`Error: add requires at least one rule name

  Usage: concert rules add <rule>...
  Tip:   run \`concert rules list\` to see what's available
`);
    return 2;
  }

  const cfg = getAssetsRepoConfig();
  let exit = 0;
  const lines: string[] = [];
  for (const name of args) {
    try {
      const content = await fetchRuleContent(name, cfg);
      const result = writeRuleToTarget(cwd, name, content);
      const verb = result.overwritten ? 'Overwrote' : 'Installed';
      lines.push(`  ${verb} rule "${result.rule}"`);
      lines.push(`    ${result.file}`);
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
      `\n  Rules are now available under .claude/rules/ for Claude Code to load.\n`
    );
  }
  return exit;
}
