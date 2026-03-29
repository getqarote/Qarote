import "./styles/index.css";

import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import "./i18n";

import App from "./App.tsx";

const rootElement = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Use hydrateRoot when pre-rendered HTML exists (SSG), otherwise createRoot
if (rootElement.children.length > 0) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
