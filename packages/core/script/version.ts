#!/usr/bin/env bun

// Release prep for @andycmaj/opentui-app: bump package.json, commit, tag, push,
// and create a draft GitHub release with auto-generated notes. The release
// workflow then runs `bun publish` from the tag and un-drafts the release.
//
// Inputs (env, set from workflow_dispatch):
//   OPENTUI_APP_BUMP     - "major" | "minor" | "patch" (default "patch")
//   OPENTUI_APP_VERSION  - explicit version override (wins over bump)
//
// Tags are plain vX.Y.Z: the library is the only thing released from this repo.
import path from "path";
import { $ } from "bun";
import { appendFile } from "fs/promises";
import { fileURLToPath } from "url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(dir);

type Bump = "major" | "minor" | "patch";

function bumpVersion(current: string, bump: Bump): string {
  const [major, minor, patch] = current
    .replace(/^v/, "")
    .split("-")[0]
    .split(".")
    .map((n) => Number.parseInt(n, 10));

  if ([major, minor, patch].some((n) => Number.isNaN(n))) {
    throw new Error(`Cannot parse semver from "${current}"`);
  }

  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

const pkgPath = path.join(dir, "package.json");
const pkg = await Bun.file(pkgPath).json();

const override = process.env.OPENTUI_APP_VERSION?.trim();
const bump = (process.env.OPENTUI_APP_BUMP?.trim() || "patch") as Bump;

const version = override
  ? override.replace(/^v/, "")
  : bumpVersion(pkg.version, bump);
const tag = `v${version}`;

console.log(`Releasing ${pkg.name} ${pkg.version} -> ${version} (tag ${tag})`);

// An override equal to the current version (e.g. the very first publish) has
// nothing to commit; tag the current HEAD as-is.
if (version !== pkg.version) {
  pkg.version = version;
  await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  await $`git add package.json`;
  await $`git commit -m ${`chore: release ${tag}`}`;
}

await $`git tag ${tag}`;
await $`git push origin HEAD --tags`;

const sha = (await $`git rev-parse HEAD`.text()).trim();

await $`gh release create ${tag} -d --target ${sha} --title ${tag} --generate-notes`;

const output = [`version=${version}`, `tag=${tag}`];
console.log(output.join("\n"));

if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, output.join("\n") + "\n");
}
