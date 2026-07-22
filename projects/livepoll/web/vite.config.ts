import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Built with relative asset paths so the bundle runs from any sub-path on
// GitHub Pages (…/projects/livepoll/app/). Output lands next door in /app,
// which the project page embeds in an <iframe>.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../app",
    emptyOutDir: true,
    target: "es2020",
  },
});
