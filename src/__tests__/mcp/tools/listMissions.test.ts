import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { handler } from '../../../mcp/tools/listMissions.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-listmissions-tool-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('listMissions tool handler', () => {
  it('returns [] when no missions dir', async () => {
    const r = await handler({}, { cwd: tmpDir });
    expect(r).toEqual([]);
  });

  it('enumerates mission directories', async () => {
    fs.mkdirSync(path.join(tmpDir, '.concert', 'missions', 'a'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.concert', 'missions', 'b'), { recursive: true });
    const r = await handler({}, { cwd: tmpDir });
    const slugs = r.map((m) => m.slug).sort();
    expect(slugs).toEqual(['a', 'b']);
  });
});
