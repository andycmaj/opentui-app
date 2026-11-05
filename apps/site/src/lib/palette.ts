// Filtering and grouping for the site's command palette, matching core's
// CommandPalette: case-insensitive substring match on label, group, or hint;
// groups render in order of first appearance.

export interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  // Search results carry an excerpt with Pagefind's <mark> highlighting.
  excerptHtml?: string;
}

export interface PaletteSection<T extends PaletteItem = PaletteItem> {
  group?: string;
  items: T[];
}

function matches(item: PaletteItem, q: string): boolean {
  return [item.label, item.group, item.hint].some(
    (field) => field?.toLowerCase().includes(q) ?? false,
  );
}

export function filterSections<T extends PaletteItem>(
  items: readonly T[],
  query: string,
): PaletteSection<T>[] {
  const q = query.trim().toLowerCase();
  const byGroup = new Map<string | undefined, T[]>();
  for (const item of items) {
    if (q && !matches(item, q)) continue;
    const list = byGroup.get(item.group);
    if (list) list.push(item);
    else byGroup.set(item.group, [item]);
  }
  return [...byGroup].map(([group, list]) => ({ group, items: list }));
}

export function flatten<T extends PaletteItem>(
  sections: readonly PaletteSection<T>[],
): T[] {
  return sections.flatMap((s) => s.items);
}

// Selection clamps at both ends rather than wrapping, like useListNavigation.
export function moveSelection(
  current: number,
  delta: number,
  count: number,
): number {
  if (count === 0) return 0;
  return Math.min(count - 1, Math.max(0, current + delta));
}
