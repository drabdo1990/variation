import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works when served from a subpath
  // (GitHub Pages project site: /project-management-website/) as well
  // as from a domain root.
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Charting pulls in recharts + d3; splitting it keeps the
        // initial bundle for the non-chart routes small.
        manualChunks(id) {
          if (/node_modules[\\/](recharts|d3-|victory-|internmap)/.test(id)) {
            return "charts";
          }
        },
      },
    },
  },
});
