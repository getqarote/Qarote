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
    // CRITICAL: Prevents duplicate React instances which can cause production errors
    // like "Cannot read properties of null (reading 'useEffect')"
    // Never remove this - it ensures a single React instance across all dependencies
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // CRITICAL: React must be in its own chunk to prevent bundling issues
          // This ensures React is properly resolved and prevents production errors
          "vendor-react": ["react", "react-dom", "react-router"],
          // UI components chunk
          "vendor-ui": ["@radix-ui/react-label", "@radix-ui/react-slot"],
          // Data fetching and state management
          "vendor-data": ["@tanstack/react-query"],
          // Icons
          "vendor-icons": ["lucide-react"],
          // Form and validation
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Date and time utilities
          "vendor-utils": [
            "clsx",
            "class-variance-authority",
            "tailwind-merge",
          ],
        },
      },
    },
    // Ensure React is properly bundled
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
} satisfies UserConfig);
