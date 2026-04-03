import * as fs from 'node:fs';
import * as path from 'node:path';
import * as jsonc from 'jsonc-parser';
import type { ConcertConfig } from '../types.js';

const CONFIG_FILENAME = 'concert.jsonc';

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
  const raw = fs.readFileSync(configPath, 'utf-8');
  const errors: jsonc.ParseError[] = [];
  const parsed = jsonc.parse(raw, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse ${CONFIG_FILENAME}: ${errors.map((e) => jsonc.printParseErrorCode(e.error)).join(', ')}`
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
  return fs.readFileSync(configPath, 'utf-8');
}

/**
 * Write concert.jsonc to disk. Overwrites the entire file.
 * Use modifyConfig for comment-preserving edits.
 */
export function writeConfig(cwd: string, content: string): void {
  const configPath = resolveConfigPath(cwd);
  fs.writeFileSync(configPath, content, 'utf-8');
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
  value: unknown
): string {
  const edits = jsonc.modify(raw, jsonPath, value, {
    formattingOptions: {
      tabSize: 2,
      insertSpaces: true,
      eol: '\n',
    },
  });
  return jsonc.applyEdits(raw, edits);
}

/**
 * Set the project_name in concert.jsonc from package.json or directory name.
 */
export function detectProjectName(cwd: string): string {
  const pkgPath = path.resolve(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        name?: string;
      };
      if (pkg.name && typeof pkg.name === 'string') {
        // Strip scope prefix if present
        return pkg.name.replace(/^@[^/]+\//, '');
      }
    } catch {
      // Fall through to directory name
    }
  }
  return path.basename(cwd);
}
