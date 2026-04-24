import * as fs from 'node:fs';
import * as path from 'node:path';
import { isGitRepo } from '../lib/git.js';
import {
  copyTemplates,
  resolvePackageRoot,
  copyLiveFiles,
  countLiveFiles,
  copyReadme,
} from '../lib/copy.js';
import { readConfigRaw, writeConfig, modifyConfigField, detectProjectName } from '../lib/config.js';
import { getPackageVersion } from '../lib/version.js';
import { CLAUDE_SECTION_START, CLAUDE_SECTION_END } from '../types.js';

const CONCERT_DIR = '.concert';

/**
 * Build the Concert CLAUDE.md section content.
 */
function buildConcertSection(): string {
  return `${CLAUDE_SECTION_START}

## Concert

This project uses [Concert](https://github.com/he3-org/concert) for agentic development orchestration.

### Commands

- \`/concert-vision\` — Create a comprehensive VISION.md from a feature description

### State

- Configuration: \`concert.jsonc\`
- State: \`.concert/state.json\`

### Do Not Modify

The following paths are managed by Concert and must not be modified by other agents, refactoring tools, or automated processes. They will be overwritten on \`concert update\`:

- \`.github/agents/concert-*.agent.md\`
- \`.claude/commands/concert-*.md\`
- \`.claude/rules/concert-*.md\`
- \`concert.jsonc\` (modify manually only — Concert preserves your changes on update)

${CLAUDE_SECTION_END}`;
}

/**
 * Handle CLAUDE.md: append Concert section if exists, or create new file.
 */
function handleClaudeMd(cwd: string): void {
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  const concertSection = buildConcertSection();

  if (fs.existsSync(claudeMdPath)) {
    const existing = fs.readFileSync(claudeMdPath, 'utf-8');
    // Append Concert section if not already present
    if (!existing.includes('CONCERT:START')) {
      const updated = existing.trimEnd() + '\n\n' + concertSection + '\n';
      fs.writeFileSync(claudeMdPath, updated, 'utf-8');
    }
  } else {
    fs.writeFileSync(claudeMdPath, concertSection + '\n', 'utf-8');
  }
}

/**
 * Run the concert init command.
 * Returns exit code: 0 (success), 1 (already initialized), 2 (error)
 */
export async function runInit(cwd: string): Promise<number> {
  const version = getPackageVersion();

  // Check if cwd is a git repo
  if (!isGitRepo(cwd)) {
    process.stderr.write(`Error: not a git repository
  Concert requires a git repository. Initialize one first.

  Fix:
    git init && git commit --allow-empty -m "chore: initial commit"
    npx @he3-org/concert init
`);
    return 2;
  }

  // Check for existing Concert installation
  const concertDir = path.join(cwd, CONCERT_DIR);
  if (fs.existsSync(concertDir)) {
    process.stderr.write(`Warning: Concert files already exist in this repository

  Existing files found:
    .concert/
    concert.jsonc    (user configuration)

  Options:
    Update managed files:  npx @he3-org/concert update
    Abort:  no action needed
`);
    return 1;
  }

  // Resolve package root and templates
  let packageRoot: string;
  try {
    packageRoot = resolvePackageRoot();
  } catch {
    process.stderr.write(`Error: cannot find package root directory
  This is an internal error. Please report it at https://github.com/he3-org/concert/issues
`);
    return 2;
  }

  const templatesDir = path.join(packageRoot, 'templates');

  // Copy template files (config, state, CLAUDE.md, .concert/)
  const result = copyTemplates(templatesDir, cwd, false, version);

  // Copy live files (GitHub agents, Claude commands)
  const liveResult = copyLiveFiles(packageRoot, cwd, false, version);
  result.created.push(...liveResult.created);
  result.skipped.push(...liveResult.skipped);

  // Copy README.md to .concert/
  const readmeResult = copyReadme(packageRoot, cwd, false);
  result.created.push(...readmeResult.created);
  result.skipped.push(...readmeResult.skipped);

  // Set project_name and concert_version in concert.jsonc
  const projectName = detectProjectName(cwd);
  const rawConfig = readConfigRaw(cwd);
  if (rawConfig) {
    let modified = modifyConfigField(rawConfig, ['project_name'], projectName);
    modified = modifyConfigField(modified, ['concert_version'], version);
    writeConfig(cwd, modified);
  }

  // Handle CLAUDE.md
  handleClaudeMd(cwd);

  // Count live files for output
  const liveCounts = countLiveFiles(packageRoot);
  const agentCount = liveCounts['agents'] ?? 0;
  const commandCount = liveCounts['commands'] ?? 0;
  const ruleCount = liveCounts['rules'] ?? 0;

  // Output success
  process.stdout.write(`Concert v${version} initialized in ${cwd}

  Created:
    concert.jsonc                 (default configuration)
    .concert/                     (state and missions)
    .github/agents/               (${agentCount} GitHub agent definitions)
    .claude/commands/             (${commandCount} command files)
    .claude/rules/                (${ruleCount} rule files)
    CLAUDE.md                     (Concert section appended)

  Files: ${result.created.length} created

  Next steps:
    1. Review concert.jsonc and adjust configuration if needed
    2. Start using Concert agents in your project
`);

  return 0;
}
