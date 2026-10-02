// Render Markdown to opentui elements. Block tokens map to boxes/rows; inline
// content flows through <text wrapMode="word"> which handles styled wrapping.

import { createMemo, For, Show, type JSX } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { marked, type Token, type Tokens } from "marked";
import { useTheme } from "../../theme";
import { InlineSpans, decodeEntities, stripTags } from "./inline";

export function Markdown(props: { text: string; width: number }): JSX.Element {
  const tokens = createMemo<Token[]>(() => {
    const text = props.text ?? "";
    if (!text.trim()) return [];
    try {
      return marked.lexer(text);
    } catch {
      return [{ type: "paragraph", raw: text, text, tokens: [] } as Token];
    }
  });

  return (
    <box flexDirection="column">
      <Blocks tokens={tokens()} width={props.width} />
    </box>
  );
}

function Blocks(props: { tokens: Token[]; width: number }): JSX.Element {
  return (
    <For each={props.tokens}>
      {(token) => <Block token={token} width={props.width} />}
    </For>
  );
}

function InlineLine(props: {
  tokens?: Token[];
  fallback?: string;
  fg?: string;
  attributes?: number;
}): JSX.Element {
  const theme = useTheme();
  return (
    <text
      wrapMode="word"
      fg={props.fg ?? theme.text}
      attributes={props.attributes ?? 0}
    >
      <Show
        when={props.tokens && props.tokens.length > 0}
        fallback={decodeEntities(props.fallback ?? "")}
      >
        <InlineSpans tokens={props.tokens!} />
      </Show>
    </text>
  );
}

function Block(props: { token: Token; width: number }): JSX.Element {
  const theme = useTheme();
  const token = props.token;

  switch (token.type) {
    case "space":
      return null;

    case "heading": {
      const h = token as Tokens.Heading;
      const color = h.depth <= 2 ? theme.accent : theme.primary;
      return (
        <box marginBottom={1}>
          <InlineLine
            tokens={h.tokens}
            fallback={h.text}
            fg={color}
            attributes={TextAttributes.BOLD}
          />
        </box>
      );
    }

    case "paragraph": {
      const p = token as Tokens.Paragraph;
      return (
        <box marginBottom={1}>
          <InlineLine tokens={p.tokens} fallback={p.text} />
        </box>
      );
    }

    // marked emits a "text" block for loose list-item content etc.
    case "text": {
      const t = token as Tokens.Text;
      return <InlineLine tokens={t.tokens} fallback={t.text} />;
    }

    case "blockquote": {
      const q = token as Tokens.Blockquote;
      return (
        <box flexDirection="row" marginBottom={1}>
          <text fg={theme.textMuted}>▎</text>
          <box flexDirection="column" flexGrow={1} paddingLeft={1}>
            <Blocks tokens={q.tokens} width={props.width - 2} />
          </box>
        </box>
      );
    }

    case "list": {
      const list = token as Tokens.List;
      return (
        <box flexDirection="column" marginBottom={1}>
          <For each={list.items}>
            {(item, i) => (
              <ListItem
                item={item}
                bullet={
                  list.ordered ? `${(Number(list.start) || 1) + i()}.` : "•"
                }
                width={props.width - 2}
              />
            )}
          </For>
        </box>
      );
    }

    case "code": {
      const code = token as Tokens.Code;
      return (
        <box
          flexDirection="column"
          marginBottom={1}
          backgroundColor={theme.contentPane}
          paddingLeft={1}
          paddingRight={1}
        >
          <Show when={code.lang}>
            <text fg={theme.textMuted}>{code.lang}</text>
          </Show>
          <For each={code.text.split("\n")}>
            {(line) => <text fg={theme.success}>{line || " "}</text>}
          </For>
        </box>
      );
    }

    case "hr":
      return (
        <box marginBottom={1}>
          <text fg={theme.borderSubtle}>
            {"─".repeat(Math.max(4, props.width))}
          </text>
        </box>
      );

    case "table":
      return <MarkdownTable token={token as Tokens.Table} />;

    case "html": {
      const stripped = stripTags((token as Tokens.HTML).text);
      return (
        <Show when={stripped}>
          <box marginBottom={1}>
            <text wrapMode="word" fg={theme.textMuted}>
              {decodeEntities(stripped)}
            </text>
          </box>
        </Show>
      );
    }

    default: {
      const raw = (token as { text?: string }).text;
      return (
        <Show when={raw}>
          <text wrapMode="word" fg={theme.text}>
            {decodeEntities(raw ?? "")}
          </text>
        </Show>
      );
    }
  }
}

function ListItem(props: {
  item: Tokens.ListItem;
  bullet: string;
  width: number;
}): JSX.Element {
  const theme = useTheme();
  return (
    <box flexDirection="row">
      <box width={props.bullet.length + 1} flexShrink={0}>
        <text fg={theme.primary}>
          <Show when={props.item.task} fallback={props.bullet}>
            {props.item.checked ? "☑" : "☐"}
          </Show>
        </text>
      </box>
      <box flexDirection="column" flexGrow={1}>
        <Blocks tokens={props.item.tokens} width={props.width} />
      </box>
    </box>
  );
}

function MarkdownTable(props: { token: Tokens.Table }): JSX.Element {
  const theme = useTheme();
  const t = props.token;

  const cellText = (cell: { text?: string; tokens?: Token[] }): string =>
    decodeEntities(cell.text ?? "");

  return (
    <box flexDirection="column" marginBottom={1}>
      <text fg={theme.accent} attributes={TextAttributes.BOLD} wrapMode="word">
        {t.header.map(cellText).join("  │  ")}
      </text>
      <text fg={theme.borderSubtle}>
        {t.header.map(() => "───").join("──┼──")}
      </text>
      <For each={t.rows}>
        {(row) => (
          <text fg={theme.text} wrapMode="word">
            {row.map(cellText).join("  │  ")}
          </text>
        )}
      </For>
    </box>
  );
}
