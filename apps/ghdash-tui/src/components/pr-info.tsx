// PR Info view: title, description and labels, each in its own card. The active
// card shows an "(edit)" hint; pressing `e`/enter (handled by the content pane)
// opens the matching edit modal. Card order matches the edit-target indices in
// section-view: 0 = title, 1 = description, 2 = labels.

import { For, Show, type JSX } from "solid-js";
import { useGithub } from "@/context/github";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/card";
import { Markdown } from "@/components/markdown/markdown";
import type { Label } from "@/github/types";
import type { SectionProps } from "./sections/common";

export function PrInfo(props: SectionProps) {
  const { state } = useGithub();
  const theme = useTheme();

  // Card border + padding eats ~4 columns.
  const bodyWidth = () => Math.max(10, props.width - 4);

  return (
    <Show
      when={state.pr}
      fallback={<text fg={theme.textMuted}>No PR loaded.</text>}
    >
      <InfoCard
        title="Title"
        id={props.idFor(0)}
        selected={props.selected() === 0}
      >
        <text fg={theme.text} wrapMode="word">
          {state.pr!.title}
        </text>
      </InfoCard>

      <InfoCard
        title="Description"
        id={props.idFor(1)}
        selected={props.selected() === 1}
      >
        <Show
          when={state.pr!.body.trim()}
          fallback={<text fg={theme.textMuted}>(no description)</text>}
        >
          <Markdown text={state.pr!.body} width={bodyWidth()} />
        </Show>
      </InfoCard>

      <InfoCard
        title="Labels"
        id={props.idFor(2)}
        selected={props.selected() === 2}
      >
        <Show
          when={state.pr!.labels.length > 0}
          fallback={<text fg={theme.textMuted}>(none)</text>}
        >
          <box flexDirection="row" flexWrap="wrap" gap={1}>
            <For each={state.pr!.labels}>
              {(label) => <LabelChip label={label} />}
            </For>
          </box>
        </Show>
      </InfoCard>
    </Show>
  );
}

function InfoCard(props: {
  title: string;
  id: string;
  selected: boolean;
  children: JSX.Element;
}) {
  const theme = useTheme();

  const header = (
    <box flexDirection="row" justifyContent="space-between" flexGrow={1}>
      <text fg={theme.primary} attributes={1}>
        {props.title}
      </text>
      <Show when={props.selected}>
        <text fg={theme.textMuted}>(edit)</text>
      </Show>
    </box>
  );

  return (
    <Card id={props.id} selected={props.selected} header={header}>
      {props.children}
    </Card>
  );
}

// GitHub label color is 6-char hex without a leading '#'.
function LabelChip(props: { label: Label }) {
  const theme = useTheme();
  const color = () =>
    /^[0-9a-fA-F]{6}$/.test(props.label.color)
      ? `#${props.label.color}`
      : (theme.accent ?? undefined);
  return (
    <box flexDirection="row">
      <text fg={color()}>● </text>
      <text fg={theme.text}>{props.label.name}</text>
    </box>
  );
}
