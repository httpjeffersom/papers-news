// Tamanho do texto: cinco níveis discretos, aplicados como escala no
// elemento raiz. Como os tamanhos da interface usam rem, tudo (títulos,
// corpo e o modo de leitura) acompanha a escolha.
export const fontSizeStorageKey = "papers-news:font-size:v1";

export const fontSizeLevels = [
  { id: "small", label: "Pequeno", scale: 0.9 },
  { id: "default", label: "Padrão", scale: 1 },
  { id: "medium", label: "Médio", scale: 1.1 },
  { id: "large", label: "Grande", scale: 1.2 },
  { id: "larger", label: "Maior", scale: 1.3 },
];

export const defaultFontSizeIndex = 1;

export function normalizeFontSizeIndex(value) {
  if (value === null || value === undefined || value === "") {
    return defaultFontSizeIndex;
  }

  const index = Number(value);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= fontSizeLevels.length
  ) {
    return defaultFontSizeIndex;
  }

  return index;
}

export function fontSizeScale(index) {
  return fontSizeLevels[normalizeFontSizeIndex(index)].scale;
}

export function fontSizeLabel(index) {
  return fontSizeLevels[normalizeFontSizeIndex(index)].label;
}

export function loadFontSize() {
  try {
    const stored = globalThis.localStorage?.getItem(fontSizeStorageKey);
    return normalizeFontSizeIndex(stored);
  } catch {
    return defaultFontSizeIndex;
  }
}

export function saveFontSize(index) {
  try {
    globalThis.localStorage?.setItem(
      fontSizeStorageKey,
      String(normalizeFontSizeIndex(index)),
    );
  } catch {
    // Sem armazenamento disponível: o tamanho ainda vale nesta sessão.
  }
}

export function applyFontSize(index) {
  if (typeof document === "undefined") return;

  const normalized = normalizeFontSizeIndex(index);
  const root = document.documentElement;

  root.style.setProperty("--font-scale", String(fontSizeLevels[normalized].scale));
  root.dataset.fontSize = fontSizeLevels[normalized].id;
}
