// The framework's base commands plus this example's own. A command is just a
// string id; the keymap decides which keys reach it.

import { BaseCommands } from "@andycmaj/opentui-app";

export const Commands = {
  ...BaseCommands,
  SAVE: "app.save",
  LOG_CLEAR: "log.clear",
  COLOR_PICK: "colors.pick",
  COLOR_SORT: "colors.sort",
} as const;
