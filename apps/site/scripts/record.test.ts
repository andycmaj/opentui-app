import { describe, expect, test } from "bun:test";
import { encodeKey, parseKeyScript } from "./record";

describe("encodeKey", () => {
  test("characters, named keys, and modifiers", () => {
    expect(encodeKey("j")).toBe("j");
    expect(encodeKey("+")).toBe("+");
    expect(encodeKey("tab")).toBe("\t");
    expect(encodeKey("Enter")).toBe("\r");
    expect(encodeKey("down")).toBe("\x1b[B");
    expect(encodeKey("ctrl+p")).toBe("\x10");
    expect(encodeKey("ctrl+]")).toBe("\x1d");
    expect(encodeKey("shift+g")).toBe("G");
  });

  test("unknown names throw", () => {
    expect(() => encodeKey("hyper")).toThrow();
  });
});

describe("parseKeyScript", () => {
  test("keys, text, waits, and comments", () => {
    const steps = parseKeyScript(`
      # intro
      key j j   # two downs
      type hello world
      wait 500
    `);
    expect(steps).toEqual([
      { kind: "send", data: "j" },
      { kind: "send", data: "j" },
      { kind: "send", data: "hello world" },
      { kind: "wait", ms: 500 },
    ]);
  });

  test("bad lines name the line number", () => {
    expect(() => parseKeyScript("key j\nfrobnicate")).toThrow(/line 2/);
  });
});
