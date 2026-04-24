import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  contentsApiUrl,
  defaultFetcher,
  fetchJson,
  fetchText,
  getAssetsRepoConfig,
  type AssetsRepoConfig,
  type Fetcher,
  type GhContentsEntry,
} from './assets.js';

/**
 * Rules live under `.claude/rules/` in the assets repo as flat `.md` files.
 * Each file is a single rule that Claude Code can be pointed at.
 */
export const RULES_PATH = '.claude/rules';

export interface RuleSummary {
  /** Rule identifier — the basename without the `.md` extension. */
  name: string;
  /** First non-empty content line of the rule body, or empty if not parseable. */
  description: string;
}

export interface CopyRuleResult {
  rule: string;
  /** Path written, relative to target dir (e.g. ".claude/rules/foo.md"). */
  file: string;
  /** Whether the file was overwritten (already existed locally). */
  overwritten: boolean;
}

/**
 * Extract a one-line summary from a rule's markdown body. We pick the first
 * non-empty line, stripping leading markdown heading markers and any inline
 * formatting markers, so the listing reads cleanly.
 */
export function parseRuleDescription(ruleMd: string): string {
  for (const raw of ruleMd.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Strip leading heading markers and surrounding markdown emphasis.
    const cleaned = line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[*_`]+|[*_`]+$/g, '')
      .trim();
    if (cleaned) return cleaned;
  }
  return '';
}

/**
 * List the available rules in the configured assets repo.
 * Returns one entry per `.md` file, with a short description parsed from
 * the file body.
 */
export async function listAvailableRules(
  cfg: AssetsRepoConfig = getAssetsRepoConfig(),
  fetcher: Fetcher = defaultFetcher
): Promise<RuleSummary[]> {
  const url = contentsApiUrl(cfg, RULES_PATH);
  const entries = await fetchJson<GhContentsEntry[]>(url, fetcher);
  if (!Array.isArray(entries)) {
    throw new Error(`Unexpected response listing rules at ${url}`);
  }
  const rules: RuleSummary[] = [];
  for (const entry of entries) {
    if (entry.type !== 'file') continue;
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    if (!entry.download_url) continue;
    const name = entry.name.replace(/\.md$/i, '');
    let description = '';
    try {
      const body = await fetchText(entry.download_url, fetcher);
      description = parseRuleDescription(body);
    } catch {
      // A rule that can't be downloaded is still listed, just with no description.
    }
    rules.push({ name, description });
  }
  rules.sort((a, b) => a.name.localeCompare(b.name));
  return rules;
}

/**
 * Filter a list of rules by a case-insensitive substring match on either the
 * name or the description.
 */
export function searchRules(rules: RuleSummary[], term: string): RuleSummary[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return rules;
  return rules.filter(
    (r) => r.name.toLowerCase().includes(needle) || r.description.toLowerCase().includes(needle)
  );
}

/**
 * Download a single rule by name (without `.md` suffix). Returns the raw
 * markdown content. The lookup tolerates the user passing the name with or
 * without the trailing extension.
 */
export async function fetchRuleContent(
  ruleName: string,
  cfg: AssetsRepoConfig = getAssetsRepoConfig(),
  fetcher: Fetcher = defaultFetcher
): Promise<string> {
  const bare = ruleName.replace(/\.md$/i, '');
  if (!bare) {
    throw new Error('Rule name is empty');
  }
  if (bare.includes('/') || bare.includes('\\') || bare.startsWith('.')) {
    throw new Error(`Invalid rule name "${ruleName}"`);
  }
  const url = contentsApiUrl(cfg, `${RULES_PATH}/${bare}.md`);
  const entry = await fetchJson<GhContentsEntry>(url, fetcher);
  if (entry.type !== 'file' || !entry.download_url) {
    throw new Error(`Rule "${bare}" not found in ${cfg.repo}`);
  }
  return fetchText(entry.download_url, fetcher);
}

/**
 * Write a rule to `<targetDir>/.claude/rules/<name>.md`.
 * Returns the relative path written and whether an existing file was overwritten.
 */
export function writeRuleToTarget(
  targetDir: string,
  ruleName: string,
  content: string
): CopyRuleResult {
  const bare = ruleName.replace(/\.md$/i, '');
  if (!bare) {
    throw new Error('Rule name is empty');
  }
  if (bare.includes('/') || bare.includes('\\') || bare.startsWith('.')) {
    throw new Error(`Invalid rule name "${ruleName}"`);
  }
  const rulesDir = path.join(targetDir, RULES_PATH);
  fs.mkdirSync(rulesDir, { recursive: true });
  const destFile = path.join(rulesDir, `${bare}.md`);
  const overwritten = fs.existsSync(destFile);
  fs.writeFileSync(destFile, content);
  return { rule: bare, file: path.join(RULES_PATH, `${bare}.md`), overwritten };
}
