import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  defaultLanguage,
  getActiveLanguage,
  isLanguage,
  languageStorageKey,
  loadLanguage,
  normalizeLanguage,
  saveLanguage,
  setActiveLanguage,
  t,
  translate,
} from "./i18n.js";

const originalLocalStorage = globalThis.localStorage;

function installStorage(initial = {}) {
  const data = new Map(Object.entries(initial));

  globalThis.localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };

  return data;
}

beforeEach(() => {
  setActiveLanguage(defaultLanguage);
});

afterEach(() => {
  if (originalLocalStorage === undefined) {
    delete globalThis.localStorage;
  } else {
    globalThis.localStorage = originalLocalStorage;
  }
  setActiveLanguage(defaultLanguage);
});

test("defaults to English and accepts only known languages", () => {
  assert.equal(defaultLanguage, "en");
  assert.equal(loadLanguage(), "en");
  assert.equal(normalizeLanguage("fr"), "en");
  assert.equal(normalizeLanguage("pt-BR"), "pt-BR");
  assert.equal(isLanguage("pt-BR"), true);
  assert.equal(isLanguage("es"), true);
  assert.equal(isLanguage("fr"), false);
});

test("restores and persists the saved language", () => {
  const data = installStorage({ [languageStorageKey]: "pt-BR" });

  assert.equal(loadLanguage(), "pt-BR");

  saveLanguage("en");
  assert.equal(data.get(languageStorageKey), "en");

  saveLanguage("xx");
  assert.equal(data.get(languageStorageKey), "en");
});

test("translates the interface and falls back to Portuguese", () => {
  assert.equal(translate("pt-BR", "item.read"), "Ler aqui");
  assert.equal(translate("en", "item.read"), "Read here");
  assert.equal(translate("en", "nav.settings"), "Settings");
  assert.equal(translate("es", "item.read"), "Leer aquí");
  assert.equal(translate("es", "nav.settings"), "Ajustes");

  // Chave inexistente em qualquer idioma volta como a própria chave.
  assert.equal(translate("en", "chave.inexistente"), "chave.inexistente");
});

test("pluralizes counts in all languages", () => {
  assert.equal(translate("pt-BR", "feed.count", { count: 1 }), "1 publicação");
  assert.equal(translate("pt-BR", "feed.count", { count: 3 }), "3 publicações");
  assert.equal(translate("en", "feed.count", { count: 1 }), "1 story");
  assert.equal(translate("en", "feed.count", { count: 3 }), "3 stories");
  assert.equal(translate("en", "app.moreSources", { count: 2 }), "and 2 more sources");
  assert.equal(translate("es", "feed.count", { count: 1 }), "1 publicación");
  assert.equal(translate("es", "feed.count", { count: 3 }), "3 publicaciones");
  assert.equal(translate("es", "app.moreSources", { count: 2 }), "y 2 fuentes más");
});

test("replaces variables in plain strings", () => {
  assert.equal(
    translate("en", "sources.feedLabel", { url: "https://site.example/feed/" }),
    "Feed: https://site.example/feed/",
  );
  assert.equal(
    translate("pt-BR", "settings.retentionHint", { days: 1 }),
    "As notícias são apagadas depois de 1 dia. Favoritos ficam guardados para sempre.",
  );
});

test("uses the active language outside React components", () => {
  setActiveLanguage("en");
  assert.equal(getActiveLanguage(), "en");
  assert.equal(t("item.read"), "Read here");

  setActiveLanguage("pt-BR");
  assert.equal(t("item.read"), "Ler aqui");
});
