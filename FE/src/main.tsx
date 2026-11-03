import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";

import "./App.css";
import App from "./App";
import "./styles/FirstGreenRestoration.css";

createRoot(
    document.getElementById("root")!
).render(
    <StrictMode>
        <App />
    </StrictMode>
);
