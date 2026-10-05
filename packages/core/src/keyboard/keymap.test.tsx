import { afterEach, describe, expect, test } from "bun:test";
import { Show, type JSX } from "solid-js";
import { testRender } from "@opentui/solid";
import type { InputRenderable, Renderable } from "@opentui/core";
import { ThemeProvider } from "../theme";
import { FocusProvider, useFocus } from "../context/focus";
import { Pane } from "../components/pane";
import { Modal, ModalFilterInput } from "../components/modal";
import { BaseCommands, ModalCommands } from "./commands";
import { KeymapProvider, useKeymap, type AppKeymap } from "./keymap-context";
import {
  baseAppBindings,
  modalNavBindings,
  navBindings,
  type KeymapTable,
} from "./keymap";
import { useScope } from "./use-scope";
import { useHelpItems } from "./use-help-items";
import type { HelpItem } from "./keymap-utils";

interface Ctx {
  editable: boolean;
}

const table: KeymapTable<Ctx> = {
  app: baseAppBindings,
  tree: [
    ...navBindings(),
    { key: "return", cmd: "tree.open", desc: "open", help: "open" },
  ],
  content: [
    ...navBindings(),
    { key: "return", cmd: "content.activate", desc: "activate" },
    {
      key: "e",
      cmd: "content.edit",
      desc: "edit",
      help: "edit",
      relevant: (ctx) => ctx.editable,
    },
  ],
};

// Everything the harness exposes to assertions.
interface Harness {
  log: string[];
  focus: ReturnType<typeof useFocus>;
  keymap: AppKeymap;
  help: () => HelpItem[];
  input: () => InputRenderable | undefined;
}

function TreePane(props: { log: string[] }) {
  let el: Renderable | undefined;
  const { setActivePane } = useFocus();
  useScope(
    "tree",
    {
      [BaseCommands.NAV_DOWN]: () => props.log.push("tree:down"),
      "tree.open": () => {
        props.log.push("tree:open");
        setActivePane("content");
      },
    },
    { target: () => el },
  );
  return (
    <Pane name="tree" variant="sidebar" ref={(r) => (el = r)}>
      <text>tree</text>
    </Pane>
  );
}

function ContentPane(props: { log: string[] }) {
  let el: Renderable | undefined;
  useScope(
    "content",
    {
      [BaseCommands.NAV_DOWN]: () => props.log.push("content:down"),
      "content.activate": () => props.log.push("content:activate"),
      "content.edit": () => props.log.push("content:edit"),
    },
    { target: () => el },
  );
  return (
    <Pane name="content" variant="content" ref={(r) => (el = r)}>
      <text>content</text>
    </Pane>
  );
}

// Whether the modal's space handler acts or declines the key.
let spaceToggles = false;

function Shell(props: { harness: (h: Harness) => void; ctx: () => Ctx }) {
  const log: string[] = [];
  const focus = useFocus();
  const keymap = useKeymap();
  const help = useHelpItems(props.ctx);
  let layout: Renderable | undefined;
  let input: InputRenderable | undefined;

  useScope(
    "app",
    {
      [BaseCommands.APP_QUIT]: () => log.push("quit"),
      [BaseCommands.FOCUS_NEXT]: () => focus.cyclePane(),
      [BaseCommands.PALETTE_OPEN]: () => focus.openModal("palette"),
      [BaseCommands.HELP_OPEN]: () => log.push("help"),
    },
    { target: () => layout },
  );

  props.harness({
    log,
    focus,
    keymap,
    help,
    input: () => input,
  });

  return (
    <box flexDirection="column">
      <box ref={(r: Renderable) => (layout = r)} flexDirection="row">
        <TreePane log={log} />
        <ContentPane log={log} />
      </box>
      <Show when={focus.activeModal() === "palette"}>
        <Modal
          onClose={focus.closeModal}
          bindings={[
            ...modalNavBindings,
            { key: "space", cmd: "modal.toggle", desc: "toggle" },
          ]}
          commands={{
            [ModalCommands.MODAL_SELECT]: () => log.push("modal:select"),
            "modal.toggle": () => {
              if (!spaceToggles) return false;
              log.push("modal:toggle");
              return true;
            },
          }}
        >
          <ModalFilterInput onInput={() => {}} ref={(r) => (input = r)} />
        </Modal>
      </Show>
    </box>
  );
}

