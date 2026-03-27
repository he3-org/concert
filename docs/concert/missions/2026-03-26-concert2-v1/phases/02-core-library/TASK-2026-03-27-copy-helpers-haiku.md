---
task: "copy-helpers"
title: "Implement recursive file copying with managed header detection"
depends_on: ["types", "version-helpers"]
wave: 2
model: haiku
---

## Objective

Create utility functions for recursively copying template files into a target directory, with support for managed file header detection and selective copying.

## Files

- `src/lib/copy.ts`
- `src/__tests__/copy.test.ts`

## Requirements

- FR-001: Repository Bootstrapping via npx
- FR-012: Managed File Headers

## Detailed Instructions

### src/lib/copy.ts

```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import { isManagedFile } from "./version.js";

export interface CopyResult {
  created: string[];
  skipped: string[];
  overwritten: string[];
}

/**
 * Resolve the path to the templates directory inside the npm package.
 * When bundled by tsup, the dist/ folder is a sibling of templates/.
 */
export function resolveTemplatesDir(): string {
  // __dirname points to dist/ when bundled
  const fromDist = path.resolve(__dirname, "..", "templates");
  if (fs.existsSync(fromDist)) {
    return fromDist;
  }
  // Development: look relative to the project root
  const fromCwd = path.resolve(process.cwd(), "templates");
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }
  throw new Error("Cannot find templates directory");
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
    const relPath = path.join(relativePath, entry.name);
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
    const relPath = path.join(relativePath, entry.name);
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
  const dirPath = path.join(baseDir, relativePath);
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      countRecursive(baseDir, relPath, counts);
    } else if (entry.name !== ".gitkeep") {
      // Categorize by parent directory
      const parts = relPath.split(path.sep);
      const category = parts.length > 1 ? parts[parts.length - 2] : "root";
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }
}
```

## Tests

Write tests in `src/__tests__/copy.test.ts`:

1. `copyTemplates` copies all files from source to empty target
2. `copyTemplates` skips existing files when overwrite is false
3. `copyTemplates` overwrites existing files when overwrite is true
4. `copyTemplates` creates nested directories
5. `copyManagedFiles` only overwrites files with managed headers
6. `copyManagedFiles` skips files without managed headers
7. `copyManagedFiles` creates new files that don't exist in target
8. `countTemplateFiles` correctly counts files by category

## Acceptance Criteria

- [ ] `copyTemplates` recursively copies all template files
- [ ] `copyTemplates` respects the overwrite flag
- [ ] `copyManagedFiles` only overwrites managed files
- [ ] `countTemplateFiles` produces correct counts
- [ ] All tests pass
- [ ] `npm run typecheck` passes
