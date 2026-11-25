// Records every demo in demos.json into public/casts/<id>.cast.
//
//   bun run scripts/record-all.ts                       # sibling checkouts
//   bun run scripts/record-all.ts --path tilt-tui=../../../tilt-tui-root
//   bun run scripts/record-all.ts --only kube-tui
//   bun run scripts/record-all.ts --warn-only            # CI: failures warn
//
// Each app runs from source with the Solid preload, against its fixture mode.

import { parseArgs } from "node:util";
import { join, resolve } from "node:path";
import { $ } from "bun";
import { warn } from "./warn";

interface Demo {
  id: string;
  repo: string;
  cwd?: string;
  keys: string;
  env?: Record<string, string>;
  args?: string[];
}

const SITE = resolve(import.meta.dir, "..");
const MONOREPO = resolve(SITE, "../..");

const { values } = parseArgs({
  options: {
    path: { type: "string", multiple: true, default: [] },
    only: { type: "string", multiple: true, default: [] },
    // CI: a demo that fails keeps its committed cast and the run goes on.
    "warn-only": { type: "boolean", default: false },
  },
});
const overrides = new Map<string, string>();
for (const kv of values.path) {
  const eq = kv.indexOf("=");
  if (eq > 0) overrides.set(kv.slice(0, eq), kv.slice(eq + 1));
}

const { demos }: { demos: Demo[] } = await Bun.file(
  join(SITE, "demos.json"),
).json();

function checkout(demo: Demo): string {
  const override = overrides.get(demo.id);
  if (override) return resolve(override);
  const name = demo.repo.split("/")[1] ?? demo.repo;
  // This repo records its own examples; apps are sibling checkouts.
  return name === "opentui-app" ? MONOREPO : resolve(MONOREPO, "..", name);
}

let failed = 0;
for (const demo of demos) {
  if (values.only.length > 0 && !values.only.includes(demo.id)) continue;
  const root = checkout(demo);
  const cwd = join(root, demo.cwd ?? ".");
  const env = Object.entries(demo.env ?? {}).flatMap(([k, v]) => [
    "--env",
    `${k}=${v}`,
  ]);
  console.log(`\n[${demo.id}] ${cwd}`);
  const result =
    await $`bun run ${join(SITE, "scripts/record.ts")} --cwd ${cwd} --keys ${join(root, demo.keys)} --out ${join(SITE, "public/casts", `${demo.id}.cast`)} --title ${demo.id} ${env} -- bun run --conditions=browser --preload @opentui/solid/preload ./src/index.tsx ${demo.args ?? []}`.nothrow();
  if (result.exitCode !== 0) {
    warn(
      `record ${demo.id}`,
      `recording failed (exit ${result.exitCode}); kept the committed cast`,
    );
    failed++;
  }
}
if (failed > 0) {
  warn("record", `${failed} demo(s) failed; their committed cast kept`);
  if (!values["warn-only"]) process.exit(1);
}
