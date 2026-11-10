// The shared boot harness: process error handlers, the top-level ErrorBoundary
// -> ErrorFallback crash screen, renderer registration for emergency cleanup, an
// optional debug-console toggle, and the opentui render() call with the
// framework's default options.

import { ErrorBoundary, onCleanup, onMount, type JSX } from "solid-js";
import { render, useRenderer } from "@opentui/solid";
import { ConsolePosition, type KeyEvent } from "@opentui/core";
import { ErrorFallback } from "../components/error-fallback";
import {
  setGlobalRenderer,
  installProcessErrorHandlers,
} from "./global-renderer";
import { destroyExitCode, recordExitSignal } from "./exit-on-destroy";

export interface RunAppOptions {
  targetFps?: number;
  // The framework owns quit via the keymap, so Ctrl+C is off by default.
  exitOnCtrlC?: boolean;
  // Key that toggles the debug console; null disables it. Default backtick.
  debugConsoleKey?: string | null;
  startInDebugMode?: boolean;
  consolePosition?: ConsolePosition;
  // Runs once the renderer is destroyed and the terminal restored: stop timers,
  // flush state. Synchronous; for async cleanup set exitOnDestroy: false and
  // exit yourself when done.
  onDestroy?: () => void;
  // Exit the process after onDestroy. Default true: opentui's signal handlers
  // only destroy the renderer, so without this a signal (closed terminal, tmux
  // kill) leaves an app with live timers running headless. Exits 128+signal
  // for a signal, else process.exitCode, else 0.
  exitOnDestroy?: boolean;
}

// Registers the renderer globally and wires the debug-console toggle. Rendered
// inside the ErrorBoundary so it can access the renderer via context.
function AppRuntime(props: {
  debugConsoleKey: string | null;
  children: JSX.Element;
}): JSX.Element {
  const renderer = useRenderer();

  onMount(() => setGlobalRenderer(renderer));
  onCleanup(() => setGlobalRenderer(null));

  if (props.debugConsoleKey !== null) {
    const key = props.debugConsoleKey;
    const handler = (evt: KeyEvent) => {
      if (evt.name === key) renderer.console.toggle();
    };
    renderer.keyInput.on("keypress", handler);
    onCleanup(() => renderer.keyInput.off("keypress", handler));
  }

  return props.children;
}

/**
 * Boot an app. Wraps the root component in the framework's error handling and
 * renders it with sensible TUI defaults.
 *
 *   await runApp(() => <App />);
 */
export function runApp(
  Root: () => JSX.Element,
  options: RunAppOptions = {},
): Promise<void> {
  installProcessErrorHandlers();

  const exitOnDestroy = options.exitOnDestroy ?? true;
  const exitSignal = exitOnDestroy ? recordExitSignal() : null;

  const debugConsoleKey =
    options.debugConsoleKey === undefined ? "`" : options.debugConsoleKey;

  function RootApp() {
    return (
      <ErrorBoundary
        fallback={(err, reset) => <ErrorFallback error={err} reset={reset} />}
      >
        <AppRuntime debugConsoleKey={debugConsoleKey}>
          <Root />
        </AppRuntime>
      </ErrorBoundary>
    );
  }

  const rendered = render(RootApp, {
    targetFps: options.targetFps ?? 30,
    exitOnCtrlC: options.exitOnCtrlC ?? false,
    consoleOptions: {
      position: options.consolePosition ?? ConsolePosition.BOTTOM,
      startInDebugMode: options.startInDebugMode ?? true,
    },
    onDestroy: () => {
      setGlobalRenderer(null);
      if (!exitSignal) {
        options.onDestroy?.();
        return;
      }
      exitSignal.dispose();
      try {
        options.onDestroy?.();
      } catch (e) {
        console.error("Error in onDestroy:", e);
        process.exitCode = 1;
      }
      process.exit(destroyExitCode(exitSignal.signal(), process.exitCode));
    },
  });
  // No renderer means no destroy to clean up after.
  rendered.catch(() => exitSignal?.dispose());
  return rendered;
}
