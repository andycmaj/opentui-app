// Shared platform detection for the open-url / clipboard helpers.

import { readFileSync } from "node:fs";

// Under WSL, process.platform is "linux" but Linux GUI/clipboard tools usually
// can't reach the Windows side; detect WSL so callers can hand off to Windows.
export function isWsl(): boolean {
  if (process.platform !== "linux") return false;
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true;
  try {
    return readFileSync("/proc/version", "utf8")
      .toLowerCase()
      .includes("microsoft");
  } catch {
    return false;
  }
}
