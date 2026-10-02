// A framed pane — the default two-pane app surface. Encodes the conventions
// the reference apps converged on: a one-cell window-frame margin around the
// app, a heavy left focus border (via focusBorder) that takes the place of the
// left padding when focused, and — for the sidebar variant — a grey elevated
// surface (theme.contentPane) and a fixed width.

import { type JSX } from "solid-js";
import type { BoxRenderable } from "@opentui/core";
import { useTheme } from "../theme/context";
import { focusBorder } from "../theme/format";
import { usePane } from "../context/focus";

export interface PaneProps {
  // Registers the pane as a focus target under this id (see usePane); its
  // focus state then drives `focused` unless that's passed explicitly.
  name?: string;
  ref?: (box: BoxRenderable) => void;
  focused?: boolean;
  // "sidebar" is a fixed-width grey surface framed on the left; "content" fills
  // the remaining width and is framed on the right.
  variant?: "sidebar" | "content";
  // Sidebar width (ignored for content). Defaults to 42.
  width?: number;
  // Set false to drop the window-frame margins (e.g. a full-bleed layout).
  frame?: boolean;
  children: JSX.Element;
}

export function Pane(props: PaneProps) {
  const theme = useTheme();
  const isSidebar = () => props.variant === "sidebar";
  const framed = () => props.frame !== false;
  const pane = props.name ? usePane(props.name) : undefined;
  const focused = () => props.focused ?? pane?.isFocused() ?? false;

  return (
    <box
      ref={(box: BoxRenderable) => {
        pane?.ref(box);
        props.ref?.(box);
      }}
      flexDirection="column"
      flexGrow={isSidebar() ? 0 : 1}
      flexShrink={0}
      width={isSidebar() ? (props.width ?? 42) : undefined}
      backgroundColor={isSidebar() ? theme.contentPane : theme.background}
      marginTop={framed() ? 1 : 0}
      marginBottom={framed() ? 1 : 0}
      marginLeft={framed() && isSidebar() ? 1 : 0}
      marginRight={framed() && !isSidebar() ? 1 : 0}
      // The heavy left border occupies the first column when focused; pad by one
      // otherwise so content never shifts on focus change.
      paddingLeft={focused() ? 0 : 1}
      {...focusBorder(theme, focused())}
    >
      {props.children}
    </box>
  );
}
