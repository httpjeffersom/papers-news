import React from "react";
import { createRoot } from "react-dom/client";
import "./neutralino.js";
import App from "./App.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);
