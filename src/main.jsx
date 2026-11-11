import React from "react";
import { createRoot } from "react-dom/client";
import "./neutralino.js";
import App from "./App.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import { applyFontSize, loadFontSize } from "./services/fontSize.js";
import { applyLanguage, loadLanguage } from "./services/i18n.js";
import { applyTheme, loadThemePreference } from "./services/theme.js";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/app.css";

// Preferências pequenas ficam no localStorage: aplicar antes da primeira
// pintura evita o piscar de tema/tamanho enquanto o IndexedDB carrega.
applyTheme(loadThemePreference());
applyFontSize(loadFontSize());
applyLanguage(loadLanguage());

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);
