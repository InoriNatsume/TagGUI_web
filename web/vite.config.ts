import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [svelte()],
  base: "/TagGUI_web/",
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
    },
  },
});
