// Render marked inline tokens into opentui styled spans. Spans are styled via
// the `style` prop (fg/bg + bold/italic/underline/strikethrough), which is how
// the opentui/solid reconciler applies styling to text nodes. They flow and
// word-wrap inside a parent <text wrapMode="word">.

import { For, type JSX } from "solid-js";
import type { StyleAttrs } from "@opentui/core";
import type { Token } from "marked";
import { useTheme } from "../../theme";

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

interface InlineToken {
  type: string;
  text?: string;
  href?: string;
  tokens?: Token[];
}

export function InlineSpans(props: { tokens: Token[] }): JSX.Element {
  return <For each={props.tokens}>{(token) => <Span token={token} />}</For>;
}

function Span(props: { token: Token }): JSX.Element {
  const theme = useTheme();
  const token = props.token as InlineToken;

  const inner = (): JSX.Element =>
    token.tokens && token.tokens.length > 0 ? (
      <InlineSpans tokens={token.tokens} />
    ) : (
      decodeEntities(token.text ?? "")
    );

  switch (token.type) {
    case "strong": {
      const style: StyleAttrs = { bold: true };
      return <span style={style}>{inner()}</span>;
    }
    case "em": {
      const style: StyleAttrs = { italic: true };
      return <span style={style}>{inner()}</span>;
    }
    case "del": {
      const style: StyleAttrs = { strikethrough: true };
      return <span style={style}>{inner()}</span>;
    }
    case "codespan": {
      const style: StyleAttrs = { fg: theme.success, bg: theme.borderSubtle };
      return <span style={style}> {decodeEntities(token.text ?? "")} </span>;
    }
    case "link": {
      const style: StyleAttrs = { fg: theme.info, underline: true };
      return (
        <a href={token.href ?? ""} style={style}>
          {inner()}
        </a>
      );
    }
    case "image": {
      const style: StyleAttrs = { fg: theme.textMuted };
      return <span style={style}>🖼 {token.text || "image"}</span>;
    }
    case "br":
      return <br />;
    case "html": {
      const style: StyleAttrs = { fg: theme.textMuted };
      return <span style={style}>{stripTags(token.text ?? "")}</span>;
    }
    default:
      return <span>{decodeEntities(token.text ?? "")}</span>;
  }
}
