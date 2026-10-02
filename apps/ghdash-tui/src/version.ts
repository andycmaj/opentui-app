import pkg from "../package.json";

declare const GHDASH_TUI_VERSION: string | undefined;

export const APP_VERSION =
  typeof GHDASH_TUI_VERSION === "string" && GHDASH_TUI_VERSION.length > 0
    ? GHDASH_TUI_VERSION
    : pkg.version;
