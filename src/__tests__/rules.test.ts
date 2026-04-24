import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  fetchRuleContent,
  listAvailableRules,
  parseRuleDescription,
  searchRules,
  writeRuleToTarget,
} from '../lib/rules.js';
import type { Fetcher } from '../lib/assets.js';

interface MockFile {
  type: 'file';
  content: string;
}
interface MockDir {
  type: 'dir';
  children: Record<string, MockNode>;
}
type MockNode = MockFile | MockDir;

function makeFetcher(repoRoot: MockDir): Fetcher {
  return async (url) => {
    const rawMatch = url.match(/^https:\/\/example\.invalid\/raw\/(.*)$/);
    if (rawMatch) {
      const node = resolve(repoRoot, rawMatch[1]);
      if (!node || node.type !== 'file') return notFound();
      return ok(node.content);
    }
    const apiMatch = url.match(
      /^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\/([^?]+)/
    );
    if (apiMatch) {
      const subpath = decodeURIComponent(apiMatch[1]);
      const node = resolve(repoRoot, subpath);
      if (!node) return notFound();
      if (node.type === 'dir') {
        const entries = Object.entries(node.children).map(([name, child]: [string, MockNode]) => ({
          type: child.type,
          name,
          path: `${subpath}/${name}`,
          download_url:
            child.type === 'file' ? `https://example.invalid/raw/${subpath}/${name}` : null,
        }));
        return ok(JSON.stringify(entries));
      }
      return ok(
        JSON.stringify({
          type: 'file',
          name: subpath.split('/').pop(),
          path: subpath,
          download_url: `https://example.invalid/raw/${subpath}`,
        })
      );
    }
    return notFound();
  };
}

function resolve(root: MockDir, subpath: string): MockNode | null {
  const parts = subpath.split('/').filter(Boolean);
  let node: MockNode = root;
  for (const part of parts) {
    if (node.type !== 'dir') return null;
    const child: MockNode | undefined = node.children[part];
    if (!child) return null;
    node = child;
  }
  return node;
}

function ok(text: string) {
  return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(text) });
}
function notFound() {
  return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
}

const REPO_FIXTURE: MockDir = {
  type: 'dir',
  children: {
    '.claude': {
      type: 'dir',
      children: {
        rules: {
          type: 'dir',
          children: {
            'conventional-commits.md': {
              type: 'file',
              content:
                '## Commits and PRs\n\n### Commit Messages\n\nUse Conventional Commits format.',
            },
            'pr-descriptions.md': {
              type: 'file',
              content: '# PR descriptions\n\nKeep them short and useful.',
            },
            // Should be ignored — non-md files are not rules.
            'README.txt': { type: 'file', content: 'ignore me' },
          },
        },
      },
    },
  },
};

const CFG = { repo: 'mock/repo', ref: 'main' };

describe('parseRuleDescription', () => {
  it('returns the first non-empty line stripped of heading markers', () => {
    expect(parseRuleDescription('# Heading\n\nbody')).toBe('Heading');
    expect(parseRuleDescription('\n\n## Sub heading\n')).toBe('Sub heading');
    expect(parseRuleDescription('Plain first line.\nmore')).toBe('Plain first line.');
  });

  it('strips surrounding emphasis markers', () => {
    expect(parseRuleDescription('**bold**')).toBe('bold');
    expect(parseRuleDescription('`code`')).toBe('code');
  });

  it('returns empty string for empty content', () => {
    expect(parseRuleDescription('')).toBe('');
    expect(parseRuleDescription('\n\n  \n')).toBe('');
  });
});

