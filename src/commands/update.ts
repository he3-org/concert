import * as fs from "node:fs";
import * as path from "node:path";
import { copyManagedFiles, resolveTemplatesDir } from "../lib/copy.js";
import { readConfigRaw, writeConfig, readConfig } from "../lib/config.js";
import { readState, writeState } from "../lib/state.js";
import { getPackageVersion, extractHeaderVersion, isManagedFile } from "../lib/version.js";
import { mergeState, mergeConfig } from "../lib/merge.js";
import { CLAUDE_SECTION_START, CLAUDE_SECTION_END } from "../types.js";
import * as jsonc from "jsonc-parser";

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

### State

- Configuration: \`concert.jsonc\`
- State: \`docs/concert/state.json\`
- Agents: \`docs/concert/agents/\`
- Workflows: \`docs/concert/workflows/\`
- Skills: \`docs/concert/skills/\`
- Missions: \`docs/concert/missions/\`

### Do Not Modify

The following paths are managed by Concert and must not be modified by other agents, refactoring tools, or automated processes. They will be overwritten on \`concert update\`:

- \`docs/concert/agents/\`
- \`docs/concert/workflows/\`
- \`docs/concert/skills/\`
- \`.claude/commands/concert/\`
- \`.github/agents/concert-*.agent.md\`
- \`concert.jsonc\` (modify manually only — Concert preserves your changes on update)

${CLAUDE_SECTION_END}`;
}

/**
 * Update CLAUDE.md Concert section or append it if missing.
 */
