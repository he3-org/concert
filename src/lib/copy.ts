import * as fs from "node:fs";
import * as path from "node:path";
import { isManagedFile } from "./version.js";

export interface CopyResult {
  created: string[];
  skipped: string[];
  overwritten: string[];
}

/**
 * Resolve the package root directory (parent of dist/).
 * Live files (agents, workflows, skills, commands, GitHub agents) ship here.
 */
export function resolvePackageRoot(): string {
  // __dirname points to dist/ when bundled
  const fromDist = path.resolve(__dirname, "..");
  if (fs.existsSync(path.join(fromDist, "templates"))) {
    return fromDist;
  }
  // Development: use cwd
  const fromCwd = process.cwd();
  if (fs.existsSync(path.join(fromCwd, "templates"))) {
    return fromCwd;
  }
  throw new Error("Cannot find package root directory");
}

/**
 * Resolve the path to the templates directory inside the npm package.
 * When bundled by tsup, the dist/ folder is a sibling of templates/.
 */
export function resolveTemplatesDir(): string {
  return path.join(resolvePackageRoot(), "templates");
}

/**
 * Copy all files from source directory to target directory recursively.
 *
 * @param srcDir - Source directory (templates/)
 * @param targetDir - Target directory (user's project root)
 * @param overwrite - Whether to overwrite existing files
 * @returns Summary of files created, skipped, and overwritten
 */
export function copyTemplates(
  srcDir: string,
  targetDir: string,
  overwrite: boolean = false,
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], overwritten: [] };
  copyRecursive(srcDir, targetDir, "", overwrite, result);
  return result;
}

function copyRecursive(
  srcDir: string,
  targetDir: string,
  relativePath: string,
  overwrite: boolean,
  result: CopyResult,
): void {
  const srcPath = path.join(srcDir, relativePath);
  const entries = fs.readdirSync(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = relativePath
      ? path.join(relativePath, entry.name)
      : entry.name;
    const srcFile = path.join(srcDir, relPath);
    const targetFile = path.join(targetDir, relPath);

    if (entry.isDirectory()) {
      if (!fs.existsSync(targetFile)) {
        fs.mkdirSync(targetFile, { recursive: true });
      }
      copyRecursive(srcDir, targetDir, relPath, overwrite, result);
    } else {
      if (fs.existsSync(targetFile)) {
        if (overwrite) {
          fs.copyFileSync(srcFile, targetFile);
          result.overwritten.push(relPath);
        } else {
          result.skipped.push(relPath);
        }
      } else {
        const dir = path.dirname(targetFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(srcFile, targetFile);
        result.created.push(relPath);
      }
    }
  }
}

/**
 * Copy only managed files from source to target (for update).
 * Only overwrites files that have the managed header in the target.
 */
export function copyManagedFiles(
  srcDir: string,
  targetDir: string,
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], overwritten: [] };
  copyManagedRecursive(srcDir, targetDir, "", result);
  return result;
}

function copyManagedRecursive(
  srcDir: string,
  targetDir: string,
  relativePath: string,
  result: CopyResult,
): void {
  const srcPath = path.join(srcDir, relativePath);
  const entries = fs.readdirSync(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = relativePath
      ? path.join(relativePath, entry.name)
      : entry.name;
    const srcFile = path.join(srcDir, relPath);
    const targetFile = path.join(targetDir, relPath);

    if (entry.isDirectory()) {
      copyManagedRecursive(srcDir, targetDir, relPath, result);
    } else {
      if (!fs.existsSync(targetFile)) {
        // New file in template that doesn't exist in target — create it
        const dir = path.dirname(targetFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(srcFile, targetFile);
        result.created.push(relPath);
      } else {
        // File exists — only overwrite if it's a managed file
        const content = fs.readFileSync(targetFile, "utf-8");
        if (isManagedFile(content)) {
          fs.copyFileSync(srcFile, targetFile);
          result.overwritten.push(relPath);
        } else {
          result.skipped.push(relPath);
        }
      }
    }
  }
}

/**
 * Count files in a directory by category.
 * Returns counts like { agents: 14, workflows: 8, skills: 7 }.
 */
export function countTemplateFiles(dir: string): Record<string, number> {
  const counts: Record<string, number> = {};
  countRecursive(dir, "", counts);
  return counts;
}

function countRecursive(
  baseDir: string,
  relativePath: string,
  counts: Record<string, number>,
): void {
  const dirPath = relativePath ? path.join(baseDir, relativePath) : baseDir;
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = relativePath
      ? path.join(relativePath, entry.name)
      : entry.name;
    if (entry.isDirectory()) {
      countRecursive(baseDir, relPath, counts);
    } else if (entry.name !== ".gitkeep") {
      // Categorize by parent directory
      const parts = relPath.split(path.sep);
      const category =
        parts.length > 1 ? (parts[parts.length - 2] ?? "root") : "root";
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }
}

/**
 * Skills excluded from shipping. These are specific to the Concert repo
 * and not useful for target repos. Everything else in .claude/skills/ ships.
 */
export const EXCLUDED_SKILLS: readonly string[] = [];

/**
 * Rules excluded from shipping. These are specific to the Concert repo
 * and not useful for target repos. Everything else in .claude/rules/ ships.
 */
export const EXCLUDED_RULES: readonly string[] = [
  "concert-repo-managed-files.md",
];

/**
 * Live file sources that ship directly from the package (not templates).
 * Each entry maps a source directory (relative to package root) to a target
 * directory (relative to user's project root).
 */
export const LIVE_FILE_SOURCES = [
  { src: ".claude/agents", target: ".claude/agents" },
  { src: "docs/concert/workflows", target: "docs/concert/workflows" },
  { src: ".claude/commands/concert", target: ".claude/commands/concert" },
  { src: ".github/agents", target: ".github/agents", pattern: /^concert-.*\.agent\.md$/ },
  { src: ".github/workflows", target: ".github/workflows", pattern: /^concert-.*\.yml$/ },
] as const;

/**
 * Discover all skill directories that should ship, excluding EXCLUDED_SKILLS.
 */
export function discoverSkills(packageRoot: string): Array<{ src: string; target: string }> {
  const skillsDir = path.join(packageRoot, ".claude", "skills");
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !EXCLUDED_SKILLS.includes(e.name))
    .map((e) => ({
      src: `.claude/skills/${e.name}`,
      target: `.claude/skills/${e.name}`,
    }));
}

