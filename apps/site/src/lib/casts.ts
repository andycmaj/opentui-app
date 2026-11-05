// Recorded demos live in public/casts/<id>.cast; pages show a recording only
// when one has been made.

import { existsSync } from "node:fs";
import { join } from "node:path";

export function castUrl(id: string): string | undefined {
  // Astro builds run from apps/site, where public/ lives.
  if (!existsSync(join(process.cwd(), "public", "casts", `${id}.cast`)))
    return undefined;
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/casts/${id}.cast`;
}
