import neutralinoConfig from "../neutralino.config.json";

function isPackagedApp() {
  return String(window.location.port) === String(neutralinoConfig.port);
}

// A janela começa oculta (modes.window.hidden) porque o Neutralino pinta o
// fundo com a cor do tema do Windows antes do conteúdo carregar: no modo
// escuro isso aparece como uma tela preta de alguns segundos. A janela só
// aparece quando a interface já está pintada (showWindowWhenPainted) ou
// depois deste limite de segurança, para o app nunca ficar invisível.
const SHOW_FALLBACK_MS = 4000;
const SHOW_DELAY_MS = 400;

function showWindow() {
  // Pequeno atraso: o rAF do React dispara antes de o WebView2 apresentar o
  // quadro na tela. Sem isso, a janela aparece por um instante em branco
  // (preto no tema escuro do Windows) antes do primeiro quadro real.
  setTimeout(() => {
    try {
      window.Neutralino?.window?.show?.();
    } catch {
      // Sem API nativa não há janela oculta para mostrar (modo navegador).
    }
  }, SHOW_DELAY_MS);
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

      // A interface pode já ter pintado (flag de main.jsx) ou ainda vai
      // pintar: registramos o callback e um limite de segurança.
      if (globalThis.__PAPERS_NEWS_PAINTED) {
        showWindow();
      } else {
        globalThis.__PAPERS_NEWS_ON_PAINT = showWindow;
      }
      setTimeout(showWindow, SHOW_FALLBACK_MS);

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
