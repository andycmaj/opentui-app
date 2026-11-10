// opentui listens for termination signals and answers them with
// renderer.destroy() alone. A listener disables the runtime's default
// "terminate on signal", so an app holding timers or sockets outlives its
// closed terminal as a headless orphan. runApp exits once the renderer is gone;
// this module works out the code to exit with.

import { constants } from "os";

// opentui's default CliRenderer exitSignals.
export const RENDERER_EXIT_SIGNALS: readonly NodeJS.Signals[] = [
  "SIGINT",
  "SIGTERM",
  "SIGQUIT",
  "SIGABRT",
  "SIGHUP",
  "SIGPIPE",
  "SIGBREAK",
  "SIGBUS",
];

// Shell convention: a signal death reports 128 + signal number. Otherwise honour
// a code the app (or emergencyExit) set on process.exitCode, else 0 for a quit.
export function destroyExitCode(
  signal: NodeJS.Signals | null,
  exitCode: number | string | null | undefined,
): number {
  if (signal) {
    const n = (constants.signals as Record<string, number | undefined>)[signal];
    return n === undefined ? 1 : 128 + n;
  }
  const code = typeof exitCode === "string" ? Number(exitCode) : exitCode;
  return typeof code === "number" && Number.isInteger(code) ? code : 0;
}

// opentui's exitHandler does not say which signal destroyed the renderer, so
// record it ourselves. Install before the renderer exists: listeners run in
// registration order, so ours sees the signal before opentui's destroy runs.
export function recordExitSignal(
  signals: readonly NodeJS.Signals[] = RENDERER_EXIT_SIGNALS,
): { signal: () => NodeJS.Signals | null; dispose: () => void } {
  let received: NodeJS.Signals | null = null;
  const dispose = (): void => {
    for (const s of signals) process.off(s, listener);
  };
  function listener(signal: NodeJS.Signals): void {
    received ??= signal;
    // Alone on this signal (the renderer is not up yet), our listener would
    // swallow it; step aside and re-raise so the default termination applies.
    if (process.listenerCount(signal) === 1) {
      dispose();
      process.kill(process.pid, signal);
    }
  }
  for (const s of signals) process.on(s, listener);
  return { signal: () => received, dispose };
}
