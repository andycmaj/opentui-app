// Writes src/data/keymaps/<id>.json for every app in demos.json that names a
// `keymap` module: each scope's bindings, one row per command with its keys
// joined ("j/down"), formatted by core's own help helpers so the site's
// tables read exactly like the apps' `?` screens.
//
//   bun run scripts/extract-keymaps.ts [--path id=dir] [--only id] [--warn-only]

import { parseArgs } from "node:util";
import { join, resolve } from "node:path";
import { $ } from "bun";
import { warn } from "./warn";
import {
  getScopeBindings,
  mergeByCommand,
  type HelpRow,
} from "../../../packages/core/src/keyboard/keymap-utils";
import type { KeymapTable } from "../../../packages/core/src/keyboard/keymap";

interface Demo {
  id: string;
  repo: string;
  keymap?: string;
}

export type ExtractedKeymap = Record<string, HelpRow[]>;

const SITE = resolve(import.meta.dir, "..");
const MONOREPO = resolve(SITE, "../..");

const { values } = parseArgs({
  options: {
    path: { type: "string", multiple: true, default: [] },
    only: { type: "string", multiple: true, default: [] },
    // CI: a demo that fails keeps its committed keymap JSON and the run goes on.
    "warn-only": { type: "boolean", default: false },
  },
});
const overrides = new Map<string, string>();
for (const kv of values.path) {
  const eq = kv.indexOf("=");
  if (eq > 0) overrides.set(kv.slice(0, eq), kv.slice(eq + 1));
}

function checkout(demo: Demo): string {
  const override = overrides.get(demo.id);
  if (override) return resolve(override);
  return resolve(MONOREPO, "..", demo.repo.split("/")[1] ?? demo.repo);
}

// The keymap module imports the app's commands (and sometimes opentui), so it
// loads in its own checkout, with its own dependencies and the Solid preload.
// Only plain data crosses back: `relevant` predicates are dropped.
async function loadKeymap(root: string, module: string): Promise<KeymapTable> {
  const loader = `
    const { keymap } = await import(${JSON.stringify(join(root, module))});
    console.log(JSON.stringify(keymap, (_k, v) => (typeof v === "function" ? undefined : v)));
  `;
  const out =
    await $`bun --conditions=browser --preload @opentui/solid/preload -e ${loader}`
      .cwd(root)
      .quiet()
      .text();
  return JSON.parse(out.trim().split("\n").pop() ?? "{}");
}

const { demos }: { demos: Demo[] } = await Bun.file(
  join(SITE, "demos.json"),
).json();
let failed = 0;
for (const demo of demos) {
  if (!demo.keymap) continue;
  if (values.only.length > 0 && !values.only.includes(demo.id)) continue;
  try {
    const table = await loadKeymap(checkout(demo), demo.keymap);
    const extracted: ExtractedKeymap = Object.fromEntries(
      Object.keys(table).map((scope) => [
        scope,
        mergeByCommand(getScopeBindings(table, scope)),
      ]),
    );
    const out = join(SITE, "src/data/keymaps", `${demo.id}.json`);
    await Bun.write(out, `${JSON.stringify(extracted, null, 2)}\n`);
    const rows = Object.values(extracted).reduce((n, r) => n + r.length, 0);
    console.log(
      `[${demo.id}] ${Object.keys(extracted).length} scopes, ${rows} rows -> ${out}`,
    );
  } catch (err) {
    warn(
      `keymaps ${demo.id}`,
      `extraction failed; kept the committed JSON: ${String(err)}`,
    );
    failed++;
  }
}
if (failed > 0) {
  warn("keymaps", `${failed} demo(s) failed; their committed keymap JSON kept`);
  if (!values["warn-only"]) process.exit(1);
}
