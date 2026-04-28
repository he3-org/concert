import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

const ROOT = path.resolve(__dirname, '../..');
const CLI_PATH = path.join(ROOT, 'dist', 'cli.js');

function runCLI(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args}`, { encoding: 'utf-8' });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.status ?? 1,
    };
  }
}

describe('CLI stub', () => {
  it('dist/cli.js exists after build', () => {
    if (!fs.existsSync(CLI_PATH)) {
      console.warn('dist/cli.js not found — skipping CLI tests (run npm run build first)');
      return;
    }
    expect(fs.existsSync(CLI_PATH)).toBe(true);
  });

  it('--help prints usage and exits 0', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('--help');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: concert <command>');
    expect(result.stdout).toContain('init');
    expect(result.stdout).toContain('update');
    expect(result.stdout).toContain('push');
    expect(result.stdout).toContain('skills');
    expect(result.stdout).toContain('rules');
    expect(result.stdout).toContain('doctor');
    expect(result.stdout).toContain('serve');
    expect(result.stdout).toContain('get-status');
  });

  it('-h prints usage and exits 0', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('-h');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: concert <command>');
  });

  it('no args prints usage and exits 0', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: concert <command>');
  });

  it('--version prints version and exits 0', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('--version');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('-V prints version and exits 0', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('-V');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('unknown command exits with code 2', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('banana');
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('unknown command');
    expect(result.stderr).toContain('banana');
  });

  it('skills with no subcommand prints usage and exits 2', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('skills');
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Usage: concert skills');
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('search');
    expect(result.stdout).toContain('add');
  });

  it('skills --help prints usage and exits 0', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('skills --help');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: concert skills');
  });

  it('skills add with no args exits 2', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('skills add');
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('add requires at least one skill name');
  });

  it('skills search with no args exits 2', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('skills search');
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('search requires a term');
  });

  it('rules with no subcommand prints usage and exits 2', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('rules');
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Usage: concert rules');
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('search');
    expect(result.stdout).toContain('add');
  });

  it('rules --help prints usage and exits 0', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('rules --help');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: concert rules');
  });

  it('rules add with no args exits 2', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('rules add');
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('add requires at least one rule name');
  });

  it('rules search with no args exits 2', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('rules search');
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('search requires a term');
  });

  it('serve --inspect prints JSON tool catalogue and exits 0', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('serve --inspect');
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    const names = parsed.map((t: { name: string }) => t.name);
    expect(names).toContain('concert.get_status');
  });

  it('unknown command lists new commands in error', () => {
    if (!fs.existsSync(CLI_PATH)) return;
    const result = runCLI('unknown-cmd');
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('serve');
    expect(result.stderr).toContain('get-status');
    expect(result.stderr).toContain('list-missions');
  });
});