let destroy: (() => void) | undefined;
afterEach(() => {
  destroy?.();
  spaceToggles = false;
});

async function setup(ctx: () => Ctx = () => ({ editable: false })) {
  let harness: Harness | undefined;
  const Root = (): JSX.Element => (
    <ThemeProvider>
      <FocusProvider panes={["tree", "content"]}>
        <KeymapProvider keymap={table}>
          <Shell harness={(h) => (harness = h)} ctx={ctx} />
        </KeymapProvider>
      </FocusProvider>
    </ThemeProvider>
  );
  const t = await testRender(Root, { width: 80, height: 20 });
  destroy = () => t.renderer.destroy();
  await t.renderOnce();

  const settle = async () => {
    // Microtasks (focus restore) and the modal input's deferred focus.
    await new Promise((r) => setTimeout(r, 20));
    await t.renderOnce();
  };
  const press = async (
    key: string,
    mods?: { shift?: boolean; ctrl?: boolean },
  ) => {
    t.mockInput.pressKey(key, mods);
    await settle();
  };
  await settle();
  return { h: harness!, t, press, settle };
}

describe("keymap + focus", () => {
  test("initial focus lands on the first pane and its layer is active", async () => {
    const { h, press } = await setup();
    expect(h.focus.state.activePane).toBe("tree");
    await press("j");
    expect(h.log).toEqual(["tree:down"]);
  });

  test("a key that moves focus does not also fire in the newly focused pane", async () => {
    const { h, press } = await setup();
    await press("RETURN");
    expect(h.log).toEqual(["tree:open"]);
    expect(h.focus.state.activePane).toBe("content");
    await press("j");
    expect(h.log).toEqual(["tree:open", "content:down"]);
  });

  test("app bindings apply in every pane; tab cycles real focus", async () => {
    const { h, press } = await setup();
    await press("TAB");
    expect(h.focus.state.activePane).toBe("content");
    await press("q");
    expect(h.log).toEqual(["quit"]);
  });

  test("typing into a modal's filter input never reaches app or pane bindings", async () => {
    const { h, t, press, settle } = await setup();
    await press(":");
    expect(h.focus.activeModal()).toBe("palette");
    await t.mockInput.typeText("qj");
    await settle();
    expect(h.log).toEqual([]);
    expect(h.input()?.value).toBe("qj");
  });

  test("a handler returning false declines the key so the input still gets it", async () => {
    const { h, t, press, settle } = await setup();
    await press(":");
    await t.mockInput.typeText("a b");
    await settle();
    expect(h.input()?.value).toBe("a b");
    expect(h.log).toEqual([]);

    spaceToggles = true;
    await press(" ");
    expect(h.log).toEqual(["modal:toggle"]);
    expect(h.input()?.value).toBe("a b");
  });

  test("the modal's return shadows the pane's return", async () => {
    const { h, press } = await setup();
    await press(":");
    await press("RETURN");
    expect(h.log).toEqual(["modal:select"]);
  });

  test("escape closes the modal and focus returns to the previous pane", async () => {
    const { h, press } = await setup();
    await press("TAB");
    await press(":");
    await press("ESCAPE");
    expect(h.focus.activeModal()).toBe("none");
    expect(h.focus.state.activePane).toBe("content");
    await press("j");
    expect(h.log).toEqual(["content:down"]);
  });

  test("footer hints follow focus and relevance, and survive an open modal", async () => {
    let editable = false;
    const { h, press } = await setup(() => ({ editable }));
    const texts = () => h.help().map((i) => i.text);
    expect(texts()).toContain("open");
    expect(texts()).toContain("help");

    await press("TAB");
    expect(texts()).not.toContain("open");
    expect(texts()).not.toContain("edit");
    editable = true;
    expect(texts()).toContain("edit");

    await press(":");
    expect(texts()).toContain("edit");
  });

  test("a palette can dispatch a pane command against the active pane", async () => {
    const { h, press } = await setup();
    await press("TAB");
    await press(":");
    h.focus.closeModal();
    const result = h.keymap.dispatchCommand("content.edit", {
      focused: h.focus.activePaneTarget(),
    });
    expect(result.ok).toBe(true);
    expect(h.log).toEqual(["content:edit"]);
  });
});
