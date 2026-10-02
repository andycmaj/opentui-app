// A one-cell cursor marker shown to the left of the focused row.

import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme";

export function Marker(props: { selected: boolean; glyph?: string }) {
  const theme = useTheme();
  return (
    <text fg={theme.primary} attributes={TextAttributes.BOLD}>
      {props.selected ? (props.glyph ?? "▸") : " "}
    </text>
  );
}
