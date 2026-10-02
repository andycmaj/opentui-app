// Module-level handle to the active renderer, so process-level error handlers
// can tear the TUI down cleanly (restoring the terminal) before exiting.

interface RendererLike {
  destroy: () => void;
}

let globalRenderer: RendererLike | null = null;

export function setGlobalRenderer(renderer: RendererLike | null): void {
  globalRenderer = renderer;
}

export function getGlobalRenderer(): RendererLike | null {
  return globalRenderer;
}

// Destroy the renderer (best-effort) and exit. Used for unrecoverable errors.
export function emergencyExit(error: unknown, source: string): never {
  console.error(`[${source}]`, error);
  const renderer = getGlobalRenderer();
  if (renderer) {
    try {
      renderer.destroy();
    } catch {
      // Ignore cleanup errors during emergency exit.
    }
  }
  process.exit(1);
}

let installed = false;

// Install uncaughtException/unhandledRejection handlers that emergency-exit.
// Idempotent — safe to call more than once.
export function installProcessErrorHandlers(): void {
  if (installed) return;
  installed = true;
  process.on("uncaughtException", (error) => {
    emergencyExit(error, "uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    emergencyExit(reason, "unhandledRejection");
  });
}
