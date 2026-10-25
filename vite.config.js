import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const assetsDirectory = fileURLToPath(new URL("./resources/assets", import.meta.url));

function cleanStaleAssets() {
  return {
    name: "clean-stale-assets",
    apply: "build",
    buildStart() {
      // emptyOutDir precisa ficar desativado para preservar resources/js/neutralino.js.
      // Removemos apenas os assets com hash antigos antes de cada build.
      rmSync(assetsDirectory, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), cleanStaleAssets()],
  build: {
    outDir: "resources",
    emptyOutDir: false,
  },
});
