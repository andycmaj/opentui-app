// Consistent header for a pane: a bold title on the left, optional right-slot.

import { type JSX } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme";

interface PaneHeaderProps {
  title: string;
  color?: string;
  children?: JSX.Element;
}

export function PaneHeader(props: PaneHeaderProps) {
  const theme = useTheme();

  return (
    <box
      padding={1}
      paddingLeft={2}
      paddingRight={2}
      flexDirection="row"
      flexShrink={0}
      justifyContent="space-between"
    >
      <text
        fg={props.color ?? theme.primary}
        attributes={TextAttributes.BOLD}
        flexShrink={0}
      >
        {props.title}
      </text>
      {props.children}
    </box>
  );
}
