// Full-screen crash UI for the top-level ErrorBoundary: shows the message and a
// short stack, quits on q/Ctrl+C, and attempts recovery on r.

import { onCleanup, onMount } from "solid-js";
import { useRenderer } from "@opentui/solid";
import { TextAttributes, type KeyEvent } from "@opentui/core";
import { defaultTheme } from "../theme/theme";

interface ErrorFallbackProps {
  error: unknown;
  reset: () => void;
}

export function ErrorFallback(props: ErrorFallbackProps) {
  const renderer = useRenderer();
  const theme = defaultTheme;

  const handleKey = (key: KeyEvent) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      renderer.destroy();
      process.exit(1);
    }
    if (key.name === "r") {
      props.reset();
    }
  };

  onMount(() => {
    renderer.keyInput.on("keypress", handleKey);
  });
  onCleanup(() => renderer.keyInput.off("keypress", handleKey));

  const err = props.error;
  const errorMessage =
    err instanceof Error ? err.message : String(err) || "Unknown error";
  const errorStack =
    err instanceof Error
      ? err.stack?.split("\n").slice(0, 8).join("\n") || ""
      : "";

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.background}
      padding={2}
    >
      <box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
      >
        <text fg={theme.error} attributes={TextAttributes.BOLD}>
          Application Error
        </text>
        <text> </text>
        <text fg={theme.textMuted}>
          A component threw an error and the app cannot continue.
        </text>
        <text> </text>
        <box
          borderStyle="single"
          borderColor={theme.error}
          padding={1}
          width="80%"
          maxHeight={12}
        >
          <text fg={theme.error}>{errorMessage}</text>
        </box>
        <text> </text>
        <box
          borderStyle="single"
          borderColor={theme.border}
          padding={1}
          width="80%"
          maxHeight={10}
        >
          <text fg={theme.textMuted}>{errorStack}</text>
        </box>
        <text> </text>
        <text fg={theme.textMuted}>Press q or Ctrl+C to quit</text>
        <text fg={theme.textMuted}>Press r to attempt recovery</text>
      </box>
    </box>
  );
}
