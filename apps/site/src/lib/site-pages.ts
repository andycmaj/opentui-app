// Pages offered by the command palette, built at render time from the content
// collections and passed to the island as plain data.

import type { PaletteItem } from "./palette";

export interface PageItem extends PaletteItem {
  href: string;
}

export interface PageSources {
  apps: { id: string; data: { name: string; status: string } }[];
  docs: { id: string; data: { title: string } }[];
  api: { id: string }[];
}

const API_KINDS: Record<string, string> = {
  classes: "class",
  functions: "function",
  interfaces: "interface",
  "type-aliases": "type",
  variables: "const",
};

export function docPath(id: string): string {
  return id === "index" ? "/framework/" : `/framework/${id}/`;
}

export function apiPath(id: string): string {
  return id === "index" ? "/framework/api/" : `/framework/api/${id}/`;
}

export function sitePages(base: string, sources: PageSources): PageItem[] {
  const item = (
    id: string,
    label: string,
    path: string,
    group: string,
    hint?: string,
  ): PageItem => ({
    id,
    label,
    hint,
    group,
    href: `${base}${path}`,
  });
  return [
    item("page:home", "home", "/", "pages"),
    ...sources.apps.map((app) =>
      item(
        `app:${app.id}`,
        app.data.name,
        `/apps/${app.id}/`,
        "pages",
        app.data.status === "beta" ? "app · beta" : "app",
      ),
    ),
    ...sources.docs.map((doc) =>
      item(`doc:${doc.id}`, doc.data.title, docPath(doc.id), "pages", "docs"),
    ),
    item("page:api", "api reference", "/framework/api/", "pages", "docs"),
    item("page:changelog", "changelog", "/changelog/", "pages"),
    ...sources.api
      .filter((entry) => entry.id !== "index")
      .map((entry) => {
        const [kind = "", name = entry.id] = entry.id.split("/");
        return item(
          `api:${entry.id}`,
          name,
          apiPath(entry.id),
          "api",
          API_KINDS[kind] ?? kind,
        );
      }),
  ];
}
