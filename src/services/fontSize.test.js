import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyFontSize,
  defaultFontSizeIndex,
  fontSizeLabel,
  fontSizeLevels,
  fontSizeScale,
  fontSizeStorageKey,
  loadFontSize,
  normalizeFontSizeIndex,
  saveFontSize,
} from "./fontSize.js";

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

test("offers five text sizes in ascending order", () => {
  assert.equal(fontSizeLevels.length, 5);
  assert.deepEqual(
    fontSizeLevels.map((level) => level.scale),
    [0.9, 1, 1.1, 1.2, 1.3],
  );
});

test("defaults to the standard size", () => {
  withLocalStorage(() => {
    assert.equal(loadFontSize(), defaultFontSizeIndex);
  });
});

test("restores a saved text size", () => {
  withLocalStorage((values) => {
    values.set(fontSizeStorageKey, "3");
    assert.equal(loadFontSize(), 3);
  });
});

test("rejects out-of-range and non-numeric values", () => {
  assert.equal(normalizeFontSizeIndex("9"), defaultFontSizeIndex);
  assert.equal(normalizeFontSizeIndex("-1"), defaultFontSizeIndex);
  assert.equal(normalizeFontSizeIndex("grande"), defaultFontSizeIndex);
  assert.equal(normalizeFontSizeIndex(null), defaultFontSizeIndex);
  assert.equal(normalizeFontSizeIndex("2"), 2);
});

test("persists the chosen size", () => {
  withLocalStorage((values) => {
    saveFontSize(4);
    assert.equal(values.get(fontSizeStorageKey), "4");
  });
});

test("maps indexes to scale and label", () => {
  assert.equal(fontSizeScale(0), 0.9);
  assert.equal(fontSizeScale(4), 1.3);
  assert.equal(fontSizeLabel(2), "Médio");
});

test("applies the scale to the root element", () => {
  const properties = new Map();
  const dataset = {};
  const originalDocument = globalThis.document;

  globalThis.document = {
    documentElement: {
      style: { setProperty: (name, value) => properties.set(name, value) },
      dataset,
    },
  };

  try {
    applyFontSize(3);
    assert.equal(properties.get("--font-scale"), "1.2");
    assert.equal(dataset.fontSize, "large");
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
});
