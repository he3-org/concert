import * as fs from "node:fs";
import * as path from "node:path";
import { isGitRepo } from "../lib/git.js";
import { copyTemplates, resolveTemplatesDir, resolvePackageRoot, copyLiveFiles, countLiveFiles } from "../lib/copy.js";
import { readConfigRaw, writeConfig, modifyConfigField, detectProjectName } from "../lib/config.js";
import { getPackageVersion } from "../lib/version.js";
import { CLAUDE_SECTION_START, CLAUDE_SECTION_END } from "../types.js";

const CONCERT_DIR = "docs/concert";

/**
 * Build the Concert CLAUDE.md section content.
 */
function buildConcertSection(): string {
  return `${CLAUDE_SECTION_START}

## Concert

This project uses [Concert](https://github.com/he3-org/concert) for agentic development orchestration.

### Commands

- \`/concert:init\` — Start a new mission
- \`/concert:review\` — Review a stage
- \`/concert:accept\` — Accept a stage
- \`/concert:status\` — Check current status
- \`/concert:continue\` — Continue to next stage or resume execution
- \`/concert:debug\` — Debug an issue
- \`/concert:verify\` — Verify work
- \`/concert:quick\` — Run a quick task
- \`/concert:restart\` — Restart a stage
- \`/concert:replan\` — Replan from a stage
- \`/concert:archive\` — Archive completed mission and reset state

### State

- Configuration: \`concert.jsonc\`
- State: \`docs/concert/state.json\`
- Agents: \`.claude/agents/\`
- Workflows: \`docs/concert/workflows/\`
- Skills: \`.claude/skills/\`
- Missions: \`docs/concert/missions/\`

### Do Not Modify

The following paths are managed by Concert and must not be modified by other agents, refactoring tools, or automated processes. They will be overwritten on \`concert update\`:

- \`.claude/agents/\`
- \`docs/concert/workflows/\`
- \`.claude/skills/\`
- \`.claude/commands/concert/\`
- \`.github/agents/concert-*.agent.md\`
- \`concert.jsonc\` (modify manually only — Concert preserves your changes on update)

${CLAUDE_SECTION_END}`;
}

/**
 * Handle CLAUDE.md: append Concert section if exists, or create new file.
 */
function handleClaudeMd(cwd: string): void {
  const claudeMdPath = path.join(cwd, "CLAUDE.md");
  const concertSection = buildConcertSection();

  if (fs.existsSync(claudeMdPath)) {
    const existing = fs.readFileSync(claudeMdPath, "utf-8");
    // Append Concert section if not already present
    if (!existing.includes("CONCERT:START")) {
      const updated = existing.trimEnd() + "\n\n" + concertSection + "\n";
      fs.writeFileSync(claudeMdPath, updated, "utf-8");
    }
  } else {
    fs.writeFileSync(claudeMdPath, concertSection + "\n", "utf-8");
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
    // Count existing files
    let agentCount = 0;
    let workflowCount = 0;
    const agentsDir = path.join(concertDir, "agents");
    const workflowsDir = path.join(concertDir, "workflows");
    if (fs.existsSync(agentsDir)) {
      agentCount = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length;
    }
    if (fs.existsSync(workflowsDir)) {
      workflowCount = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".md")).length;
    }

    process.stderr.write(`Warning: Concert files already exist in this repository

  Existing files found:
    docs/concert/    (${agentCount} agents, ${workflowCount} workflows)
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

  const templatesDir = path.join(packageRoot, "templates");

  // Copy template files (config, state, README, .gitkeep)
  const result = copyTemplates(templatesDir, cwd, false);

  // Copy live files (agents, workflows, skills, commands, GitHub agents)
  const liveResult = copyLiveFiles(packageRoot, cwd, false);
  result.created.push(...liveResult.created);
  result.skipped.push(...liveResult.skipped);

  // Set project_name in concert.jsonc
  const projectName = detectProjectName(cwd);
  const rawConfig = readConfigRaw(cwd);
  if (rawConfig) {
    const modified = modifyConfigField(rawConfig, ["project_name"], projectName);
    writeConfig(cwd, modified);
  }

  // Handle CLAUDE.md
  handleClaudeMd(cwd);

  // Count live files for output
  const liveCounts = countLiveFiles(packageRoot);
  const agentCount = liveCounts["agents"] ?? 0;
  const workflowCount = liveCounts["workflows"] ?? 0;
  const skillCount = liveCounts["skills"] ?? 0;
  const ghAgentCount = liveCounts["agents"] ?? 0;
  const ghWorkflowCount = liveCounts["workflows"] ?? 0;
  const commandCount = liveCounts["concert"] ?? 0;

  // Output success
  process.stdout.write(`Concert v${version} initialized in ${cwd}

  Created:
    .claude/agents/               (${agentCount} agent definitions)
    docs/concert/workflows/       (${workflowCount} workflow files)
    .claude/skills/               (${skillCount} skill files)
    docs/concert/state.json       (empty state)
    .github/agents/               (${ghAgentCount} GitHub agent stubs)
    .github/workflows/            (${ghWorkflowCount} workflow files)
    .claude/commands/             (${commandCount} skill commands)
    concert.jsonc                 (default configuration)
    CLAUDE.md                     (Concert section appended)

  Files: ${result.created.length} created

  Next steps:
    1. Review concert.jsonc and adjust configuration if needed
    2. Start a mission:
       Claude Code:  /concert:init
       CLI:          Run /concert:init in a Claude Code session
`);

  return 0;
}
