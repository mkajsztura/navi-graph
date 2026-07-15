import { defineConfig } from "vite";

// Relative base so the built app works from any sub-path
// (GitHub Pages project sites, static file servers, opening dist/index.html, etc.)
export default defineConfig({
  base: "./",
});
