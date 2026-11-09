/// <reference types="vitest" />
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5173, host: true },
  build: {
    target: "es2022",
    // The lazy three.js chunk (~300 kB gzipped) is expected; everything else stays far below this.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // The 3D planet is large; keep it in its own chunk so app screens never download it.
        // Only the 3D packages themselves. The object form also pulled shared dependencies
        // (React, its scheduler) into this chunk, so every page preloaded 290 KB of three.js.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](three|@react-three|postprocessing)[\\/]/.test(id)) return "three";
          // React must live outside it, or Rollup hoists it into "three" and the entry imports it.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
