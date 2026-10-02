// Word-aware text wrapping to a fixed column width. Preserves existing
// newlines and falls back to a hard break for words longer than the width.
export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return [text];

  const out: string[] = [];
  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    let line = rawLine;
    if (line.length === 0) {
      out.push("");
      continue;
    }
    while (line.length > width) {
      let breakAt = line.lastIndexOf(" ", width);
      if (breakAt <= 0) breakAt = width;
      out.push(line.slice(0, breakAt));
      line = line.slice(breakAt).replace(/^ +/, "");
    }
    out.push(line);
  }
  return out;
}
