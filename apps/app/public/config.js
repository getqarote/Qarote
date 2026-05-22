// Runtime configuration for Qarote.
//
// Resolution: build-time `import.meta.env.VITE_*` wins, then this file
// is read at runtime via `window.__QAROTE_CONFIG__`. See
// `apps/app/src/lib/runtimeConfig.ts` for the accessor helpers.
//
// This static version ships with the SPA build and exposes safe defaults.
// Two deployments overwrite it at runtime:
//   - Production binary: backend serves this path dynamically with real values.
//   - EE Docker image: nginx entrypoint regenerates this file from env vars
//     (docker/nginx/docker-entrypoint.d/10-runtime-config.sh).
window.__QAROTE_CONFIG__ = {
  apiUrl: "",
  portalUrl: "",
  demoMode: "",
  deploymentMode: "",
};
