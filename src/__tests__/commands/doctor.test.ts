import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runDoctor } from '../../commands/doctor.js';

let tmpDir: string;
let stdoutBuf: string[];
let restore: () => void;

function captureStdout(): void {
  stdoutBuf = [];
  const origStdout = process.stdout.write.bind(process.stdout);
  process.stdout.write = (data: string | Uint8Array) => {
    stdoutBuf.push(typeof data === 'string' ? data : data.toString());
    return true;
  };
  restore = () => {
    process.stdout.write = origStdout;
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-doctor-test-'));
  captureStdout();
});

afterEach(() => {
  restore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(rel: string, content: string): void {
  const full = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

describe('runDoctor', () => {
  it('returns 0 and prints helpful message when no Concert paths exist', async () => {
    const code = await runDoctor(tmpDir);
    expect(code).toBe(0);
    const out = stdoutBuf.join('');
    expect(out).toContain('No Concert-managed paths');
  });

  it('returns 0 and reports totals when all files are within targets', async () => {
    writeFile('.github/agents/concert-tiny.agent.md', 'a small agent\n');
    writeFile('.claude/commands/concert-tiny.md', 'a small command\n');
    const code = await runDoctor(tmpDir);
    expect(code).toBe(0);
    const out = stdoutBuf.join('');
    expect(out).toContain('Agents');
    expect(out).toContain('Claude commands');
    expect(out).toContain('within size targets');
    expect(out).toContain('concert-tiny.agent.md');
  });

  it('returns 1 and flags files that exceed the line target', async () => {
    // Skill target is 150 lines — emit 200 lines.
    const big = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
    writeFile('.github/skills/big-skill/SKILL.md', big);
    const code = await runDoctor(tmpDir);
    expect(code).toBe(1);
    const out = stdoutBuf.join('');
    expect(out).toContain('Skills');
    expect(out).toContain('big-skill');
    expect(out).toContain('exceed a target');
  });

  it('flags files that exceed the KB target', async () => {
    // Skills cap at 6 KB — emit ~10 KB of single-line content.
    const big = 'x'.repeat(10 * 1024) + '\n';
    writeFile('.github/skills/fat-skill/SKILL.md', big);
    const code = await runDoctor(tmpDir);
    expect(code).toBe(1);
    const out = stdoutBuf.join('');
    expect(out).toContain('fat-skill');
  });

  it('measures repo instruction files when they exist', async () => {
    writeFile('AGENTS.md', '# tiny agents file\n');
    writeFile('.github/copilot-instructions.md', '# tiny copilot instructions\n');
    const code = await runDoctor(tmpDir);
    expect(code).toBe(0);
    const out = stdoutBuf.join('');
    expect(out).toContain('AGENTS.md');
    expect(out).toContain('copilot-instructions.md');
  });

  it('skips categories that have no files', async () => {
    writeFile('AGENTS.md', '# only this\n');
    const code = await runDoctor(tmpDir);
    expect(code).toBe(0);
    const out = stdoutBuf.join('');
    expect(out).not.toContain('Agents\n');
    expect(out).not.toContain('Skills');
  });
});
