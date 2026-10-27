import { describe, test, expect } from "bun:test";
import {
  parseAnsi,
  stripAnsi,
  displayWidth,
  sanitizeControlChars,
  sliceByDisplayPosition,
} from "./ansi-parser";

describe("parseAnsi", () => {
  test("returns single segment for plain text", () => {
    const segments = parseAnsi("Hello World");
    expect(segments.length).toBe(1);
    expect(segments[0].text).toBe("Hello World");
    expect(segments[0].fg).toBeUndefined();
    expect(segments[0].bg).toBeUndefined();
    expect(segments[0].bold).toBeFalsy();
  });

  test("returns empty array for empty string", () => {
    const segments = parseAnsi("");
    expect(segments.length).toBe(0);
  });

  test("parses standard red foreground color", () => {
    const segments = parseAnsi("\x1B[31mRed\x1B[0m");
    // Only 1 segment since there's no text after the reset code
    expect(segments.length).toBe(1);
    expect(segments[0].fg).toBeDefined();
    expect(segments[0].text).toBe("Red");
  });

  test("parses all standard foreground colors (30-37)", () => {
    for (let code = 30; code <= 37; code++) {
      const segments = parseAnsi(`\x1B[${code}mText\x1B[0m`);
      expect(segments[0].fg).toBeDefined();
      expect(segments[0].text).toBe("Text");
    }
  });

  test("parses bright foreground colors (90-97)", () => {
    for (let code = 90; code <= 97; code++) {
      const segments = parseAnsi(`\x1B[${code}mText\x1B[0m`);
      expect(segments[0].fg).toBeDefined();
      expect(segments[0].text).toBe("Text");
    }
  });

  test("handles reset code (0)", () => {
    const segments = parseAnsi("\x1B[31mRed\x1B[0mNormal");
    expect(segments.length).toBe(2);
    expect(segments[0].fg).toBeDefined();
    expect(segments[0].text).toBe("Red");
    expect(segments[1].fg).toBeUndefined();
    expect(segments[1].text).toBe("Normal");
  });

  test("parses bold attribute (1)", () => {
    const segments = parseAnsi("\x1B[1mBold\x1B[0m");
    expect(segments[0].bold).toBe(true);
    expect(segments[0].text).toBe("Bold");
  });

  test("parses dim attribute (2)", () => {
    const segments = parseAnsi("\x1B[2mDim\x1B[0m");
    expect(segments[0].dim).toBe(true);
    expect(segments[0].text).toBe("Dim");
  });

  test("parses italic attribute (3)", () => {
    const segments = parseAnsi("\x1B[3mItalic\x1B[0m");
    expect(segments[0].italic).toBe(true);
  });

  test("parses underline attribute (4)", () => {
    const segments = parseAnsi("\x1B[4mUnderline\x1B[0m");
    expect(segments[0].underline).toBe(true);
  });

  test("handles multiple attributes in one sequence", () => {
    const segments = parseAnsi("\x1B[1;31mBoldRed\x1B[0m");
    expect(segments[0].bold).toBe(true);
    expect(segments[0].fg).toBeDefined();
    expect(segments[0].text).toBe("BoldRed");
  });

  test("handles multiple separate sequences", () => {
    const segments = parseAnsi("\x1B[1mBold\x1B[31mBoldRed\x1B[0mNormal");
    expect(segments.length).toBe(3);
    expect(segments[0].bold).toBe(true);
    expect(segments[0].fg).toBeUndefined();
    expect(segments[1].bold).toBe(true);
    expect(segments[1].fg).toBeDefined();
    expect(segments[2].bold).toBeFalsy();
    expect(segments[2].fg).toBeUndefined();
  });

  test("parses background colors (40-47)", () => {
    const segments = parseAnsi("\x1B[41mRedBg\x1B[0m");
    expect(segments[0].bg).toBeDefined();
    expect(segments[0].text).toBe("RedBg");
  });

  test("parses bright background colors (100-107)", () => {
    const segments = parseAnsi("\x1B[101mBrightRedBg\x1B[0m");
    expect(segments[0].bg).toBeDefined();
    expect(segments[0].text).toBe("BrightRedBg");
  });

  test("handles empty parameter list as reset", () => {
    const segments = parseAnsi("\x1B[31mRed\x1B[mNormal");
    expect(segments[0].fg).toBeDefined();
    expect(segments[1].fg).toBeUndefined();
  });

  test("handles default foreground (39) and background (49)", () => {
    const segments = parseAnsi("\x1B[31;41mColored\x1B[39mNoFg\x1B[49mNoBg");
    expect(segments[0].fg).toBeDefined();
    expect(segments[0].bg).toBeDefined();
    expect(segments[1].fg).toBeUndefined();
    expect(segments[1].bg).toBeDefined();
    expect(segments[2].bg).toBeUndefined();
  });

  test("handles text with no trailing reset", () => {
    const segments = parseAnsi("\x1B[31mRed text without reset");
    expect(segments.length).toBe(1);
    expect(segments[0].fg).toBeDefined();
    expect(segments[0].text).toBe("Red text without reset");
  });

  test("handles adjacent escape sequences", () => {
    const segments = parseAnsi("\x1B[31m\x1B[1mBoldRed");
    // Should be one segment since no text between sequences
    expect(segments.length).toBe(1);
    expect(segments[0].bold).toBe(true);
    expect(segments[0].fg).toBeDefined();
  });

  test("handles real-world npm output pattern", () => {
    const text = "\x1B[32m✓\x1B[0m Test passed";
    const segments = parseAnsi(text);
    expect(segments.length).toBe(2);
    expect(segments[0].fg).toBeDefined(); // Green checkmark
    expect(segments[0].text).toBe("✓");
    expect(segments[1].text).toBe(" Test passed");
  });
});

