// Aplica tema, tamanho do texto e idioma antes da primeira pintura para evitar
// um flash branco (ou no idioma errado) ao abrir o aplicativo. As chaves são as
// mesmas usadas por theme.js, fontSize.js e i18n.js.
//
// Este arquivo é externo de propósito: a Política de Segurança de Conteúdo do
// aplicativo desktop permite apenas scripts da própria origem. Um <script>
// inline seria bloqueado.
(() => {
  try {
    const stored = localStorage.getItem("papers-news:theme:v1");
    // Valores desconhecidos (ou o antigo "system") caem no tema claro.
    const theme = stored === "dark" ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    // Mesma escala de fontSize.js, aplicada antes da primeira pintura para o
    // texto já aparecer no tamanho escolhido.
    const scales = [0.9, 1, 1.1, 1.2, 1.3];
    const ids = ["small", "default", "medium", "large", "larger"];
    const storedFont = localStorage.getItem("papers-news:font-size:v1");
    const fontIndex = /^[0-4]$/.test(storedFont ?? "") ? Number(storedFont) : 1;
    root.style.setProperty("--font-scale", String(scales[fontIndex]));
    root.dataset.fontSize = ids[fontIndex];

    // Mesma chave de i18n.js: evita a interface começar em português quando o
    // idioma salvo é o inglês.
    const storedLanguage = localStorage.getItem("papers-news:language:v1");
    document.documentElement.lang = storedLanguage === "en" ? "en" : "pt-BR";

    document
      .querySelector('meta[name="theme-color"]')
      .setAttribute("content", theme === "dark" ? "#1f1f1f" : "#f3f3f3");
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
