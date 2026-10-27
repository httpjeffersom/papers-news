import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isThemePreference,
  loadThemePreference,
  saveThemePreference,
  themeStorageKey,
} from "./theme.js";

function withLocalStorage(testFn) {
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });

  try {
    testFn(values);
  } finally {
    if (originalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: originalStorage,
      });
    }
  }
}

test("defaults to the light theme", () => {
  withLocalStorage(() => {
    assert.equal(loadThemePreference(), "light");
  });
});

test("restores a saved theme preference", () => {
  withLocalStorage((values) => {
    values.set(themeStorageKey, "dark");
    assert.equal(loadThemePreference(), "dark");
  });
});

test("ignores an unknown stored preference", () => {
  withLocalStorage((values) => {
    values.set(themeStorageKey, "solarized");
    assert.equal(loadThemePreference(), "light");
  });
});

test("falls back to light for the removed system preference", () => {
  withLocalStorage((values) => {
    values.set(themeStorageKey, "system");
    assert.equal(loadThemePreference(), "light");
  });
});

test("persists the chosen preference", () => {
  withLocalStorage((values) => {
    saveThemePreference("light");
    assert.equal(values.get(themeStorageKey), "light");
  });
});

test("accepts only light and dark", () => {
  assert.equal(isThemePreference("light"), true);
  assert.equal(isThemePreference("dark"), true);
  assert.equal(isThemePreference("system"), false);
  assert.equal(isThemePreference(undefined), false);
});
