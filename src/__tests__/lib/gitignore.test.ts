import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ensureGitignoreEntries, CONCERT_GITIGNORE_ENTRIES } from '../../lib/gitignore.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-gitignore-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ensureGitignoreEntries', () => {
  it('creates .gitignore with all entries when missing', () => {
    const result = ensureGitignoreEntries(tmpDir);
    expect(result.added).toEqual([...CONCERT_GITIGNORE_ENTRIES]);
    const contents = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    for (const entry of CONCERT_GITIGNORE_ENTRIES) {
      expect(contents).toContain(entry);
    }
  });

  it('appends only missing entries and preserves existing content', () => {
    const original = 'node_modules/\n.concert/index.sqlite\n';
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), original, 'utf-8');
    const result = ensureGitignoreEntries(tmpDir);
    expect(result.added).toEqual(['.concert/index.sqlite-shm', '.concert/index.sqlite-wal']);
    const contents = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(contents.startsWith(original.replace(/\s+$/, ''))).toBe(true);
    expect(contents).toContain('.concert/index.sqlite-shm');
    expect(contents).toContain('.concert/index.sqlite-wal');
    // Existing entry not duplicated
    const matches = contents.match(/\.concert\/index\.sqlite$/gm);
    expect(matches?.length ?? 0).toBe(1);
  });

  it('is a no-op when all entries already present', () => {
    const original = ['node_modules/', ...CONCERT_GITIGNORE_ENTRIES, ''].join('\n');
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), original, 'utf-8');
    const result = ensureGitignoreEntries(tmpDir);
    expect(result.added).toEqual([]);
    const contents = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(contents).toBe(original);
  });

  it('ignores commented-out lines when checking presence', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '# .concert/index.sqlite\n', 'utf-8');
    const result = ensureGitignoreEntries(tmpDir);
    expect(result.added).toEqual([...CONCERT_GITIGNORE_ENTRIES]);
  });
});
