import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Default upstream repository for Concert skills.
 * Skills live under `.github/skills/<skill-name>/` in this repo.
 * Both can be overridden with the CONCERT_ASSETS_REPO and CONCERT_ASSETS_REF
 * environment variables (useful for testing or pinning to a fork).
 */
export const DEFAULT_ASSETS_REPO = 'he3-org/concert-assets';
export const DEFAULT_ASSETS_REF = 'HEAD';
export const SKILLS_PATH = '.github/skills';

export interface AssetsRepoConfig {
  repo: string;
  ref: string;
}

export interface SkillSummary {
  /** Skill directory name (matches the `name` frontmatter field). */
  name: string;
  /** First sentence/line of the SKILL.md description, or empty if not parseable. */
  description: string;
}

export interface SkillFile {
  /** Path relative to the skill's root directory (e.g. "SKILL.md"). */
  path: string;
  /** Raw file contents as a UTF-8 string. */
  content: string;
}

export interface CopySkillResult {
  skill: string;
  files: string[];
  /** Whether files were overwritten (i.e. the skill already existed locally). */
  overwritten: boolean;
}

/** Minimal subset of the GitHub Contents API entry shape. */
interface GhContentsEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  download_url: string | null;
}

export type Fetcher = (
  url: string
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

const defaultFetcher: Fetcher = async (url) => {
  // Use the global fetch (Node ≥ 18). We pass a UA to avoid GitHub's 403 for missing UA.
  const res = await fetch(url, {
    headers: {
      'user-agent': 'concert-cli',
      accept: 'application/vnd.github+json',
    },
  });
  return {
    ok: res.ok,
    status: res.status,
    text: () => res.text(),
  };
};

/**
 * Resolve the assets repo configuration from environment variables, falling
 * back to the public Concert assets repo on the default branch.
 */
export function getAssetsRepoConfig(env: NodeJS.ProcessEnv = process.env): AssetsRepoConfig {
  return {
    repo: env.CONCERT_ASSETS_REPO || DEFAULT_ASSETS_REPO,
    ref: env.CONCERT_ASSETS_REF || DEFAULT_ASSETS_REF,
  };
}

function contentsApiUrl(cfg: AssetsRepoConfig, subpath: string): string {
  const cleanSub = subpath.replace(/^\/+|\/+$/g, '');
  const refQuery = cfg.ref ? `?ref=${encodeURIComponent(cfg.ref)}` : '';
  return `https://api.github.com/repos/${cfg.repo}/contents/${cleanSub}${refQuery}`;
}

async function fetchJson<T>(url: string, fetcher: Fetcher): Promise<T> {
  const res = await fetcher(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Not found (HTTP 404): ${url}`);
    }
    if (res.status === 403) {
      throw new Error(
        `GitHub API rate-limited or forbidden (HTTP 403): ${url}\n` +
          `  This is typically the unauthenticated rate limit. Try again later.`
      );
    }
    throw new Error(`Request failed (HTTP ${res.status}): ${url}`);
  }
  const body = await res.text();
  return JSON.parse(body) as T;
}

async function fetchText(url: string, fetcher: Fetcher): Promise<string> {
  const res = await fetcher(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url} (HTTP ${res.status})`);
  }
  return res.text();
}

/**
 * Parse the YAML frontmatter from a SKILL.md file and return the description
 * as a single trimmed line. Returns empty string when no description is found.
 */
