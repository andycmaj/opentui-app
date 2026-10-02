import { $ } from "bun";
import { isWsl } from "./platform";

// Candidate clipboard commands to try in order; each reads text from stdin.
function copiers(): string[][] {
  if (process.platform === "darwin") return [["pbcopy"]];
  if (process.platform === "win32") return [["clip"]];
  if (isWsl()) return [["clip.exe"]];
  // Wayland first, then the two common X11 tools.
  return [
    ["wl-copy"],
    ["xclip", "-selection", "clipboard"],
    ["xsel", "--clipboard", "--input"],
  ];
}

// Copy text to the system clipboard. Best-effort; returns true if a copier
// succeeded, false if none is available, so callers can toast accordingly.
export async function copyToClipboard(text: string): Promise<boolean> {
  const input = new Blob([text]);
  for (const [cmd, ...args] of copiers()) {
    try {
      const { exitCode } = await $`${cmd} ${args} < ${input}`.nothrow().quiet();
      if (exitCode === 0) return true;
    } catch {
      // try the next copier
    }
  }
  return false;
}
