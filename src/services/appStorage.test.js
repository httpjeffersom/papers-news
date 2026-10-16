import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAppState, saveAppState } from "./appStorage.js";

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
    testFn();
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

test("persists and restores sources, articles, and favorites", () => {
  withLocalStorage(() => {
    const state = {
      sources: [{ id: "source-1", name: "News", url: "https://example.com", isDemo: false }],
      articles: [{
        id: "article-1",
        sourceId: "source-1",
        sourceName: "News",
        title: "Title",
        summary: "Summary",
        publishedAt: "2026-01-01T00:00:00.000Z",
        url: "https://example.com/article",
        isDemo: false,
      }],
      savedIds: ["article-1"],
    };

    saveAppState(state);

    assert.deepEqual(loadAppState(), state);
  });
});

test("ignores malformed saved data and reports the error", () => {
  withLocalStorage(() => {
    const originalError = console.error;
    let loggedError = false;
    console.error = () => {
      loggedError = true;
    };

    try {
      globalThis.localStorage.setItem("papers-news:state:v1", "{invalid");
      assert.equal(loadAppState(), null);
      assert.equal(loggedError, true);
    } finally {
      console.error = originalError;
    }
  });
});
