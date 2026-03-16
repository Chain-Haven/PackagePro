const GITHUB_OWNER = 'Chain-Haven';
const GITHUB_REPO = 'PackagePro';

export type Platform = 'macos' | 'windows' | 'woocommerce';

const ASSET_PATTERNS: Record<Platform, RegExp> = {
  macos: /\.dmg$/i,
  windows: /win.*\.zip$/i,
  woocommerce: /packagepro-fulfillment\.zip$/i,
};

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: ReleaseAsset[];
}

let cachedRelease: { data: GitHubRelease; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getLatestRelease(): Promise<GitHubRelease | null> {
  if (cachedRelease && Date.now() - cachedRelease.fetchedAt < CACHE_TTL_MS) {
    return cachedRelease.data;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'PackagePro-Web' },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GitHubRelease;
    cachedRelease = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    return null;
  }
}

export function findAsset(release: GitHubRelease, platform: Platform): ReleaseAsset | null {
  return release.assets.find((a) => ASSET_PATTERNS[platform].test(a.name)) ?? null;
}

/**
 * Resolves the final CDN download URL for a GitHub release asset.
 * GitHub's browser_download_url (github.com/…) 302-redirects to
 * objects.githubusercontent.com. We follow that redirect server-side
 * and return the CDN URL so the browser never sees github.com.
 */
export async function resolveDirectUrl(githubUrl: string): Promise<string> {
  try {
    const res = await fetch(githubUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'PackagePro-Web' },
    });
    if (res.ok && res.url && res.url !== githubUrl) {
      return res.url;
    }
  } catch {
    // fall through
  }
  return githubUrl;
}

export async function getDownloadUrl(platform: Platform): Promise<string | null> {
  const release = await getLatestRelease();
  if (!release) return null;
  const asset = findAsset(release, platform);
  if (!asset) return null;
  return resolveDirectUrl(asset.browser_download_url);
}
