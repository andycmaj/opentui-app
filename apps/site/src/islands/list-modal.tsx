// The filterable list shared by the command palette and search: a filter
// input, grouped rows, and a selection driven by ↑/↓ or ctrl+j/ctrl+k (as in
// core's modalNavBindings) with ↵ to run.

import {
  createEffect,
  createSignal,
  For,
  on,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import {
  flatten,
  moveSelection,
  type PaletteItem,
  type PaletteSection,
} from "../lib/palette";
import { Modal, ModalHeader } from "./modal";

interface ListModalProps<T extends PaletteItem> {
  title: string;
  hint?: string;
  placeholder: string;
  sections: PaletteSection<T>[];
  // Shown instead of the list when there are no rows.
  emptyText: string;
  onQuery: (query: string) => void;
  onSelect: (item: T) => void;
  onClose: () => void;
}

let instance = 0;

export function ListModal<T extends PaletteItem>(
  props: ListModalProps<T>,
): JSX.Element {
  const id = `list-modal-${++instance}`;
  const [selected, setSelected] = createSignal(0);
  const flat = (): T[] => flatten(props.sections);
  let input: HTMLInputElement | undefined;
  let list: HTMLDivElement | undefined;

  onMount(() => input?.focus());

  // A new result set starts the selection over at the top.
  createEffect(
    on(
      () => props.sections,
      () => setSelected(0),
      { defer: true },
    ),
  );

  createEffect(() => {
    const row = list?.querySelector(`#${id}-opt-${selected()}`);
    row?.scrollIntoView({ block: "nearest" });
  });

  function move(delta: number): void {
    setSelected((i) => moveSelection(i, delta, flat().length));
  }

  function run(): void {
    const item = flat()[selected()];
    if (item) props.onSelect(item);
  }

  function onKeyDown(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
    if (e.key === "ArrowDown" || (ctrl && e.key === "j")) move(1);
    else if (e.key === "ArrowUp" || (ctrl && e.key === "k")) move(-1);
    else if (e.key === "Enter") run();
    else return;
    e.preventDefault();
  }

  // Rows are numbered across sections so ids and selection follow display order.
  const offsets = (): number[] => {
    let seen = 0;
    return props.sections.map((s) => {
      const start = seen;
      seen += s.items.length;
      return start;
    });
  };

  return (
    <Modal label={props.title} onClose={props.onClose}>
      <ModalHeader title={props.title} hint={props.hint ?? "↵ run · esc"} />
      <div class="overlay-filter">
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={
            flat().length > 0 ? `${id}-opt-${selected()}` : undefined
          }
          autocomplete="off"
          spellcheck={false}
          placeholder={props.placeholder}
          onInput={(e) => props.onQuery(e.currentTarget.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <div class="overlay-list" id={`${id}-list`} role="listbox" ref={list}>
        <Show
          when={flat().length > 0}
          fallback={<p class="muted overlay-empty">{props.emptyText}</p>}
        >
          <For each={props.sections}>
            {(section, sectionIndex) => (
              <div role="group" aria-label={section.group}>
                <Show when={section.group}>
                  <div class="overlay-group">{section.group}</div>
                </Show>
                <For each={section.items}>
                  {(item, i) => {
                    const index = (): number =>
                      (offsets()[sectionIndex()] ?? 0) + i();
                    return (
                      <div
                        id={`${id}-opt-${index()}`}
                        role="option"
                        aria-selected={index() === selected()}
                        class="overlay-row"
                        classList={{
                          indented: props.sections.some(
                            (s) => s.group !== undefined,
                          ),
                        }}
                        onMouseMove={() => setSelected(index())}
                        onClick={() => props.onSelect(item)}
                      >
                        <span class="overlay-row-main">
                          <span class="overlay-label">{item.label}</span>
                          <Show when={item.hint}>
                            <span class="overlay-hint">{item.hint}</span>
                          </Show>
                        </span>
                        <Show when={item.excerptHtml}>
                          {/* Pagefind escapes page text and adds only <mark>. */}
                          <span
                            class="overlay-excerpt"
                            innerHTML={item.excerptHtml}
                          />
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            )}
          </For>
        </Show>
      </div>
    </Modal>
  );
}
