// Shared modal header - consistent title + dismiss hint.

import { TextAttributes } from "@opentui/core";
import { useTheme } from "../../theme";

interface ModalHeaderProps {
  title: string;
  hint?: string;
  // Cells in from each side; default 2. Line it up with the body's padding.
  paddingX?: number;
}

export function ModalHeader(props: ModalHeaderProps) {
  const theme = useTheme();

  return (
    <box
      paddingLeft={props.paddingX ?? 2}
      paddingRight={props.paddingX ?? 2}
      paddingTop={1}
      flexDirection="row"
      justifyContent="space-between"
    >
      <text fg={theme.text} attributes={TextAttributes.BOLD}>
        {props.title}
      </text>
      <text fg={theme.textMuted}>{props.hint ?? "esc"}</text>
    </box>
  );
}
