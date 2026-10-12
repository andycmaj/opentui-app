// App commands: the framework's base commands plus this app's own.

import { BaseCommands } from "@andycmaj/opentui-app";

export const Commands = {
  ...BaseCommands,
  ITEM_OPEN: "item.open",
  THEME_CYCLE: "theme.cycle",
  REFRESH: "data.refresh",
  ACTIVITY_TOGGLE: "detail.activity.toggle",
} as const;
