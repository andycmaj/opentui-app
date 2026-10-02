// A selectable container. A left-edge border is always present so the layout
// never shifts on selection; unselected it matches the background (invisible),
// selected it takes the accent color.

import { type JSX } from "solid-js";
import { useTheme } from "../theme";

interface CardProps {
  id?: string;
  selected?: boolean;
  accent?: string;
  header?: JSX.Element;
  children: JSX.Element;
}

export function Card(props: CardProps) {
  const theme = useTheme();

  return (
    <box
      id={props.id}
      flexDirection="column"
      margin={0}
      marginBottom={1}
      padding={1}
      focusable
      focused={props.selected}
      border={["left"]}
      borderStyle={"heavy"}
      borderColor={theme.contentPane}
      focusedBorderColor={props.accent ?? theme.primary}
      backgroundColor={theme.contentPane}
    >
      {props.header && (
        <box flexDirection="row" flexWrap="wrap">
          {props.header}
        </box>
      )}
      {props.children}
    </box>
  );
}
