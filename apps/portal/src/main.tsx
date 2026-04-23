import "./styles/index.css";

import { createRoot } from "react-dom/client";

import "./i18n";

import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(<App />);
