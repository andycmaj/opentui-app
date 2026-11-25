// Clones each app in demos.json next to this repo, at its latest GitHub
// release, and installs its dependencies, so record-all and extract-keymaps
// find it where they look. The site then shows what `mise use` installs.
//
//   bun run scripts/checkout-apps.ts                 # latest release of each
//   bun run scripts/checkout-apps.ts --ref main      # a branch/tag for all
//
// Used by CI on a fresh runner. An app that can't be checked out is a
// warning: its committed cast and keymap JSON stay on the site.

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { $ } from "bun";
import { warn } from "./warn";

interface Demo {
  id: string;
  repo: string;
}

const SITE = resolve(import.meta.dir, "..");
const MONOREPO = resolve(SITE, "../..");

const { values } = parseArgs({
  options: { ref: { type: "string" } },
});

async function latestRelease(repo: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/releases/latest`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!res.ok) throw new Error(`${repo}: latest release: HTTP ${res.status}`);
  const { tag_name }: { tag_name: string } = await res.json();
  return tag_name;
}

const { demos }: { demos: Demo[] } = await Bun.file(
  join(SITE, "demos.json"),
).json();
const repos = [
  ...new Set(
    demos.map((d) => d.repo).filter((r) => r !== "andycmaj/opentui-app"),
  ),
];

for (const repo of repos) {
  const name = repo.split("/")[1] ?? repo;
  const dir = resolve(MONOREPO, "..", name);
  try {
    if (existsSync(dir)) {
      throw new Error(`${dir} already exists; not overwriting a checkout`);
    }
    const ref = values.ref ?? (await latestRelease(repo));
    await $`git clone --quiet --depth 1 --branch ${ref} https://github.com/${repo}.git ${dir}`;
    await $`bun install --frozen-lockfile`.cwd(dir);
    console.log(`[${name}] ${ref} -> ${dir}`);
  } catch (err) {
    warn(`checkout ${name}`, String(err));
  }
}