describe('searchRules', () => {
  const rules = [
    { name: 'conventional-commits', description: 'Use the Conventional Commits format.' },
    { name: 'pr-descriptions', description: 'Keep PRs concise.' },
    { name: 'naming', description: 'How to name things.' },
  ];

  it('matches by name', () => {
    expect(searchRules(rules, 'pr').map((r) => r.name)).toEqual(['pr-descriptions']);
  });

  it('matches by description', () => {
    expect(searchRules(rules, 'concise').map((r) => r.name)).toEqual(['pr-descriptions']);
  });

  it('is case-insensitive', () => {
    expect(searchRules(rules, 'NAME').map((r) => r.name)).toEqual(['naming']);
  });

  it('returns all when term is empty', () => {
    expect(searchRules(rules, '   ').length).toBe(3);
  });
});

describe('listAvailableRules', () => {
  it('lists .md files only, sorted by name, with parsed descriptions', async () => {
    const fetcher = makeFetcher(REPO_FIXTURE);
    const rules = await listAvailableRules(CFG, fetcher);
    expect(rules.map((r) => r.name)).toEqual(['conventional-commits', 'pr-descriptions']);
    expect(rules[0].description).toBe('Commits and PRs');
    expect(rules[1].description).toBe('PR descriptions');
  });

  it('throws on 404', async () => {
    const empty: MockDir = { type: 'dir', children: {} };
    const fetcher = makeFetcher(empty);
    await expect(listAvailableRules(CFG, fetcher)).rejects.toThrow(/Not found/);
  });
});

describe('fetchRuleContent', () => {
  it('fetches a rule by bare name', async () => {
    const fetcher = makeFetcher(REPO_FIXTURE);
    const content = await fetchRuleContent('conventional-commits', CFG, fetcher);
    expect(content).toContain('Conventional Commits');
  });

  it('tolerates a trailing .md', async () => {
    const fetcher = makeFetcher(REPO_FIXTURE);
    const content = await fetchRuleContent('conventional-commits.md', CFG, fetcher);
    expect(content).toContain('Conventional Commits');
  });

  it('rejects path traversal in the rule name', async () => {
    const fetcher = makeFetcher(REPO_FIXTURE);
    await expect(fetchRuleContent('../etc/passwd', CFG, fetcher)).rejects.toThrow(
      /Invalid rule name/
    );
    await expect(fetchRuleContent('foo/bar', CFG, fetcher)).rejects.toThrow(/Invalid rule name/);
    await expect(fetchRuleContent('.hidden', CFG, fetcher)).rejects.toThrow(/Invalid rule name/);
  });

  it('rejects an empty name', async () => {
    const fetcher = makeFetcher(REPO_FIXTURE);
    await expect(fetchRuleContent('.md', CFG, fetcher)).rejects.toThrow(/empty/);
  });

  it('throws when the rule is missing', async () => {
    const fetcher = makeFetcher(REPO_FIXTURE);
    await expect(fetchRuleContent('nope', CFG, fetcher)).rejects.toThrow();
  });
});

describe('writeRuleToTarget', () => {
  it('writes a flat .md file into .claude/rules/ and reports overwrite state', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-rules-test-'));
    try {
      const first = writeRuleToTarget(tmp, 'demo', '# v1');
      expect(first.overwritten).toBe(false);
      expect(first.file).toBe(path.join('.claude/rules/demo.md'));
      expect(fs.readFileSync(path.join(tmp, '.claude/rules/demo.md'), 'utf-8')).toBe('# v1');

      const second = writeRuleToTarget(tmp, 'demo.md', '# v2');
      expect(second.overwritten).toBe(true);
      expect(second.rule).toBe('demo');
      expect(fs.readFileSync(path.join(tmp, '.claude/rules/demo.md'), 'utf-8')).toBe('# v2');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects path traversal in the rule name', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-rules-test-'));
    try {
      expect(() => writeRuleToTarget(tmp, '../escape', 'x')).toThrow(/Invalid rule name/);
      expect(() => writeRuleToTarget(tmp, 'foo/bar', 'x')).toThrow(/Invalid rule name/);
      expect(() => writeRuleToTarget(tmp, '.hidden', 'x')).toThrow(/Invalid rule name/);
      expect(() => writeRuleToTarget(tmp, '.md', 'x')).toThrow(/empty/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
