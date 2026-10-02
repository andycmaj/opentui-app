// Shared building blocks for the content-pane section views (Feed / Actions /
// Mergeability): the props each section receives and the cursor marker.

import { useTheme } from "@/hooks/useTheme";

// Every section renders a navigable list driven by the pane's cursor.
export interface SectionProps {
  width: number;
  selected: () => number;
  idFor: (index: number) => string;
}

// A one-cell marker shown to the left of the focused row.
export function Marker(props: { selected: boolean }) {
  const theme = useTheme();
  return (
    <text fg={theme.primary} attributes={1}>
      {props.selected ? "▸" : " "}
    </text>
  );
}
