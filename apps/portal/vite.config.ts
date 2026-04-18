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
        // Rollup 4+ requires manualChunks to be a function, not an object.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router/")
          )
            return "vendor-react";
          if (
            id.includes("/@radix-ui/react-label/") ||
            id.includes("/@radix-ui/react-slot/")
          )
            return "vendor-ui";
          if (id.includes("/@tanstack/react-query/")) return "vendor-data";
          if (id.includes("/lucide-react/")) return "vendor-icons";
          if (
            id.includes("/react-hook-form/") ||
            id.includes("/@hookform/resolvers/") ||
            id.includes("/zod/")
          )
            return "vendor-forms";
          if (
            id.includes("/i18next/") ||
            id.includes("/react-i18next/") ||
            id.includes("/i18next-http-backend/") ||
            id.includes("/i18next-browser-languagedetector/")
          )
            return "vendor-i18n";
          if (
            id.includes("/clsx/") ||
            id.includes("/class-variance-authority/") ||
            id.includes("/tailwind-merge/")
          )
            return "vendor-utils";
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
