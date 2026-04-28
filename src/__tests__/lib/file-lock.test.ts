import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { withMissionLock } from '../../lib/file-lock.js';

describe('withMissionLock', () => {
  it('acquires and releases lock', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-test-'));
    try {
      const result = await withMissionLock(tmpDir, async () => 'success');
      expect(result).toBe('success');
      const lockFile = path.join(tmpDir, '.lock');
      expect(fs.existsSync(lockFile)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('throws on lock timeout', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-test-'));
    try {
      const lockFile = path.join(tmpDir, '.lock');
      fs.writeFileSync(lockFile, '', { flag: 'wx' });
      await expect(withMissionLock(tmpDir, async () => 'fail')).rejects.toThrow(/lock busy/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('breaks stale lock', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-test-'));
    try {
      const lockFile = path.join(tmpDir, '.lock');
      fs.writeFileSync(lockFile, '', { flag: 'wx' });
      const oldTime = Date.now() - 35000;
      fs.utimesSync(lockFile, oldTime / 1000, oldTime / 1000);
      const result = await withMissionLock(tmpDir, async () => 'success');
      expect(result).toBe('success');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
