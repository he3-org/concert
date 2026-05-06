import * as fs from 'node:fs';
import * as path from 'node:path';
import { atomicWriteFile } from './atomic-write.js';

/**
 * Entries Concert requires in the target repo's .gitignore.
 * The SQLite cache files are local-only and must never be committed.
 */
export const CONCERT_GITIGNORE_ENTRIES: readonly string[] = [
  '.concert/index.sqlite',
  '.concert/index.sqlite-shm',
  '.concert/index.sqlite-wal',
];

const SECTION_HEADER = '# Concert: local SQLite cache (do not commit)';

/**
 * Ensure the target repo's .gitignore contains all entries Concert needs.
 * - Creates the file if it does not exist.
 * - Appends only missing entries (preserves existing lines, comments, order).
 * - Returns the list of entries that were added (empty if nothing changed).
 */
export function ensureGitignoreEntries(
  cwd: string,
  entries: readonly string[] = CONCERT_GITIGNORE_ENTRIES
): { added: string[] } {
  const gitignorePath = path.join(cwd, '.gitignore');
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

  const existingLines = new Set(
    existing
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'))
  );

  const missing = entries.filter((e) => !existingLines.has(e));
  if (missing.length === 0) {
    return { added: [] };
  }

  const block = SECTION_HEADER + '\n' + missing.join('\n') + '\n';
  let updated: string;
  if (existing.length === 0) {
    updated = block;
  } else {
    const trimmed = existing.replace(/\s+$/, '');
    updated = trimmed + '\n\n' + block;
  }

  atomicWriteFile(gitignorePath, updated);
  return { added: missing };
}
