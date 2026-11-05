// Generates the API reference markdown with TypeDoc, then points its links at
// site routes: TypeDoc links to `<page>.md`, the site serves `<page>/`.

import { $ } from "bun";
import { Glob } from "bun";

const OUT = new URL("../src/content/api/", import.meta.url).pathname;
const API_LINK =
  /\]\((\/[^)#\s]*\/framework\/api\/[^)#\s]*?)(?:\/index)?\.md(#[^)\s]*)?\)/g;

await $`typedoc --logLevel Error`.cwd(new URL("..", import.meta.url).pathname);

let files = 0;
for await (const path of new Glob("**/*.md").scan(OUT)) {
  const file = Bun.file(OUT + path);
  const text = await file.text();
  const rewritten = text.replace(
    API_LINK,
    (_, page: string, hash?: string) => `](${page}/${hash ?? ""})`,
  );
  if (rewritten !== text) await Bun.write(file, rewritten);
  files++;
}
console.log(`api: ${files} pages in src/content/api`);
