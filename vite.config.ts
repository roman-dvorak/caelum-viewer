import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths: the same build works at a GitHub Pages project
  // URL (/caelum-viewer/), a custom domain root, or any static host.
  base: "./",
  test: { environment: "jsdom" },
});
