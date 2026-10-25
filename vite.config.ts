import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/** Short commit hash of the build; CI exposes it as GITHUB_SHA, locally ask git. */
function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  plugins: [react()],
  // Relative asset paths: the same build works at a GitHub Pages project
  // URL (/caelum-viewer/), a custom domain root, or any static host.
  base: "./",
  // Shown in the About dialog.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  test: { environment: "jsdom" },
});
