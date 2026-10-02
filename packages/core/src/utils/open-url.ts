import { $ } from "bun";
import { isWsl } from "./platform";

// Candidate opener commands to try in order; the first that exits 0 wins.
function openers(url: string): string[][] {
  if (process.platform === "darwin") return [["open", url]];
  if (process.platform === "win32") return [["cmd", "/c", "start", "", url]];
  if (isWsl()) {
    // wslview (wslu) is the clean path; fall back to invoking Windows directly.
    return [
      ["wslview", url],
      ["cmd.exe", "/c", "start", "", url],
      ["powershell.exe", "-NoProfile", "Start-Process", url],
    ];
  }
  return [["xdg-open", url]];
}

// Open a URL in the user's default browser. Best-effort; errors are swallowed
// so the TUI is never disrupted by a failed launch.
export async function openUrl(url: string): Promise<void> {
  for (const [cmd, ...args] of openers(url)) {
    try {
      const { exitCode } = await $`${cmd} ${args}`.nothrow().quiet();
      if (exitCode === 0) return;
    } catch {
      // try the next opener
    }
  }
}
