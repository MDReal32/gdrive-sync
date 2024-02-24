/// <reference types="vitest" />
import { defineConfig } from "vite";
import dtsPlugin from "vite-plugin-dts";

import pkgJson from "./package.json";

const nodeExternals = ["assert", "path", "fs", "os", "util", "url"];

export default defineConfig({
  build: {
    outDir: "build",
    emptyOutDir: true,
    lib: {
      name: "gdrive",
      entry: "src/main.ts",
      formats: ["es", "cjs"],
      fileName: format => `gdrive.${format}.js`
    },
    rollupOptions: {
      external: [
        /^node:/,
        ...nodeExternals,
        ...Object.keys(pkgJson.dependencies || {}),
        ...Object.keys(pkgJson.devDependencies || {})
      ]
    }
  },
  plugins: [dtsPlugin({ staticImport: true, insertTypesEntry: true })],
  test: {}
});
