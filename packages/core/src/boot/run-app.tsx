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

export interface RunAppOptions {
  targetFps?: number;
  // The framework owns quit via the keymap, so Ctrl+C is off by default.
  exitOnCtrlC?: boolean;
  // Key that toggles the debug console; null disables it. Default backtick.
  debugConsoleKey?: string | null;
  startInDebugMode?: boolean;
  consolePosition?: ConsolePosition;
  onDestroy?: () => void;
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

  return render(RootApp, {
    targetFps: options.targetFps ?? 30,
    exitOnCtrlC: options.exitOnCtrlC ?? false,
    consoleOptions: {
      position: options.consolePosition ?? ConsolePosition.BOTTOM,
      startInDebugMode: options.startInDebugMode ?? true,
    },
    onDestroy: () => {
      setGlobalRenderer(null);
      options.onDestroy?.();
    },
  });
}
