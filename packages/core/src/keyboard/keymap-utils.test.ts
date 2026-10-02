import { describe, expect, test } from "bun:test";
import {
  filterRelevant,
  formatKey,
  getHelpItems,
  getScopeBindings,
  parseKey,
  type HelpBinding,
} from "./keymap-utils";
import { baseAppBindings, navBindings, type KeymapTable } from "./keymap";
import { BaseCommands } from "./commands";

describe("parseKey / formatKey", () => {
  test("parses modifier chords", () => {
    expect(parseKey("ctrl+p")).toEqual({
      name: "p",
      ctrl: true,
      shift: false,
    });
    expect(parseKey("shift+g")).toEqual({
      name: "g",
      ctrl: false,
      shift: true,
    });
  });

  test("prefixes ^ for ctrl and upper-cases for shift", () => {
    expect(formatKey("ctrl+e")).toBe("^e");
    expect(formatKey("shift+g")).toBe("G");
  });

  test("renames special keys and keeps punctuation", () => {
    expect(formatKey("return")).toBe("Enter");
    expect(formatKey("tab")).toBe("Tab");
    expect(formatKey("?")).toBe("?");
    expect(formatKey("+")).toBe("+");
  });
});

describe("getScopeBindings", () => {
  test("formats a scope's table entries for display", () => {
    const table: KeymapTable = { app: baseAppBindings, tree: navBindings() };
    const tree = getScopeBindings(table, "tree");
    expect(tree.map((b) => b.keys)).toContain("G");
    expect(getScopeBindings(table, "missing")).toEqual([]);
  });
});

describe("getHelpItems", () => {
  const binding = (cmd: string, keys: string, help?: string): HelpBinding => ({
    cmd,
    keys,
    desc: cmd,
    help,
  });

  test("keeps only bindings that opt into help, first binding per command", () => {
    const items = getHelpItems([
      binding("a", "a", "alpha"),
      binding("a", "A", "alpha again"),
      binding("b", "b"),
    ]);
    expect(items).toEqual([{ keys: "a", text: "alpha" }]);
  });

  test("folds j/k and g/G into single hints", () => {
    const items = getHelpItems([
      binding(BaseCommands.NAV_DOWN, "j", "move"),
      binding(BaseCommands.NAV_UP, "k", "move"),
      binding(BaseCommands.NAV_TOP, "g", "jump"),
      binding(BaseCommands.NAV_BOTTOM, "G", "jump"),
    ]);
    expect(items.map((i) => i.keys)).toEqual(["j/k", "g/G"]);
  });
});

describe("filterRelevant", () => {
  test("keeps bindings without a predicate and those whose predicate passes", () => {
    const bindings: HelpBinding<{ editable: boolean }>[] = [
      { cmd: "a", keys: "a", desc: "always" },
      { cmd: "e", keys: "e", desc: "edit", relevant: (ctx) => ctx.editable },
    ];
    const keys = (ctx: { editable: boolean }) =>
      filterRelevant(bindings, ctx).map((b) => b.keys);
    expect(keys({ editable: true })).toEqual(["a", "e"]);
    expect(keys({ editable: false })).toEqual(["a"]);
  });
});
