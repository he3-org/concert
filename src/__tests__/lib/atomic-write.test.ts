import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { atomicWriteFile } from '../../lib/atomic-write.js';

describe('atomicWriteFile', () => {
  it('writes and renames atomically', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-test-'));
    try {
      const filePath = path.join(tmpDir, 'test.txt');
      atomicWriteFile(filePath, 'hello world');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('cleans up temp file on failure', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-test-'));
    try {
      const filePath = path.join(tmpDir, 'readonly', 'test.txt');
      expect(() => atomicWriteFile(filePath, 'data')).toThrow();
      const tmpFiles = fs.readdirSync(tmpDir).filter((f) => f.includes('.tmp.'));
      expect(tmpFiles.length).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
