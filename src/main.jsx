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

// A janela do app empacotado começa oculta (modes.window.hidden) e aparece
// aqui, depois do primeiro quadro da interface, evitando a tela preta/branca
// do Neutralino enquanto o WebView carrega. Dois rAF garantem que o quadro
// já foi composto e pintado. O fallback de segurança fica em neutralino.js.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    globalThis.__PAPERS_NEWS_PAINTED = true;
    const onPaint = globalThis.__PAPERS_NEWS_ON_PAINT;
    if (typeof onPaint === "function") {
      globalThis.__PAPERS_NEWS_ON_PAINT = undefined;
      onPaint();
    }
  });
});
