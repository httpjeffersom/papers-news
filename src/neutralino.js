import neutralinoConfig from "../neutralino.config.json";

function isPackagedApp() {
  return String(window.location.port) === String(neutralinoConfig.port);
}

function loadClient() {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "js/neutralino.js";

    script.onload = () => {
      try {
        window.Neutralino.init();
      } catch (error) {
        console.warn("API nativa do Neutralino indisponível:", error);
        resolve(false);
        return;
      }

      resolve(Boolean(window.NL_PORT || window.NL_TOKEN));
    };

    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Carrega o cliente do Neutralino apenas no app empacotado (porta fixa).
 * No navegador a promessa resolve `false` sem gerar requisições extras.
 */
export const neutralinoReady = isPackagedApp()
  ? loadClient()
  : Promise.resolve(false);

globalThis.NL_CLIENT_READY = neutralinoReady;
