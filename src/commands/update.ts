import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolvePackageRoot, copyLiveFiles, cleanupStaleFiles } from '../lib/copy.js';
import { readConfigRaw, writeConfig, readConfig, modifyConfigField } from '../lib/config.js';
import { readState, writeState } from '../lib/state.js';
import { getPackageVersion } from '../lib/version.js';
import { mergeState, mergeConfig } from '../lib/merge.js';
import { CLAUDE_SECTION_START, CLAUDE_SECTION_END } from '../types.js';
import * as jsonc from 'jsonc-parser';

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
 * Update CLAUDE.md Concert section or append it if missing.
 */
function updateClaudeMd(cwd: string): { action: 'updated' | 'created' | 'skipped' } {
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  const newSection = buildConcertSection();

  if (!fs.existsSync(claudeMdPath)) {
    return { action: 'skipped' };
  }

  const existing = fs.readFileSync(claudeMdPath, 'utf-8');
  const startMarker = '<!-- CONCERT:START';
  const endMarker = '<!-- CONCERT:END';
  const startIdx = existing.indexOf(startMarker);
  const endIdx = existing.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing section
    const before = existing.substring(0, startIdx).trimEnd();
    const afterEndMarker = endMarker + ' -->';
    const endPos = existing.indexOf(afterEndMarker);
    const after =
      endPos !== -1 ? existing.substring(endPos + afterEndMarker.length).trimStart() : '';
    let updated = before + '\n\n' + newSection;
    if (after) {
      updated += '\n\n' + after;
    }
    updated = updated.trimEnd() + '\n';
    fs.writeFileSync(claudeMdPath, updated, 'utf-8');
    return { action: 'updated' };
  } else {
    // Append section
    const updated = existing.trimEnd() + '\n\n' + newSection + '\n';
    fs.writeFileSync(claudeMdPath, updated, 'utf-8');
    return { action: 'updated' };
  }
}

/**
 * Run the concert update command.
 * Returns exit code: 0 (success or already current), 2 (error)
 */
export async function runUpdate(cwd: string): Promise<number> {
  const version = getPackageVersion();

  // Check for existing Concert installation
  const concertDir = path.join(cwd, CONCERT_DIR);
  if (!fs.existsSync(concertDir)) {
    process.stderr.write(`Error: Concert is not installed in this repository

  Run init first:
    npx @he3-org/concert init
`);
    return 2;
  }

  // Resolve package root
  let packageRoot: string;
  try {
    packageRoot = resolvePackageRoot();
  } catch {
    const devRoot = cwd;
    if (fs.existsSync(path.join(devRoot, 'templates'))) {
      packageRoot = devRoot;
    } else {
      process.stderr.write(`Error: cannot find package root directory\n`);
      return 2;
    }
  }

  const templatesDir = path.join(packageRoot, 'templates');

  // Update live files (GitHub agents, Claude commands)
  // Always overwrite — these are managed by Concert
  const liveResult = copyLiveFiles(packageRoot, cwd, true, version);
  const updatedFiles: Array<{ path: string; from: string; to: string }> = [];
  for (const f of liveResult.overwritten) {
    updatedFiles.push({ path: f, from: 'previous', to: `v${version}` });
  }
  for (const f of liveResult.created) {
    updatedFiles.push({ path: f, from: 'none', to: `v${version}` });
  }

  // Update CLAUDE.md section
  const claudeResult = updateClaudeMd(cwd);

  // Update concert.jsonc — surgical merge
  let configReport = { added: [] as string[], removed: [] as string[], warnings: [] as string[] };
  const currentRaw = readConfigRaw(cwd);
  const templateConfigPath = path.join(templatesDir, 'concert.jsonc');
  if (currentRaw && fs.existsSync(templateConfigPath)) {
    const templateRaw = fs.readFileSync(templateConfigPath, 'utf-8');
    const templateConfig = jsonc.parse(templateRaw, undefined, {
      allowTrailingComma: true,
    }) as Record<string, unknown>;
    let { mergedRaw, report } = mergeConfig(currentRaw, templateConfig);
    // Always update concert_version to the current package version
    mergedRaw = modifyConfigField(mergedRaw, ['concert_version'], version);
    writeConfig(cwd, mergedRaw);
    configReport = report;
  }

  // Update state.json — surgical merge
  let stateReport = { added: [] as string[], removed: [] as string[], warnings: [] as string[] };
  const currentState = readState(cwd);
  const templateStatePath = path.join(templatesDir, '.concert', 'state.json');
  if (currentState && fs.existsSync(templateStatePath)) {
    const templateStateRaw = fs.readFileSync(templateStatePath, 'utf-8');
    const templateState = JSON.parse(templateStateRaw) as Record<string, unknown>;
    const { merged, report } = mergeState(
      currentState as unknown as Record<string, unknown>,
      templateState
    );
    writeState(cwd, merged as unknown as Parameters<typeof writeState>[1]);
    stateReport = report;
  }

  // Clean up stale Concert-managed files from previous versions
  const cleanupResult = cleanupStaleFiles(cwd, version);

  const allCurrent =
    updatedFiles.length === 0 &&
    configReport.added.length === 0 &&
    configReport.removed.length === 0 &&
    stateReport.added.length === 0 &&
    stateReport.removed.length === 0 &&
    cleanupResult.deleted.length === 0;

  if (allCurrent) {
    process.stdout.write(`Concert is up to date (v${version})

  All managed files are at the current version.
  No configuration changes needed.

  Next steps:
    1. Continue using Concert agents in your project
`);
    return 0;
  }

  // Build output
  let output = `Concert updated to v${version}\n\n`;

  if (updatedFiles.length > 0) {
    output += `  Updated managed files:\n`;
    for (const f of updatedFiles) {
      output += `    ${f.path}  (${f.from} -> ${f.to})\n`;
    }
    output += '\n';
  }

  if (cleanupResult.deleted.length > 0) {
    output += `  Removed stale files from previous version:\n`;
    for (const f of cleanupResult.deleted) {
      output += `    ${f}\n`;
    }
    output += '\n';
  }

  if (configReport.added.length > 0 || configReport.removed.length > 0) {
    output += `  Configuration merged (concert.jsonc):\n`;
    for (const field of configReport.added) {
      output += `    Added:   ${field}\n`;
    }
    for (const field of configReport.removed) {
      output += `    Removed: ${field}\n`;
    }
    output += '\n';
  }

  if (stateReport.added.length > 0 || stateReport.removed.length > 0) {
    output += `  State schema updated (state.json):\n`;
    for (const field of stateReport.added) {
      output += `    Added:   ${field} (default: null)\n`;
    }
    output += '\n';
  }

  if (claudeResult.action === 'updated') {
    output += `  CLAUDE.md:  Concert section updated\n\n`;
  }

  output += `  Next steps:\n`;
  output += `    1. Review concert.jsonc for new configuration options\n`;
  output += `    2. Continue using Concert agents in your project\n`;

  process.stdout.write(output);
  return 0;
}
