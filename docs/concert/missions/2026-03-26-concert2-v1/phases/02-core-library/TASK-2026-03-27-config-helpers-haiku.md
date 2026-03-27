---
task: "config-helpers"
title: "Implement concert.jsonc read/write helpers using jsonc-parser"
depends_on: ["types", "default-state-and-config"]
wave: 1
model: haiku
---

## Objective

Create helper functions for reading and writing `concert.jsonc`. Uses `jsonc-parser` for parsing JSONC (JSON with comments) and preserving comments during modifications.

## Files

- `src/lib/config.ts`
- `src/__tests__/config.test.ts`

## Requirements

- DR-002: concert.jsonc Configuration Schema
- FR-013: Update Mechanism (comment preservation)

## Detailed Instructions

### src/lib/config.ts

```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import * as jsonc from "jsonc-parser";
import type { ConcertConfig } from "../types.js";

const CONFIG_FILENAME = "concert.jsonc";

/**
 * Resolve the absolute path to concert.jsonc from the given working directory.
 */
export function resolveConfigPath(cwd: string): string {
  return path.resolve(cwd, CONFIG_FILENAME);
}

/**
 * Read concert.jsonc from disk. Returns null if the file does not exist.
 */
export function readConfig(cwd: string): ConcertConfig | null {
  const configPath = resolveConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  const errors: jsonc.ParseError[] = [];
  const parsed = jsonc.parse(raw, errors);
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse ${CONFIG_FILENAME}: ${errors.map((e) => jsonc.printParseErrorCode(e.error)).join(", ")}`,
    );
  }
  return parsed as ConcertConfig;
}

/**
 * Read concert.jsonc as raw text (for comment-preserving operations).
 */
export function readConfigRaw(cwd: string): string | null {
  const configPath = resolveConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return fs.readFileSync(configPath, "utf-8");
}

/**
 * Write concert.jsonc to disk. Overwrites the entire file.
 * Use modifyConfig for comment-preserving edits.
 */
export function writeConfig(cwd: string, content: string): void {
  const configPath = resolveConfigPath(cwd);
  fs.writeFileSync(configPath, content, "utf-8");
}

/**
 * Apply a modification to concert.jsonc preserving comments.
 * Uses jsonc-parser's modify API.
 *
 * @param raw - The raw JSONC text
 * @param jsonPath - Path to the field (e.g., ["execution", "max_review_iterations"])
 * @param value - The new value to set
 * @returns The modified JSONC text
 */
export function modifyConfigField(
  raw: string,
  jsonPath: (string | number)[],
  value: unknown,
): string {
  const edits = jsonc.modify(raw, jsonPath, value, {
    formattingOptions: {
      tabSize: 2,
      insertSpaces: true,
      eol: "\n",
    },
  });
  return jsonc.applyEdits(raw, edits);
}

/**
 * Set the project_name in concert.jsonc from package.json or directory name.
 */
export function detectProjectName(cwd: string): string {
  const pkgPath = path.resolve(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.name && typeof pkg.name === "string") {
        // Strip scope prefix if present
        return pkg.name.replace(/^@[^/]+\//, "");
      }
    } catch {
      // Fall through to directory name
    }
  }
  return path.basename(cwd);
}
```

### Key behaviors

- Uses `jsonc-parser` for all JSONC parsing (handles comments, trailing commas)
- `modifyConfigField` preserves comments when editing individual fields
- `readConfigRaw` returns raw text for comment-preserving operations
- `detectProjectName` tries package.json name first, falls back to directory name

## Tests

Write tests in `src/__tests__/config.test.ts`:

1. `readConfig` returns null for non-existent file
2. `readConfig` correctly parses valid JSONC with comments
3. `readConfig` throws on invalid JSONC
4. `readConfigRaw` returns raw text including comments
5. `modifyConfigField` sets a top-level field preserving comments
6. `modifyConfigField` sets a nested field preserving comments
7. `detectProjectName` reads name from package.json
8. `detectProjectName` strips scope prefix
9. `detectProjectName` falls back to directory name

Use a temporary directory for test files.

## Acceptance Criteria

- [ ] `readConfig` parses JSONC correctly (including comments and trailing commas)
- [ ] `readConfigRaw` preserves raw text with comments
- [ ] `modifyConfigField` modifies a field without removing comments
- [ ] `detectProjectName` correctly detects project name from package.json or directory
- [ ] All tests pass
- [ ] `npm run typecheck` passes
