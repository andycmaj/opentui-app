// Framework releases for the changelog, read from GitHub at build time.

import { Marked } from "marked";

// Release notes sit under each release's own h2, so their headings drop two
// levels ("## What's Changed" becomes an h4).
const marked = new Marked({
  walkTokens(token) {
    if (token.type === "heading") token.depth = Math.min(6, token.depth + 2);
  },
});

export interface Release {
  tag: string;
  name: string;
  date: string;
  url: string;
  html: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  html_url: string;
  body: string | null;
  draft: boolean;
}

const REPO = "andycmaj/opentui-app";

export async function fetchReleases(): Promise<Release[]> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases?per_page=50`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!res.ok) {
    const message = `GitHub releases request failed: ${res.status} ${res.statusText}`;
    // A broken changelog shouldn't block local work, but CI must not ship one.
    if (process.env.CI) throw new Error(message);
    console.warn(message);
    return [];
  }
  const releases: GitHubRelease[] = await res.json();
  return Promise.all(
    releases
      .filter((r) => !r.draft)
      .map(async (r) => ({
        tag: r.tag_name,
        name: r.name || r.tag_name,
        date: (r.published_at ?? "").slice(0, 10),
        url: r.html_url,
        // Bodies are written by the repo's maintainers in the release workflow.
        html: await marked.parse(r.body ?? ""),
      })),
  );
}
