import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: "compile",
  }),
  integrations: [preact({ compat: false })],
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://theagentsees.com",
});
