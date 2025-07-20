import "./index.css";
import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";

initSentry();

createRoot(document.getElementById("root")).render(<App />);
