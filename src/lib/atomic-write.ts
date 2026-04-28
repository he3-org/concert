import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

export function atomicWriteFile(filePath: string, data: string): void {
  const tmpSuffix = `${process.pid}.${crypto.randomBytes(4).toString('hex')}`;
  const tmpPath = `${filePath}.tmp.${tmpSuffix}`;

  try {
    fs.writeFileSync(tmpPath, data, { encoding: 'utf-8', flag: 'wx' });
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // Best effort
    }
    throw err;
  }
}
