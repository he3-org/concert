import * as fs from 'node:fs';
import * as path from 'node:path';

const LOCK_RETRY_MS = 25;
const LOCK_MAX_WAIT_MS = 100;
const STALE_LOCK_MS = 30000;

export async function withMissionLock<T>(missionPath: string, fn: () => Promise<T>): Promise<T> {
  const lockFile = path.join(missionPath, '.lock');
  let fd: number | null = null;

  const tryAcquire = (): boolean => {
    try {
      fd = fs.openSync(lockFile, 'wx');
      return true;
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'EEXIST') {
        try {
          const stat = fs.statSync(lockFile);
          if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) {
            fs.unlinkSync(lockFile);
            return false;
          }
        } catch {
          // Lock file disappeared, retry
        }
      }
      return false;
    }
  };

  const startTime = Date.now();
  while (!tryAcquire()) {
    if (Date.now() - startTime > LOCK_MAX_WAIT_MS) {
      throw new Error(`lock busy: ${lockFile}`);
    }
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
  }

  try {
    return await fn();
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best effort
      }
    }
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // Best effort
    }
  }
}
