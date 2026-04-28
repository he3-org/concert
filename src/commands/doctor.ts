import * as fs from 'node:fs';
import * as path from 'node:path';

interface ScanTarget {
  /** Directory or single file path, relative to cwd. */
  pathSpec: string;
  /** Either 'file' (pathSpec is a single file) or 'dir' (scan files in it). */
  kind: 'file' | 'dir';
  /** Filename pattern (only for 'dir'). */
  pattern?: RegExp;
  /** Whether to scan subdirectories recursively (only for 'dir'). */
  recursive?: boolean;
  /** Friendly label for the report. */
  label: string;
  /** Soft target: file is flagged if it exceeds either limit. */
  maxLines: number;
  maxKb: number;
}

interface FileReport {
  path: string;
  lines: number;
  bytes: number;
  estTokens: number;
  overLines: boolean;
  overKb: boolean;
  maxLines: number;
  maxKb: number;
}

interface CategoryReport {
  label: string;
  files: FileReport[];
  totalLines: number;
  totalBytes: number;
  totalEstTokens: number;
}

const TOKEN_CHAR_RATIO = 4;

/**
 * Targets per `docs/TOKEN-OPTIMIZATION.md`:
 *   - Agents ≤ 250 lines / 12 KB
 *   - Skills ≤ 150 lines / 6 KB
 *   - Repo-instruction files ≤ 100 lines (12 KB cap is generous)
 *
 * `concert doctor` measures only — it does not modify any file and does
 * not call any model. It is safe to run any time.
 */
const SCAN_TARGETS: ScanTarget[] = [
  {
    pathSpec: '.github/agents',
    kind: 'dir',
    pattern: /\.agent\.md$/,
    label: 'Agents',
    maxLines: 250,
    maxKb: 12,
  },
  {
    pathSpec: '.github/skills',
    kind: 'dir',
    pattern: /^SKILL\.md$/,
    recursive: true,
    label: 'Skills',
    maxLines: 150,
    maxKb: 6,
  },
  {
    pathSpec: '.claude/commands',
    kind: 'dir',
    pattern: /\.md$/,
    label: 'Claude commands',
    maxLines: 100,
    maxKb: 6,
  },
  {
    pathSpec: '.claude/rules',
    kind: 'dir',
    pattern: /\.md$/,
    label: 'Claude rules',
    maxLines: 150,
    maxKb: 6,
  },
  {
    pathSpec: 'AGENTS.md',
    kind: 'file',
    label: 'Instruction file: AGENTS.md',
    maxLines: 100,
    maxKb: 12,
  },
  {
    pathSpec: 'CLAUDE.md',
    kind: 'file',
    label: 'Instruction file: CLAUDE.md',
    maxLines: 100,
    maxKb: 12,
  },
  {
    pathSpec: '.github/copilot-instructions.md',
    kind: 'file',
    label: 'Instruction file: copilot-instructions.md',
    maxLines: 100,
    maxKb: 12,
  },
];

function listFilesIn(dir: string, pattern: RegExp, recursive: boolean): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) out.push(...listFilesIn(full, pattern, true));
      continue;
    }
    if (entry.isFile() && pattern.test(entry.name)) out.push(full);
  }
  return out;
}

function measureFile(absPath: string, cwd: string, target: ScanTarget): FileReport {
  const content = fs.readFileSync(absPath, 'utf-8');
  const bytes = Buffer.byteLength(content, 'utf-8');
  const lines = content.split('\n').length;
  const estTokens = Math.ceil(content.length / TOKEN_CHAR_RATIO);
  const kb = bytes / 1024;
  return {
    path: path.relative(cwd, absPath),
    lines,
    bytes,
    estTokens,
    overLines: lines > target.maxLines,
    overKb: kb > target.maxKb,
    maxLines: target.maxLines,
    maxKb: target.maxKb,
  };
}

function scanCategory(cwd: string, target: ScanTarget): CategoryReport | null {
  const absSpec = path.join(cwd, target.pathSpec);
  let files: string[];
  if (target.kind === 'file') {
    if (!fs.existsSync(absSpec) || !fs.statSync(absSpec).isFile()) return null;
    files = [absSpec];
  } else {
    files = listFilesIn(absSpec, target.pattern!, target.recursive ?? false);
    if (files.length === 0) return null;
  }
  const reports = files.map((f) => measureFile(f, cwd, target));
  reports.sort((a, b) => b.estTokens - a.estTokens);
  const totalLines = reports.reduce((s, r) => s + r.lines, 0);
  const totalBytes = reports.reduce((s, r) => s + r.bytes, 0);
  const totalEstTokens = reports.reduce((s, r) => s + r.estTokens, 0);
  return {
    label: target.label,
    files: reports,
    totalLines,
    totalBytes,
    totalEstTokens,
  };
}