function updateClaudeMd(cwd: string): { action: "updated" | "created" | "skipped" } {
  const claudeMdPath = path.join(cwd, "CLAUDE.md");
  const newSection = buildConcertSection();

  if (!fs.existsSync(claudeMdPath)) {
    return { action: "skipped" };
  }

  const existing = fs.readFileSync(claudeMdPath, "utf-8");
  const startMarker = "<!-- CONCERT:START";
  const endMarker = "<!-- CONCERT:END";
  const startIdx = existing.indexOf(startMarker);
  const endIdx = existing.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing section
    const before = existing.substring(0, startIdx).trimEnd();
    const afterEndMarker = endMarker + " -->";
    const endPos = existing.indexOf(afterEndMarker);
    const after = endPos !== -1
      ? existing.substring(endPos + afterEndMarker.length).trimStart()
      : "";
    let updated = before + "\n\n" + newSection;
    if (after) {
      updated += "\n\n" + after;
    }
    updated = updated.trimEnd() + "\n";
    fs.writeFileSync(claudeMdPath, updated, "utf-8");
    return { action: "updated" };
  } else {
    // Append section
    const updated = existing.trimEnd() + "\n\n" + newSection + "\n";
    fs.writeFileSync(claudeMdPath, updated, "utf-8");
    return { action: "updated" };
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

  // Resolve templates directory
  let templatesDir: string;
  try {
    templatesDir = resolveTemplatesDir();
  } catch {
    const devTemplates = path.resolve(cwd, "templates");
    if (fs.existsSync(devTemplates)) {
      templatesDir = devTemplates;
    } else {
      process.stderr.write(`Error: cannot find templates directory\n`);
      return 2;
    }
  }

  // Track what changed
  const updatedFiles: Array<{ path: string; from: string; to: string }> = [];
  const skippedFiles: Array<{ path: string; version: string }> = [];

  // Update managed files — walk templates, check version headers
  updateManagedFilesWithVersionCheck(
    templatesDir,
    cwd,
    "",
    version,
    updatedFiles,
    skippedFiles,
  );

  // Update CLAUDE.md section
  const claudeResult = updateClaudeMd(cwd);

  // Update concert.jsonc — surgical merge
  let configReport = { added: [] as string[], removed: [] as string[], warnings: [] as string[] };
  const currentRaw = readConfigRaw(cwd);
  const templateConfigPath = path.join(templatesDir, "concert.jsonc");
  if (currentRaw && fs.existsSync(templateConfigPath)) {
    const templateRaw = fs.readFileSync(templateConfigPath, "utf-8");
    const templateConfig = jsonc.parse(templateRaw) as Record<string, unknown>;
    const { mergedRaw, report } = mergeConfig(currentRaw, templateConfig);
    writeConfig(cwd, mergedRaw);
    configReport = report;
  }

  // Update state.json — surgical merge
  let stateReport = { added: [] as string[], removed: [] as string[], warnings: [] as string[] };
  const currentState = readState(cwd);
  const templateStatePath = path.join(templatesDir, "docs", "concert", "state.json");
  if (currentState && fs.existsSync(templateStatePath)) {
    const templateStateRaw = fs.readFileSync(templateStatePath, "utf-8");
    const templateState = JSON.parse(templateStateRaw) as Record<string, unknown>;
    const { merged, report } = mergeState(
      currentState as unknown as Record<string, unknown>,
      templateState,
    );
    writeState(cwd, merged as unknown as Parameters<typeof writeState>[1]);
    stateReport = report;
  }

  const allCurrent = updatedFiles.length === 0 &&
    configReport.added.length === 0 &&
    configReport.removed.length === 0 &&
    stateReport.added.length === 0 &&
    stateReport.removed.length === 0;

  if (allCurrent) {
    process.stdout.write(`Concert is up to date (v${version})

  All ${skippedFiles.length} managed files are at the current version.
  No configuration changes needed.

  Next steps:
    1. Continue your mission:  /concert:status
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
    output += "\n";
  }

  if (skippedFiles.length > 0) {
    output += `  Skipped (already current):\n`;
    for (const f of skippedFiles.slice(0, 5)) {
      output += `    ${f.path}  (${f.version})\n`;
    }
    if (skippedFiles.length > 5) {
      output += `    ... and ${skippedFiles.length - 5} more\n`;
    }
    output += "\n";
  }

  if (configReport.added.length > 0 || configReport.removed.length > 0) {
    output += `  Configuration merged (concert.jsonc):\n`;
    for (const field of configReport.added) {
      output += `    Added:   ${field}\n`;
    }
    for (const field of configReport.removed) {
      output += `    Removed: ${field}\n`;
    }
    output += "\n";
  }

  if (stateReport.added.length > 0 || stateReport.removed.length > 0) {
    output += `  State schema updated (state.json):\n`;
    for (const field of stateReport.added) {
      output += `    Added:   ${field} (default: null)\n`;
    }
    output += "\n";
  }

  if (claudeResult.action === "updated") {
    output += `  CLAUDE.md:  Concert section updated\n\n`;
  }

  output += `  Next steps:\n`;
  output += `    1. Review concert.jsonc for new configuration options\n`;
  output += `    2. Continue your mission:  /concert:status\n`;

  process.stdout.write(output);
  return 0;
}

function updateManagedFilesWithVersionCheck(
  srcDir: string,
  targetDir: string,
  relativePath: string,
  currentVersion: string,
  updatedFiles: Array<{ path: string; from: string; to: string }>,
  skippedFiles: Array<{ path: string; version: string }>,
): void {
  const srcPath = relativePath ? path.join(srcDir, relativePath) : srcDir;
  if (!fs.existsSync(srcPath)) return;
  const entries = fs.readdirSync(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
    const srcFile = path.join(srcDir, relPath);
    const targetFile = path.join(targetDir, relPath);

    if (entry.isDirectory()) {
      updateManagedFilesWithVersionCheck(
        srcDir,
        targetDir,
        relPath,
        currentVersion,
        updatedFiles,
        skippedFiles,
      );
    } else if (fs.existsSync(targetFile)) {
      const targetContent = fs.readFileSync(targetFile, "utf-8");
      if (!isManagedFile(targetContent)) continue;

      const fileVersion = extractHeaderVersion(targetContent);
      // Always overwrite managed files — they are canonical from the template
      const fromVersion = fileVersion ? `v${fileVersion}` : "unknown";
      fs.copyFileSync(srcFile, targetFile);
      if (fileVersion === currentVersion) {
        // Same version but overwrite anyway (idempotent)
        skippedFiles.push({ path: relPath, version: `v${fileVersion}` });
      } else {
        updatedFiles.push({ path: relPath, from: fromVersion, to: `v${currentVersion}` });
      }
    } else {
      // New file in template — create it
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(srcFile, targetFile);
      updatedFiles.push({ path: relPath, from: "none", to: `v${currentVersion}` });
    }
  }
}
