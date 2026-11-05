// Full-text search over the built site with Pagefind. The index is produced by
// `pagefind --site dist` after `astro build`, so it is absent under `astro dev`.

import { createSignal, onMount, type JSX } from "solid-js";
import type { PaletteItem, PaletteSection } from "../lib/palette";
import { ListModal } from "./list-modal";

// The slice of Pagefind's browser API this uses (pagefind.js ships no types).
interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: { title?: string };
}
interface PagefindSearch {
  results: { id: string; data: () => Promise<PagefindResultData> }[];
}
interface Pagefind {
  options: (opts: { baseUrl: string }) => Promise<void>;
  debouncedSearch: (
    query: string,
    opts?: object,
    ms?: number,
  ) => Promise<PagefindSearch | null>;
}

interface SearchItem extends PaletteItem {
  href: string;
}

const MAX_RESULTS = 8;

type Status = "loading" | "ready" | "unavailable";

async function loadPagefind(base: string): Promise<Pagefind> {
  const url = `${base}/pagefind/pagefind.js`;
  const mod: Pagefind = await import(/* @vite-ignore */ url);
  await mod.options({ baseUrl: `${base}/` });
  return mod;
}

export function SearchModal(props: {
  base: string;
  onClose: () => void;
}): JSX.Element {
  const [status, setStatus] = createSignal<Status>("loading");
  const [query, setQuery] = createSignal("");
  const [sections, setSections] = createSignal<PaletteSection<SearchItem>[]>(
    [],
  );
  let pagefind: Pagefind | undefined;

  onMount(async () => {
    try {
      pagefind = await loadPagefind(props.base);
      setStatus("ready");
      if (query()) void runSearch(query());
    } catch {
      setStatus("unavailable");
    }
  });

  async function runSearch(q: string): Promise<void> {
    if (!pagefind) return;
    if (!q.trim()) {
      setSections([]);
      return;
    }
    const search = await pagefind.debouncedSearch(q, {}, 120);
    // null means a newer keystroke superseded this search.
    if (!search) return;
    const data = await Promise.all(
      search.results.slice(0, MAX_RESULTS).map((r) => r.data()),
    );
    if (q !== query()) return;
    setSections([
      {
        items: data.map((d) => ({
          id: d.url,
          label: d.meta.title ?? d.url,
          excerptHtml: d.excerpt,
          href: d.url,
        })),
      },
    ]);
  }

  const emptyText = (): string => {
    if (status() === "unavailable")
      return "Search index not built (run the site build).";
    if (status() === "loading") return "Loading search index...";
    return query().trim()
      ? "No matching pages"
      : "Type to search the docs and apps";
  };

  return (
    <ListModal
      title="Search"
      hint="↵ open · esc"
      placeholder="Search..."
      sections={sections()}
      emptyText={emptyText()}
      onQuery={(q) => {
        setQuery(q);
        void runSearch(q);
      }}
      onSelect={(item) => {
        window.location.href = item.href;
      }}
      onClose={props.onClose}
    />
  );
}