/**
 * Discover all rule files that should ship, excluding EXCLUDED_RULES.
 */
export function discoverRules(packageRoot: string): Array<{ src: string; target: string; file: string }> {
  const rulesDir = path.join(packageRoot, ".claude", "rules");
  if (!fs.existsSync(rulesDir)) return [];
  return fs.readdirSync(rulesDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !EXCLUDED_RULES.includes(e.name))
    .map((e) => ({
      src: ".claude/rules",
      target: ".claude/rules",
      file: e.name,
    }));
}

/**
 * Copy live files from the package root to the target directory.
 * Copies entire directories, always overwriting managed files.
 */
export function copyLiveFiles(
  packageRoot: string,
  targetDir: string,
  overwrite: boolean,
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], overwritten: [] };

  // Combine static sources with dynamically discovered skills
  const allSources = [...LIVE_FILE_SOURCES, ...discoverSkills(packageRoot)];

  // Copy individual rule files (not a full directory copy)
  const rules = discoverRules(packageRoot);
  if (rules.length > 0) {
    const rulesTargetDir = path.join(targetDir, ".claude", "rules");
    if (!fs.existsSync(rulesTargetDir)) {
      fs.mkdirSync(rulesTargetDir, { recursive: true });
    }
    for (const rule of rules) {
      const srcFile = path.join(packageRoot, rule.src, rule.file);
      const destFile = path.join(rulesTargetDir, rule.file);
      const relPath = path.join(rule.target, rule.file);

      if (fs.existsSync(destFile)) {
        if (overwrite) {
          fs.copyFileSync(srcFile, destFile);
          result.overwritten.push(relPath);
        } else {
          result.skipped.push(relPath);
        }
      } else {
        fs.copyFileSync(srcFile, destFile);
        result.created.push(relPath);
      }
    }
  }

  for (const source of allSources) {
    const srcDir = path.join(packageRoot, source.src);
    if (!fs.existsSync(srcDir)) continue;

    const targetPath = path.join(targetDir, source.target);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Copy subdirectories recursively
        copyRecursive(srcDir, targetPath, entry.name, overwrite, result);
        continue;
      }
      if ("pattern" in source && source.pattern && !source.pattern.test(entry.name)) {
        continue;
      }
      const srcFile = path.join(srcDir, entry.name);
      const destFile = path.join(targetPath, entry.name);
      const relPath = path.join(source.target, entry.name);

      if (fs.existsSync(destFile)) {
        if (overwrite) {
          fs.copyFileSync(srcFile, destFile);
          result.overwritten.push(relPath);
        } else {
          result.skipped.push(relPath);
        }
      } else {
        fs.copyFileSync(srcFile, destFile);
        result.created.push(relPath);
      }
    }
  }

  return result;
}

/**
 * Count live files that would be installed from the package.
 */
export function countLiveFiles(packageRoot: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const allSources = [...LIVE_FILE_SOURCES, ...discoverSkills(packageRoot)];
  for (const source of allSources) {
    const srcDir = path.join(packageRoot, source.src);
    if (!fs.existsSync(srcDir)) continue;
    const category = path.basename(source.src);
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      if ("pattern" in source && source.pattern && !source.pattern.test(entry.name)) continue;
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }
  // Roll up individual skill counts into a single "skills" count
  const skills = discoverSkills(packageRoot);
  if (skills.length > 0) {
    counts["skills"] = skills.length;
  }
  // Count rules
  const rules = discoverRules(packageRoot);
  if (rules.length > 0) {
    counts["rules"] = rules.length;
  }
  return counts;
}
