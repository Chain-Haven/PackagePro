const GITHUB_OWNER = 'Chain-Haven';
const GITHUB_REPO = 'PackagePro';

export type Platform = 'macos' | 'windows' | 'woocommerce';

const ASSET_PATTERNS: Record<Platform, RegExp> = {
  macos: /\.dmg$/i,
  windows: /\.(exe|msi)$/i,
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
        headers: { Accept: 'application/vnd.github+json' },
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

export async function getDownloadUrl(platform: Platform): Promise<string | null> {
  const release = await getLatestRelease();
  if (!release) return null;
  const asset = findAsset(release, platform);
  return asset?.browser_download_url ?? null;
}
