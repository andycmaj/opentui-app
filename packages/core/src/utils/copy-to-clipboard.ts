import { existsSync } from "node:fs";
import { $ } from "bun";
import { isWsl } from "./platform";

// Under WSL the Windows interop dir is often missing from $PATH (tmux strips
// it), so a bare `clip.exe` fails with ENOENT. Probe the absolute path first.
const WSL_CLIP_PATH = "/mnt/c/Windows/System32/clip.exe";

// Candidate clipboard commands to try in order; each reads text from stdin.
// Pure and injectable so platform detection is unit-testable.
export function clipboardCommandsFor(
  platform: NodeJS.Platform,
  wsl: boolean,
  exists: (path: string) => boolean = existsSync,
): string[][] {
  if (platform === "darwin") return [["pbcopy"]];
  if (platform === "win32") return [["clip"]];
  if (wsl) {
    return [
      ...(exists(WSL_CLIP_PATH) ? [[WSL_CLIP_PATH]] : []),
      // WSLg may expose a Wayland clipboard; the bare name works when $PATH is
      // intact.
      ["wl-copy"],
      ["clip.exe"],
    ];
  }
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
  for (const [cmd, ...args] of clipboardCommandsFor(
    process.platform,
    isWsl(),
  )) {
    try {
      const { exitCode } = await $`${cmd} ${args} < ${input}`.nothrow().quiet();
      if (exitCode === 0) return true;
    } catch {
      // try the next copier
    }
  }
  return false;
}
