import path from "node:path";

import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI components chunk
          "vendor-ui": ["@radix-ui/react-slot"],
          // Data fetching and state management
          "vendor-data": ["@tanstack/react-query"],
          // Icons
          "vendor-icons": ["lucide-react"],
          // Date and time utilities
          "vendor-utils": [
            "date-fns",
            "clsx",
            "class-variance-authority",
            "tailwind-merge",
          ],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
} satisfies UserConfig);