function formatKb(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

function padNum(value: number, width: number): string {
  const s = value.toLocaleString('en-US');
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

function renderReport(reports: CategoryReport[]): string {
  let out = '';
  let grandTokens = 0;
  let grandBytes = 0;
  let overCount = 0;

  for (const cat of reports) {
    out += `\n${cat.label}\n`;
    out += `  ${pad('file', 50)} ${pad('lines', 7)} ${pad('KB', 7)} ${pad('~tokens', 9)} flag\n`;
    for (const f of cat.files) {
      const flag = [f.overLines ? 'L' : '', f.overKb ? 'K' : ''].filter(Boolean).join('+') || '';
      if (flag) overCount += 1;
      out += `  ${pad(f.path, 50)} ${padNum(f.lines, 7)} ${pad(formatKb(f.bytes), 7)} ${padNum(
        f.estTokens,
        9
      )} ${flag}\n`;
    }
    out += `  ${pad('TOTAL', 50)} ${padNum(cat.totalLines, 7)} ${pad(
      formatKb(cat.totalBytes),
      7
    )} ${padNum(cat.totalEstTokens, 9)}\n`;
    out += `  Targets: <= ${cat.files[0]?.maxLines ?? '-'} lines, <= ${
      cat.files[0]?.maxKb ?? '-'
    } KB per file. L = over-lines, K = over-KB.\n`;
    grandTokens += cat.totalEstTokens;
    grandBytes += cat.totalBytes;
  }

  out += `\nSummary\n`;
  out += `  Categories scanned:    ${reports.length}\n`;
  out += `  Files over a target:   ${overCount}\n`;
  out += `  Total bytes:           ${formatKb(grandBytes)} KB\n`;
  out += `  Total estimated tokens: ${grandTokens.toLocaleString('en-US')} (~${TOKEN_CHAR_RATIO} chars/token)\n`;

  if (overCount === 0) {
    out += `\n  All scanned files are within size targets.\n`;
  } else {
    out += `\n  ${overCount} file(s) exceed a target. See docs/TOKEN-OPTIMIZATION.md for guidance.\n`;
  }
  return out;
}

/**
 * `concert doctor` — walk Concert-managed paths and report lines / KB /
 * estimated tokens / over-target files. Read-only; never writes.
 *
 * Returns process exit code: 0 if everything is within targets, 1 if any
 * file exceeds its target. (Non-zero is intentional so CI can use it as
 * a guardrail; pipe to `| cat` to ignore.)
 */
export async function runDoctor(cwd: string): Promise<number> {
  const reports: CategoryReport[] = [];
  for (const target of SCAN_TARGETS) {
    const r = scanCategory(cwd, target);
    if (r) reports.push(r);
  }

  if (reports.length === 0) {
    process.stdout.write(`No Concert-managed paths found under ${cwd}.\n`);
    process.stdout.write(`Run "concert init" first, or change to a Concert-enabled repository.\n`);
    // Still surface cache state — useful when debugging from outside a mission.
    await printCacheInfo(cwd);
    return 0;
  }

  const output = renderReport(reports);
  process.stdout.write(output);

  // Cache section
  await printCacheInfo(cwd);

  const anyOver = reports.some((c) => c.files.some((f) => f.overLines || f.overKb));
  return anyOver ? 1 : 0;
}

async function printCacheInfo(cwd: string): Promise<void> {
  const { openCache } = await import('../cache/index.js');
  const { getCacheStats } = await import('../cache/stats.js');
  const path = await import('node:path');
  const fs = await import('node:fs');

  const dbPath = path.default.join(cwd, '.concert', 'index.sqlite');
  let status: string;
  let schema: string;
  let builtAt: string;

  const handle = await openCache(cwd);
  if (!handle) {
    if (process.env.CONCERT_CACHE_DISABLED === '1') {
      status = 'disabled (CONCERT_CACHE_DISABLED=1)';
    } else {
      status = 'sdk-not-installed';
    }
    schema = '—';
    builtAt = '—';
  } else {
    try {
      status = fs.default.existsSync(dbPath) ? 'present' : 'missing';
      const db = handle.db as {
        prepare(sql: string): {
          get(...args: unknown[]): unknown;
        };
      };
      const schemaRow = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
        | { value: string }
        | undefined;
      const builtRow = db.prepare('SELECT value FROM meta WHERE key = ?').get('built_at') as
        | { value: string }
        | undefined;
      schema = schemaRow ? `v${schemaRow.value}` : '—';
      builtAt = builtRow?.value || '—';
    } finally {
      handle.close();
    }
  }

  const stats = getCacheStats();
  const total = stats.hits + stats.misses;
  const hitsDisplay = total > 0 ? `${stats.hits}/${stats.misses}` : '—';

  let tasksCount = '—';
  if (handle) {
    const tasksHandle = await openCache(cwd);
    if (tasksHandle) {
      try {
        const db = tasksHandle.db as {
          prepare(sql: string): {
            get(...args: unknown[]): unknown;
          };
        };
        const countRow = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as
          | { count: number }
          | undefined;
        tasksCount = countRow ? countRow.count.toString() : '—';
      } finally {
        tasksHandle.close();
      }
    }
  }

  console.log('\nCache:');
  console.log(`  Path:        ${dbPath}`);
  console.log(`  Status:      ${status}`);
  console.log(`  Schema:      ${schema}`);
  console.log(`  Last build:  ${builtAt}`);
  console.log(`  Hits/Miss:   ${hitsDisplay} (this process)`);
  console.log(`  Tasks:       ${tasksCount}`);

  // Mutation events section
  if (handle) {
    const eventsHandle = await openCache(cwd);
    if (eventsHandle) {
      try {
        const db = eventsHandle.db as {
          prepare(sql: string): {
            get(...args: unknown[]): unknown;
          };
        };
        const countRow = db.prepare('SELECT COUNT(*) as count FROM events').get() as
          | { count: number }
          | undefined;
        const lastRow = db.prepare('SELECT ts FROM events ORDER BY id DESC LIMIT 1').get() as
          | { ts: string }
          | undefined;
        const count = countRow?.count ?? 0;
        const last = lastRow?.ts ?? '—';
        console.log('\nMutation events:');
        console.log(`  Total:   ${count}`);
        console.log(`  Last:    ${last}`);
      } finally {
        eventsHandle.close();
      }
    }
  } else {
    console.log('\nMutation events:');
    console.log(`  Total:   ${status === 'sdk-not-installed' ? 'sdk-not-installed' : '—'}`);
    console.log(`  Last:    —`);
  }
}
