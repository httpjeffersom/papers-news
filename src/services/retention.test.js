import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultArticleRetentionDays } from "../utils/articleRetention.js";
import {
  loadRetentionDays,
  retentionStorageKey,
  saveRetentionDays,
} from "./retention.js";

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

test("defaults to 30 days without a saved preference", () => {
  withLocalStorage(() => {
    assert.equal(loadRetentionDays(), defaultArticleRetentionDays);
  });
});

test("restores a saved retention period", () => {
  withLocalStorage((values) => {
    values.set(retentionStorageKey, "7");
    assert.equal(loadRetentionDays(), 7);
  });
});

test("ignores invalid saved retention periods", () => {
  withLocalStorage((values) => {
    values.set(retentionStorageKey, "45");
    assert.equal(loadRetentionDays(), defaultArticleRetentionDays);
  });
});

test("persists the chosen retention period", () => {
  withLocalStorage((values) => {
    saveRetentionDays(10);
    assert.equal(values.get(retentionStorageKey), "10");
  });
});
