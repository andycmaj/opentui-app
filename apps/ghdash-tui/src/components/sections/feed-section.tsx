// Feed view: a card per comment / review event in the PR conversation.

import { For, Show } from "solid-js";
import { useGithub } from "@/context/github";
import { useTheme } from "@/hooks/useTheme";
import { formatRelativeTime } from "@/theme/theme";
import { Card } from "@/components/card";
import { Markdown } from "@/components/markdown/markdown";
import { FeedItemKind, type FeedItem } from "@/github/types";
import type { SectionProps } from "./common";

export function FeedSection(props: SectionProps) {
  const { state } = useGithub();
  const theme = useTheme();

  return (
    <Show
      when={state.feed.length > 0}
      fallback={<text fg={theme.textMuted}>No comments or reviews yet.</text>}
    >
      <For each={state.feed}>
        {(item, index) => (
          <FeedRow
            item={item}
            width={props.width}
            id={props.idFor(index())}
            selected={props.selected() === index()}
          />
        )}
      </For>
    </Show>
  );
}

function reviewStateLabel(item: FeedItem): { text: string; color: string } {
  const theme = useTheme();
  switch (item.reviewState) {
    case "APPROVED":
      return { text: "approved", color: theme.success ?? "" };
    case "CHANGES_REQUESTED":
      return { text: "requested changes", color: theme.error ?? "" };
    case "DISMISSED":
      return { text: "dismissed", color: theme.textMuted ?? "" };
    default:
      return { text: "commented", color: theme.info ?? "" };
  }
}

function FeedRow(props: {
  item: FeedItem;
  width: number;
  id: string;
  selected: boolean;
}) {
  const theme = useTheme();
  const item = props.item;

  const kindGlyph = () => {
    if (item.kind === FeedItemKind.Review) return "★";
    if (item.kind === FeedItemKind.ThreadComment)
      return item.isReply ? "↳" : "◆";
    return item.author.isBot ? "⚙" : "▪";
  };

  const isThread = item.kind === FeedItemKind.ThreadComment;

  // Card border tint: review state (approved green / changes red), or an
  // unresolved review thread (warning) so open threads stand out.
  const accent = () => {
    if (item.kind === FeedItemKind.Review) {
      if (item.reviewState === "APPROVED") return theme.success;
      if (item.reviewState === "CHANGES_REQUESTED") return theme.error;
      return undefined;
    }
    if (isThread && !item.threadResolved) return theme.warning;
    return undefined;
  };

  // Resolved/unresolved status for a review-thread comment.
  const threadStatus = () =>
    item.threadResolved
      ? { text: "✓ resolved", color: theme.success ?? "" }
      : { text: "○ unresolved", color: theme.warning ?? "" };

  const header = (
    <>
      <text fg={theme.accent}>{kindGlyph()} </text>
      <text fg={theme.primary} attributes={1}>
        {item.author.login}
      </text>
      <Show when={item.kind === FeedItemKind.Review}>
        <text fg={reviewStateLabel(item).color}>
          {" "}
          {reviewStateLabel(item).text}
        </text>
      </Show>
      <Show when={isThread && item.threadPath}>
        <text fg={theme.textMuted}> {item.threadPath}</text>
      </Show>
      <Show when={isThread}>
        <text fg={threadStatus().color}> {threadStatus().text}</text>
      </Show>
      <text fg={theme.textMuted}> · {formatRelativeTime(item.createdAt)}</text>
    </>
  );

  // Card border + padding eats ~4 columns.
  const bodyWidth = () => Math.max(10, props.width - 4);

  return (
    <Card
      id={props.id}
      selected={props.selected}
      accent={accent()}
      header={header}
    >
      <Show
        when={item.body.trim()}
        fallback={<text fg={theme.textMuted}>(no description)</text>}
      >
        <Markdown text={item.body} width={bodyWidth()} />
      </Show>
    </Card>
  );
}