describe("stripAnsi", () => {
  test("returns plain text unchanged", () => {
    expect(stripAnsi("Hello World")).toBe("Hello World");
  });

  test("strips color codes", () => {
    expect(stripAnsi("\x1B[31mRed\x1B[0m")).toBe("Red");
  });

  test("strips multiple codes", () => {
    expect(stripAnsi("\x1B[1m\x1B[31mBoldRed\x1B[0m Normal")).toBe(
      "BoldRed Normal",
    );
  });

  test("handles empty string", () => {
    expect(stripAnsi("")).toBe("");
  });

  test("strips cursor movement codes", () => {
    expect(stripAnsi("\x1B[2J\x1B[HCleared")).toBe("Cleared");
  });
});

describe("displayWidth", () => {
  test("returns length for plain text", () => {
    expect(displayWidth("Hello")).toBe(5);
  });

  test("ignores ANSI codes in width calculation", () => {
    expect(displayWidth("\x1B[31mRed\x1B[0m")).toBe(3);
  });

  test("handles mixed content", () => {
    // "Normal Bold Normal" = 6 + 1 + 4 + 1 + 6 = 18 chars
    expect(displayWidth("Normal \x1B[1mBold\x1B[0m Normal")).toBe(18);
  });

  test("returns 0 for empty string", () => {
    expect(displayWidth("")).toBe(0);
  });

  test("returns 0 for only ANSI codes", () => {
    expect(displayWidth("\x1B[31m\x1B[0m")).toBe(0);
  });
});

describe("sanitizeControlChars", () => {
  const ESC = "\x1b";

  test("leaves plain text alone", () => {
    expect(sanitizeControlChars("hello world")).toBe("hello world");
  });

  test("keeps SGR sequences", () => {
    const text = `${ESC}[31mred${ESC}[0m ${ESC}[38;2;0;255;0mgreen${ESC}[0m`;
    expect(sanitizeControlChars(text)).toBe(text);
  });

  test("drops non-SGR CSI sequences", () => {
    expect(sanitizeControlChars(`XXXX${ESC}[2Kerased`)).toBe("XXXXerased");
    expect(sanitizeControlChars(`line2${ESC}[1Aup`)).toBe("line2up");
    expect(sanitizeControlChars(`${ESC}[?25lhidden`)).toBe("hidden");
  });

  test("drops OSC sequences but keeps hyperlink text", () => {
    expect(sanitizeControlChars(`${ESC}]0;TITLE\x07title set`)).toBe(
      "title set",
    );
    expect(
      sanitizeControlChars(
        `${ESC}]8;;https://x.y${ESC}\\link${ESC}]8;;${ESC}\\ text`,
      ),
    ).toBe("link text");
  });

  test("drops other escape sequences", () => {
    expect(sanitizeControlChars(`${ESC}7saved${ESC}8`)).toBe("saved");
    expect(sanitizeControlChars(`${ESC}(Bcharset`)).toBe("charset");
  });

  test("expands tabs to 8-column stops, ignoring SGR width", () => {
    expect(sanitizeControlChars("a\tb")).toBe("a       b");
    expect(sanitizeControlChars("\tat Foo")).toBe("        at Foo");
    expect(sanitizeControlChars(`${ESC}[31mab${ESC}[0m\tc`)).toBe(
      `${ESC}[31mab${ESC}[0m      c`,
    );
  });

  test("applies backspace to the previous character", () => {
    expect(sanitizeControlChars("back\bspace")).toBe("bacspace");
    expect(sanitizeControlChars("\bx")).toBe("x");
  });

  test("strips remaining control characters", () => {
    expect(sanitizeControlChars("bell\x07here")).toBe("bellhere");
    expect(sanitizeControlChars("a\x00b\x7fc\x0bd")).toBe("abcd");
  });
});

describe("wide characters", () => {
  test("displayWidth counts CJK and emoji as two cells", () => {
    expect(displayWidth("漢字")).toBe(4);
    expect(displayWidth("a🚀b")).toBe(4);
    expect(displayWidth("\x1b[31m漢\x1b[0m")).toBe(2);
  });

  test("sliceByDisplayPosition uses cell positions", () => {
    expect(sliceByDisplayPosition("a漢b", 1, 3)).toBe("漢");
    expect(sliceByDisplayPosition("a漢b", 3)).toBe("b");
    expect(sliceByDisplayPosition("🚀x", 2)).toBe("x");
  });

  test("tab stops account for wide characters", () => {
    expect(sanitizeControlChars("漢\tx")).toBe("漢      x");
  });
});
