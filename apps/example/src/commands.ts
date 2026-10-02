// App commands: the framework's base commands plus this app's own.

import { BaseCommands } from "@opentui-app/core";

export const Commands = {
  ...BaseCommands,
  ITEM_OPEN: "item.open",
  THEME_CYCLE: "theme.cycle",
  REFRESH: "data.refresh",
} as const;
