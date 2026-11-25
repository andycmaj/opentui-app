import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import solid from "@astrojs/solid-js";

// GitHub Pages project site: served from /opentui-app/.
export default defineConfig({
  site: "https://andycmaj.github.io",
  base: "/opentui-app",
  trailingSlash: "ignore",
  integrations: [mdx(), solid()],
  markdown: {
    // Token colors come from CSS variables (styles/code.css), so code blocks
    // follow the site theme like everything else.
    shikiConfig: { theme: "css-variables" },
  },
});
