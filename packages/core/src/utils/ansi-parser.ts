// ANSI escape code parser for preserving terminal colors in log rendering

import { parse } from "@ansi-tools/parser";
import { RGBA } from "@opentui/core";

export interface AnsiSegment {
  text: string;
  fg?: RGBA;
  bg?: RGBA;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

// Standard ANSI 4-bit color palette (foreground codes 30-37, 90-97)
const ANSI_COLORS: Record<number, string> = {
  // Standard colors (30-37)
  30: "#000000", // Black
  31: "#cc0000", // Red
  32: "#00cc00", // Green
  33: "#cccc00", // Yellow
  34: "#0000cc", // Blue
  35: "#cc00cc", // Magenta
  36: "#00cccc", // Cyan
  37: "#cccccc", // White
  // Bright/high-intensity colors (90-97)
  90: "#666666", // Bright Black (Gray)
  91: "#ff0000", // Bright Red
  92: "#00ff00", // Bright Green
  93: "#ffff00", // Bright Yellow
  94: "#0000ff", // Bright Blue
  95: "#ff00ff", // Bright Magenta
  96: "#00ffff", // Bright Cyan
  97: "#ffffff", // Bright White
};

// Background color codes are fg + 10 (40-47, 100-107)
function getBgColorCode(code: number): number | null {
  if (code >= 40 && code <= 47) {
    return code - 10;
  }
  if (code >= 100 && code <= 107) {
    return code - 10;
  }
  return null;
}

/**
 * Parse text with ANSI escape codes into segments with color/style information.
 *
 * Supports:
 * - Standard foreground colors (30-37)
 * - Bright foreground colors (90-97)
 * - Standard background colors (40-47)
 * - Bright background colors (100-107)
 * - Bold (1), Dim (2), Italic (3), Underline (4)
 * - Reset (0)
 *
 * Does NOT yet support:
 * - 256-color mode (38;5;n)
 * - True color mode (38;2;r;g;b)
 */
export function parseAnsi(text: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];

  // Match SGR (Select Graphic Rendition) sequences: ESC[...m
  const regex = /\x1B\[([0-9;]*)m/g;

  let lastIndex = 0;
  let currentFg: RGBA | undefined;
  let currentBg: RGBA | undefined;
  let bold = false;
  let dim = false;
  let italic = false;
  let underline = false;

  let match;
  while ((match = regex.exec(text)) !== null) {
    // Add text before this escape sequence as a segment
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        fg: currentFg,
        bg: currentBg,
        bold,
        dim,
        italic,
        underline,
      });
    }

    // Parse SGR parameters (semicolon-separated numbers)
    const paramsStr = match[1];
    const params = paramsStr ? paramsStr.split(";").map(Number) : [0];

    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      if (param === 0) {
        // Reset all attributes
        currentFg = undefined;
        currentBg = undefined;
        bold = false;
        dim = false;
        italic = false;
        underline = false;
      } else if (param === 1) {
        bold = true;
      } else if (param === 2) {
        dim = true;
      } else if (param === 3) {
        italic = true;
      } else if (param === 4) {
        underline = true;
      } else if (param === 22) {
        // Normal intensity (neither bold nor dim)
        bold = false;
        dim = false;
      } else if (param === 23) {
        italic = false;
      } else if (param === 24) {
        underline = false;
      } else if (param >= 30 && param <= 37) {
        // Standard foreground color
        currentFg = RGBA.fromHex(ANSI_COLORS[param]);
      } else if (param === 39) {
        // Default foreground color
        currentFg = undefined;
      } else if (param >= 40 && param <= 47) {
        // Standard background color
        const fgCode = getBgColorCode(param);
        if (fgCode !== null) {
          currentBg = RGBA.fromHex(ANSI_COLORS[fgCode]);
        }
      } else if (param === 49) {
        // Default background color
        currentBg = undefined;
      } else if (param >= 90 && param <= 97) {
        // Bright foreground color
        currentFg = RGBA.fromHex(ANSI_COLORS[param]);
      } else if (param >= 100 && param <= 107) {
        // Bright background color
        const fgCode = getBgColorCode(param);
        if (fgCode !== null) {
          currentBg = RGBA.fromHex(ANSI_COLORS[fgCode]);
        }
      }
      // TODO: Handle 256-color (38;5;n) and true color (38;2;r;g;b)
    }

    lastIndex = regex.lastIndex;
  }

  // Add any remaining text after the last escape sequence
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      fg: currentFg,
      bg: currentBg,
      bold,
      dim,
      italic,
      underline,
    });
  }

  // If no segments were created (no ANSI codes), return the whole text as one segment
  if (segments.length === 0 && text.length > 0) {
    segments.push({ text });
  }

  return segments;
}

/**
 * Strip all ANSI escape codes from text, returning plain text.
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

// Terminal cells a single code point occupies. Wrapping, selection and drawing
// must all agree on this, or a wide glyph shifts the rest of the row on screen
// while opentui's frame still has it one cell over.
export function cellWidth(char: string): number {
  return Bun.stringWidth(char);
}

/**
 * Calculate the display width of text, ignoring ANSI escape sequences.
 */
export function displayWidth(text: string): number {
  return Bun.stringWidth(stripAnsi(text));
}

/**
 * Slice text by visual (display) position rather than raw string index.
 * ANSI escape codes are skipped when counting positions, so visual
 * coordinates from the rendered output map correctly to the underlying text.
 * Returns plain text (ANSI codes stripped from the result).
 */
export function sliceByDisplayPosition(
  text: string,
  start: number,
  end?: number,
): string {
  const result: string[] = [];
  let visualPos = 0;
  let inEscape = false;

  for (const char of text) {
    if (char === "\x1B") {
      inEscape = true;
      continue;
    }
    if (inEscape) {
      if (char === "m") {
        inEscape = false;
      }
      continue;
    }

    if (end !== undefined && visualPos >= end) break;

    if (visualPos >= start) {
      result.push(char);
    }

    visualPos += cellWidth(char);
  }

  return result.join("");
}

const TAB_WIDTH = 8;

// Log text is drawn cell by cell, and only SGR is interpreted. Any other
// control sequence would land in a cell and reach the terminal raw, moving
// its cursor (or advancing it more than one cell) so the screen no longer
// matches opentui's diffed frame until a full repaint.
export function sanitizeControlChars(text: string): string {
  let out = "";
  let col = 0;
  // The last printable char in `out`, so backspace can erase it.
  let lastChar = "";

  for (const code of parse(text)) {
    if (code.type === "CSI" && code.command === "m") {
      out += code.raw;
      continue;
    }
    if (code.type !== "TEXT") continue;

    for (const ch of code.raw) {
      const cp = ch.codePointAt(0) ?? 0;
      if (ch === "\t") {
        const width = TAB_WIDTH - (col % TAB_WIDTH);
        out += " ".repeat(width);
        col += width;
        lastChar = "";
      } else if (ch === "\b") {
        if (lastChar) {
          out = out.slice(0, -lastChar.length);
          col -= cellWidth(lastChar);
          lastChar = "";
        }
      } else if (cp >= 0x20 && !(cp >= 0x7f && cp <= 0x9f)) {
        out += ch;
        col += cellWidth(ch);
        lastChar = ch;
      }
    }
  }
  return out;
}
