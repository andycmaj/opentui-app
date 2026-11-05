// Entry point: boot one of the examples through the framework's runApp
// harness. `bun run dev` runs the basic two-pane demo; `bun run dev keymaps`
// runs the keymaps example the site's guide walks through.

import { runApp } from "@andycmaj/opentui-app";
import { App as BasicApp } from "./examples/basic/app";
import { App as KeymapsApp } from "./examples/keymaps/app";

const EXAMPLES = {
  basic: BasicApp,
  keymaps: KeymapsApp,
} as const;

function isExample(name: string): name is keyof typeof EXAMPLES {
  return name in EXAMPLES;
}

const name = process.argv[2] ?? "basic";
if (!isExample(name)) {
  console.error(
    `Unknown example "${name}". Try: ${Object.keys(EXAMPLES).join(", ")}`,
  );
  process.exit(1);
}

const App = EXAMPLES[name];
await runApp(() => <App />);
