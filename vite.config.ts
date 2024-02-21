/// <reference types="vitest" />
import { defineConfig } from "vite";
import dtsPlugin from "vite-plugin-dts";

export default defineConfig({
  build: {
    outDir: "build",
    emptyOutDir: true,
    lib: {
      name: "node-template",
      entry: "src/main.ts",
      formats: ["es", "cjs"],
      fileName: format => `node-template.${format}.js`
    }
  },
  plugins: [dtsPlugin({ staticImport: true, insertTypesEntry: true })],
  test: {}
});