export function parseSkillDescription(skillMd: string): string {
  if (!skillMd.startsWith('---')) return '';
  const end = skillMd.indexOf('\n---', 3);
  if (end === -1) return '';
  const fm = skillMd.substring(3, end);
  const lines = fm.split(/\r?\n/);
  let inDescription = false;
  let descLines: string[] = [];
  for (const line of lines) {
    if (!inDescription) {
      const m = line.match(/^description\s*:\s*(.*)$/);
      if (m) {
        const rest = m[1].trim();
        if (rest === '>-' || rest === '>' || rest === '|' || rest === '|-') {
          inDescription = true;
          continue;
        }
        // Inline value — strip quotes.
        return rest.replace(/^['"]|['"]$/g, '').trim();
      }
    } else {
      // Continuation of a folded/literal block: indented lines belong to the value.
      if (/^\s+/.test(line)) {
        descLines.push(line.trim());
      } else {
        break;
      }
    }
  }
  return descLines.join(' ').trim();
}

/**
 * List the available skills in the configured assets repo.
 * Returns one entry per skill directory, with the description parsed from
 * the skill's SKILL.md frontmatter.
 */
export async function listAvailableSkills(
  cfg: AssetsRepoConfig = getAssetsRepoConfig(),
  fetcher: Fetcher = defaultFetcher
): Promise<SkillSummary[]> {
  const url = contentsApiUrl(cfg, SKILLS_PATH);
  const entries = await fetchJson<GhContentsEntry[]>(url, fetcher);
  if (!Array.isArray(entries)) {
    throw new Error(`Unexpected response listing skills at ${url}`);
  }
  const skills: SkillSummary[] = [];
  for (const entry of entries) {
    if (entry.type !== 'dir') continue;
    let description = '';
    try {
      const md = await fetchSkillFileText(cfg, entry.name, 'SKILL.md', fetcher);
      description = parseSkillDescription(md);
    } catch {
      // A skill without a readable SKILL.md is still listed, just with no description.
    }
    skills.push({ name: entry.name, description });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

/**
 * Filter a list of skills by a case-insensitive substring match on either the
 * name or the description.
 */
export function searchSkills(skills: SkillSummary[], term: string): SkillSummary[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return skills;
  return skills.filter(
    (s) => s.name.toLowerCase().includes(needle) || s.description.toLowerCase().includes(needle)
  );
}

async function fetchSkillFileText(
  cfg: AssetsRepoConfig,
  skillName: string,
  relativePath: string,
  fetcher: Fetcher
): Promise<string> {
  const url = contentsApiUrl(cfg, `${SKILLS_PATH}/${skillName}/${relativePath}`);
  const entry = await fetchJson<GhContentsEntry>(url, fetcher);
  if (entry.type !== 'file' || !entry.download_url) {
    throw new Error(`Expected file at ${url}, got ${entry.type}`);
  }
  return fetchText(entry.download_url, fetcher);
}

/**
 * Recursively download every file in a skill directory.
 */
export async function fetchSkillFiles(
  skillName: string,
  cfg: AssetsRepoConfig = getAssetsRepoConfig(),
  fetcher: Fetcher = defaultFetcher
): Promise<SkillFile[]> {
  const collected: SkillFile[] = [];
  await walk(`${SKILLS_PATH}/${skillName}`, '', cfg, fetcher, collected);
  if (collected.length === 0) {
    throw new Error(`Skill "${skillName}" not found in ${cfg.repo}`);
  }
  return collected;
}

async function walk(
  remoteDir: string,
  relativePrefix: string,
  cfg: AssetsRepoConfig,
  fetcher: Fetcher,
  out: SkillFile[]
): Promise<void> {
  const entries = await fetchJson<GhContentsEntry[]>(contentsApiUrl(cfg, remoteDir), fetcher);
  if (!Array.isArray(entries)) {
    throw new Error(`Expected directory listing at ${remoteDir}`);
  }
  for (const entry of entries) {
    const childRel = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
    if (entry.type === 'dir') {
      await walk(`${remoteDir}/${entry.name}`, childRel, cfg, fetcher, out);
    } else if (entry.type === 'file') {
      if (!entry.download_url) {
        throw new Error(`Missing download URL for ${entry.path}`);
      }
      const content = await fetchText(entry.download_url, fetcher);
      out.push({ path: childRel, content });
    }
    // symlinks/submodules are ignored.
  }
}

/**
 * Write the files of a fetched skill into `<targetDir>/.github/skills/<skill>/`.
 * Returns the list of file paths written (relative to targetDir) and whether
 * the destination already existed (so the caller can warn about overwriting).
 */
export function writeSkillToTarget(
  targetDir: string,
  skillName: string,
  files: SkillFile[]
): CopySkillResult {
  const skillRoot = path.join(targetDir, SKILLS_PATH, skillName);
  const overwritten = fs.existsSync(skillRoot);
  fs.mkdirSync(skillRoot, { recursive: true });
  const written: string[] = [];
  for (const file of files) {
    const destFile = path.join(skillRoot, file.path);
    const destDir = path.dirname(destFile);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.writeFileSync(destFile, file.content);
    written.push(path.join(SKILLS_PATH, skillName, file.path));
  }
  return { skill: skillName, files: written, overwritten };
}
