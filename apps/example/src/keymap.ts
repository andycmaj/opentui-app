// This app's keymap: framework base bindings + nav for both panes + app extras.

import {
  baseAppBindings,
  navBindings,
  type KeymapTable,
} from "@andycmaj/opentui-app";
import { Commands } from "./commands";

export const PANES = ["list", "detail"];

export const keymap: KeymapTable = {
  app: [
    ...baseAppBindings,
    { key: "r", cmd: Commands.REFRESH, desc: "refresh", help: "refresh" },
    { key: "t", cmd: Commands.THEME_CYCLE, desc: "cycle theme", help: "theme" },
  ],
  list: [
    ...navBindings(),
    { key: "return", cmd: Commands.ITEM_OPEN, desc: "open task", help: "open" },
  ],
  detail: navBindings(),
};
