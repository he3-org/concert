/**
 * Shared HTTP / config helpers for fetching optional Concert assets
 * (skills, rules, etc.) from the public assets repository.
 *
 * Both the source repo and the git ref can be overridden with the
 * CONCERT_ASSETS_REPO and CONCERT_ASSETS_REF environment variables — useful
 * for testing, pinning to a tag, or trying a fork.
 */

export const DEFAULT_ASSETS_REPO = 'he3-org/concert-assets';
export const DEFAULT_ASSETS_REF = 'HEAD';

export interface AssetsRepoConfig {
  repo: string;
  ref: string;
}

/** Minimal subset of the GitHub Contents API entry shape. */
export interface GhContentsEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  download_url: string | null;
}

export type Fetcher = (
  url: string
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export const defaultFetcher: Fetcher = async (url) => {
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

export function contentsApiUrl(cfg: AssetsRepoConfig, subpath: string): string {
  const cleanSub = subpath.replace(/^\/+|\/+$/g, '');
  const refQuery = cfg.ref ? `?ref=${encodeURIComponent(cfg.ref)}` : '';
  return `https://api.github.com/repos/${cfg.repo}/contents/${cleanSub}${refQuery}`;
}

export async function fetchJson<T>(url: string, fetcher: Fetcher): Promise<T> {
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

export async function fetchText(url: string, fetcher: Fetcher): Promise<string> {
  const res = await fetcher(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url} (HTTP ${res.status})`);
  }
  return res.text();
}
