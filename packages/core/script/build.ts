#!/usr/bin/env bun

// Compile the library to dist/ for publishing: Solid-transformed JS plus .d.ts.
//
// Consumers can't run src/ directly: @opentui/solid's Bun plugin deliberately
// skips anything under node_modules, so an installed copy's .tsx would get
// Bun's default (React-style) JSX instead of Solid's universal transform, and
// context providers would render their children outside the provider.
//
// In the workspace, package.json exports point at src/ (the example app and
// tests use it live). With --publish, exports are rewritten to dist/ in place;
// the release workflow runs this on a throwaway checkout of the release tag.
import path from "path";
import { $ } from "bun";
import { fileURLToPath } from "url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(dir);

// solid-transform isn't in @opentui/solid's exports map; locate it next to the
// exported preload script.
const solidScripts = path.dirname(
  Bun.resolveSync("@opentui/solid/preload", dir),
);
const { transformSolidSource } = (await import(
  path.join(solidScripts, "solid-transform.js")
)) as {
  transformSolidSource: (
    code: string,
    options: { filename: string },
  ) => Promise<string>;
};

await $`rm -rf dist`;

const sources = new Bun.Glob("src/**/*.{ts,tsx}");
let count = 0;
for await (const file of sources.scan({ cwd: dir })) {
  if (/\.test\.tsx?$/.test(file)) continue;
  const code = await Bun.file(file).text();
  const js = await transformSolidSource(code, {
    filename: path.join(dir, file),
  });
  const out = file.replace(/^src\//, "dist/").replace(/\.tsx?$/, ".js");
  await Bun.write(out, js);
  count++;
}
console.log(`Transformed ${count} modules`);

await $`tsc -p tsconfig.json --noEmit false --declaration --emitDeclarationOnly --outDir dist`;
await $`find dist -name '*.test.d.ts' -delete`;

if (process.argv.includes("--publish")) {
  const pkgPath = path.join(dir, "package.json");
  const pkg = await Bun.file(pkgPath).json();
  const exports: Record<string, { types: string; default: string }> = {};
  for (const [key, target] of Object.entries<string>(pkg.exports)) {
    const base = target.replace(/^\.\/src\//, "./dist/").replace(/\.tsx?$/, "");
    exports[key] = { types: `${base}.d.ts`, default: `${base}.js` };
  }
  pkg.exports = exports;
  pkg.files = ["dist"];
  await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("Rewrote package.json exports to dist/");
}
