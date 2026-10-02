// A generic status indicator bar. The app supplies the status text/color and an
// optional right-aligned detail; `narrow` renders the compact variant used when
// the bar lives inside a sidebar rather than spanning the full width.

import { Show, type JSX } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme";

interface StatusIndicatorProps {
  status: string;
  statusColor?: string;
  subtitle?: string;
  right?: string;
  rightIsError?: boolean;
  narrow?: boolean;
  children?: JSX.Element;
}

export function StatusIndicator(props: StatusIndicatorProps) {
  const theme = useTheme();

  if (props.narrow) {
    return (
      <box
        flexDirection="column"
        padding={1}
        paddingLeft={2}
        paddingRight={2}
        flexShrink={0}
      >
        <text
          fg={props.statusColor ?? theme.primary}
          attributes={TextAttributes.BOLD}
        >
          {props.status}
        </text>
        <Show when={props.subtitle}>
          <text fg={theme.textMuted}>{props.subtitle}</text>
        </Show>
        <Show when={props.right}>
          <text fg={props.rightIsError ? theme.error : theme.textMuted}>
            {props.right}
          </text>
        </Show>
      </box>
    );
  }

  return (
    <box
      backgroundColor={theme.contentPane}
      marginLeft={1}
      marginRight={1}
      marginBottom={1}
      padding={1}
      paddingLeft={2}
      paddingRight={2}
      flexShrink={0}
    >
      <box flexDirection="row" justifyContent="space-between" width="100%">
        <text
          fg={props.statusColor ?? theme.primary}
          attributes={TextAttributes.BOLD}
        >
          {props.status}
          {props.children}
        </text>
        <Show when={props.right}>
          <text fg={props.rightIsError ? theme.error : theme.textMuted}>
            {props.right}
          </text>
        </Show>
      </box>
    </box>
  );
}
