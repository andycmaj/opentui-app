import { describe, expect, test } from "bun:test";
import {
  dropShadowed,
  filterRelevant,
  formatKey,
  getHelpItems,
  getScopeBindings,
  mergeByCommand,
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

describe("mergeByCommand", () => {
  test("folds keys that share a command into one row, first desc wins", () => {
    const table: KeymapTable = { app: baseAppBindings, list: navBindings() };
    expect(mergeByCommand(getScopeBindings(table, "list")).slice(0, 2)).toEqual(
      [
        { keys: "j/down", desc: "down" },
        { keys: "k/up", desc: "up" },
      ],
    );
    expect(mergeByCommand(getScopeBindings(table, "app"))[0]).toEqual({
      keys: "^p/:",
      desc: "palette",
    });
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

describe("dropShadowed", () => {
  type Ctx = { row: "task" | "idea" };
  const bindings: HelpBinding<Ctx>[] = [
    // Inner pane layer: one key, several commands, each for its own rows.
    {
      cmd: "task.reject",
      keys: "x",
      desc: "not a task",
      relevant: (ctx) => ctx.row === "task",
    },
    {
      cmd: "idea.dismiss",
      keys: "x",
      desc: "dismiss idea",
      relevant: (ctx) => ctx.row === "idea",
    },
    { cmd: "pane.sort", keys: "s", desc: "sort pane" },
    // Outer app layer.
    { cmd: "app.sort", keys: "s", desc: "sort app" },
    { cmd: "app.quit", keys: "q", desc: "quit" },
  ];
  const visible = (ctx: Ctx) =>
    dropShadowed(filterRelevant(bindings, ctx)).map((b) => b.cmd);

  test("lists the binding relevant to this row when an earlier one on the key is not", () => {
    expect(visible({ row: "task" })).toContain("task.reject");
    expect(visible({ row: "task" })).not.toContain("idea.dismiss");
    expect(visible({ row: "idea" })).toContain("idea.dismiss");
    expect(visible({ row: "idea" })).not.toContain("task.reject");
  });

  test("an inner binding still shadows an outer one when both are relevant", () => {
    expect(visible({ row: "task" })).toEqual([
      "task.reject",
      "pane.sort",
      "app.quit",
    ]);
  });
});
