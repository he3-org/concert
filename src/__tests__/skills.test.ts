import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  getAssetsRepoConfig,
  parseSkillDescription,
  searchSkills,
  listAvailableSkills,
  fetchSkillFiles,
  writeSkillToTarget,
  type Fetcher,
} from '../lib/skills.js';

interface MockFile {
  type: 'file';
  content: string;
}
interface MockDir {
  type: 'dir';
  children: Record<string, MockNode>;
}
type MockNode = MockFile | MockDir;

function makeFetcher(repoRoot: MockDir): { fetcher: Fetcher; calls: string[] } {
  const calls: string[] = [];
  const fetcher: Fetcher = async (url) => {
    calls.push(url);

    // Raw download URL — we encode the repo path directly in the URL.
    const rawMatch = url.match(/^https:\/\/example\.invalid\/raw\/(.*)$/);
    if (rawMatch) {
      const node = resolve(repoRoot, rawMatch[1]);
      if (!node || node.type !== 'file') {
        return notFound();
      }
      return ok(node.content);
    }

    // GitHub Contents API.
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
  return { fetcher, calls };
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
    '.github': {
      type: 'dir',
      children: {
        skills: {
          type: 'dir',
          children: {
            'skill-authoring': {
              type: 'dir',
              children: {
                'SKILL.md': {
                  type: 'file',
                  content: `---\nname: skill-authoring\ndescription: >-\n  Guide for creating new GitHub Copilot agent skills.\n  Use this when asked to create a new skill.\n---\n\n# Body`,
                },
              },
            },
            'conventional-commits': {
              type: 'dir',
              children: {
                'SKILL.md': {
                  type: 'file',
                  content: `---\nname: conventional-commits\ndescription: Conventional commit message guidelines.\n---\n\n# Body`,
                },
                examples: {
                  type: 'dir',
                  children: {
                    'good.md': { type: 'file', content: 'feat: add thing' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const CFG = { repo: 'mock/repo', ref: 'main' };

describe('getAssetsRepoConfig', () => {
  it('returns defaults when no env vars are set', () => {
    const cfg = getAssetsRepoConfig({});
    expect(cfg.repo).toBe('he3-org/concert-assets');
    expect(cfg.ref).toBe('HEAD');
  });

  it('respects CONCERT_ASSETS_REPO and CONCERT_ASSETS_REF', () => {
    const cfg = getAssetsRepoConfig({
      CONCERT_ASSETS_REPO: 'my/fork',
      CONCERT_ASSETS_REF: 'v1.0.0',
    });
    expect(cfg).toEqual({ repo: 'my/fork', ref: 'v1.0.0' });
  });
});

describe('parseSkillDescription', () => {
  it('parses a folded multi-line description', () => {
    const md = `---\nname: foo\ndescription: >-\n  Line one.\n  Line two.\n---\n\nbody`;
    expect(parseSkillDescription(md)).toBe('Line one. Line two.');
  });

  it('parses an inline description', () => {
    const md = `---\nname: foo\ndescription: Inline value.\n---\nbody`;
    expect(parseSkillDescription(md)).toBe('Inline value.');
  });

  it('strips quotes from inline values', () => {
    const md = `---\nname: foo\ndescription: "Quoted."\n---`;
    expect(parseSkillDescription(md)).toBe('Quoted.');
  });

  it('returns empty string when no frontmatter', () => {
    expect(parseSkillDescription('# just a header')).toBe('');
  });

  it('returns empty string when description missing', () => {
    expect(parseSkillDescription(`---\nname: foo\n---\nbody`)).toBe('');
  });
});

describe('searchSkills', () => {
  const skills = [
    { name: 'react-best-practices', description: 'How to write good React.' },
    { name: 'database-migrations', description: 'Manage SQL migrations.' },
    { name: 'api-docs', description: 'Document REST APIs.' },
  ];

  it('matches by name', () => {
    expect(searchSkills(skills, 'react').map((s) => s.name)).toEqual(['react-best-practices']);
  });

  it('matches by description', () => {
    expect(searchSkills(skills, 'sql').map((s) => s.name)).toEqual(['database-migrations']);
  });

  it('is case-insensitive', () => {
    expect(searchSkills(skills, 'REST').map((s) => s.name)).toEqual(['api-docs']);
  });

  it('returns all when term is empty', () => {
    expect(searchSkills(skills, '   ').length).toBe(3);
  });
});

describe('listAvailableSkills', () => {
  it('lists skill directories with parsed descriptions, sorted by name', async () => {
    const { fetcher } = makeFetcher(REPO_FIXTURE);
    const skills = await listAvailableSkills(CFG, fetcher);
    expect(skills.map((s) => s.name)).toEqual(['conventional-commits', 'skill-authoring']);
    expect(skills[0].description).toBe('Conventional commit message guidelines.');
    expect(skills[1].description).toContain('Guide for creating new GitHub Copilot agent skills.');
  });

  it('throws a clear error on 404', async () => {
    const empty: MockDir = { type: 'dir', children: {} };
    const { fetcher } = makeFetcher(empty);
    await expect(listAvailableSkills(CFG, fetcher)).rejects.toThrow(/Not found/);
  });
});

describe('fetchSkillFiles', () => {
  it('downloads every file in the skill directory recursively', async () => {
    const { fetcher } = makeFetcher(REPO_FIXTURE);
    const files = await fetchSkillFiles('conventional-commits', CFG, fetcher);
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(['SKILL.md', 'examples/good.md']);
    const good = files.find((f) => f.path === 'examples/good.md');
    expect(good?.content).toBe('feat: add thing');
  });

  it('throws when the skill is missing', async () => {
    const { fetcher } = makeFetcher(REPO_FIXTURE);
    await expect(fetchSkillFiles('nope', CFG, fetcher)).rejects.toThrow();
  });
});

describe('writeSkillToTarget', () => {
  it('writes files into .github/skills/<name>/ and reports overwrite state', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-skills-test-'));
    try {
      const first = writeSkillToTarget(tmp, 'demo', [
        { path: 'SKILL.md', content: '# v1' },
        { path: 'sub/extra.txt', content: 'hello' },
      ]);
      expect(first.overwritten).toBe(false);
      expect(first.files).toEqual([
        path.join('.github/skills/demo/SKILL.md'),
        path.join('.github/skills/demo/sub/extra.txt'),
      ]);
      expect(fs.readFileSync(path.join(tmp, '.github/skills/demo/SKILL.md'), 'utf-8')).toBe('# v1');
      expect(fs.readFileSync(path.join(tmp, '.github/skills/demo/sub/extra.txt'), 'utf-8')).toBe(
        'hello'
      );

      const second = writeSkillToTarget(tmp, 'demo', [{ path: 'SKILL.md', content: '# v2' }]);
      expect(second.overwritten).toBe(true);
      expect(fs.readFileSync(path.join(tmp, '.github/skills/demo/SKILL.md'), 'utf-8')).toBe('# v2');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
