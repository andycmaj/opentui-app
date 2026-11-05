// One table, keyed by scope. `app` applies anywhere in the pane layout; each
// pane's scope applies only while focus is inside that pane, and wins over
// `app` for a key both define.

import {
  baseAppBindings,
  navBindings,
  type KeymapTable,
} from "@andycmaj/opentui-app";
import { Commands } from "./commands";

export const PANES = ["colors", "log"];

export const keymap: KeymapTable = {
  app: [
    ...baseAppBindings,
    // `help` puts a binding in the footer...
    { key: "s", cmd: Commands.SAVE, desc: "save", help: "save" },
    // ...without it, the binding only shows in the `?` help screen.
    { key: "x", cmd: Commands.LOG_CLEAR, desc: "clear the dispatch log" },
  ],
  colors: [
    ...navBindings(),
    {
      key: "space",
      cmd: Commands.COLOR_PICK,
      desc: "pick color",
      help: "pick",
    },
    // Shadows the app's `s` while the colors pane has focus.
    { key: "s", cmd: Commands.COLOR_SORT, desc: "sort colors", help: "sort" },
  ],
  log: navBindings(),
};

// The keys bound to a command in a scope, for the dispatch log.
export function keysFor(scope: string, cmd: string): string {
  return (keymap[scope] ?? [])
    .filter((spec) => spec.cmd === cmd)
    .map((spec) => spec.key)
    .join("/");
}
