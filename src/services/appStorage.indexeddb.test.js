import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearAppStateAsync,
  closeAppDatabase,
  databaseName,
  loadAppStateAsync,
  saveAppStateAsync,
  storageKey,
} from "./appStorage.js";

function withLocalStorage(testFn) {
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });

  return Promise.resolve(testFn(values)).finally(() => {
    if (originalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: originalStorage,
      });
    }
  });
}

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

async function resetDatabase() {
  await closeAppDatabase();
  await deleteDatabase();
}

function sampleState() {
  return {
    sources: [
      {
        id: "source-1",
        name: "News",
        url: "https://example.com",
        feedUrl: "https://example.com/feed.xml",
        isDemo: false,
      },
    ],
    articles: [
      {
        id: "article-1",
        sourceId: "source-1",
        sourceName: "News",
        sourceInitials: "NE",
        title: "Title",
        summary: "Summary",
        publishedAt: "2026-01-01T00:00:00.000Z",
        url: "https://example.com/article",
        image: "https://example.com/image.jpg",
        content: "<p>Content</p>",
        isDemo: false,
      },
    ],
    savedIds: ["article-1"],
  };
}

test("migra os dados do localStorage para o IndexedDB e remove a cópia antiga", async () => {
  await resetDatabase();

  await withLocalStorage(async (values) => {
    const legacy = sampleState();
    values.set(storageKey, JSON.stringify({ version: 1, ...legacy }));

    assert.deepEqual(await loadAppStateAsync(), legacy);
    assert.equal(values.has(storageKey), false);
  });

  // A segunda abertura lê do IndexedDB, mesmo sem o localStorage.
  assert.deepEqual(await loadAppStateAsync(), sampleState());
});

test("grava e restaura fontes, publicações e favoritos", async () => {
  await resetDatabase();

  await withLocalStorage(async () => {
    const state = sampleState();
    await saveAppStateAsync(state);

    assert.deepEqual(await loadAppStateAsync(), state);
  });
});

test("grava apenas os favoritos quando o restante não muda", async () => {
  await resetDatabase();

  await withLocalStorage(async () => {
    const state = sampleState();
    await saveAppStateAsync(state);

    const next = { ...state, savedIds: [] };
    await saveAppStateAsync(next, state);

    assert.deepEqual(await loadAppStateAsync(), next);
  });
});

test("mantém um estado vazio salvo em vez de voltar ao conteúdo de demonstração", async () => {
  await resetDatabase();

  await withLocalStorage(async () => {
    const empty = { sources: [], articles: [], savedIds: [] };
    await saveAppStateAsync(empty);

    assert.deepEqual(await loadAppStateAsync(), empty);
  });
});

test("ignora registros inválidos encontrados no banco", async () => {
  await resetDatabase();

  await withLocalStorage(async () => {
    await clearAppStateAsync();
    await saveAppStateAsync({
      ...sampleState(),
      articles: [
        ...sampleState().articles,
        { id: "broken", title: 42 },
      ],
    });

    const loaded = await loadAppStateAsync();
    assert.equal(loaded.articles.length, 1);
    assert.equal(loaded.articles[0].id, "article-1");
  });
});

test("usa o localStorage quando o IndexedDB não está disponível", async () => {
  await resetDatabase();

  const originalIndexedDb = Object.getOwnPropertyDescriptor(
    globalThis,
    "indexedDB",
  );

  await withLocalStorage(async (values) => {
    const legacy = sampleState();
    values.set(storageKey, JSON.stringify({ version: 1, ...legacy }));

    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: undefined,
    });

    try {
      assert.deepEqual(await loadAppStateAsync(), legacy);

      const changed = { ...legacy, savedIds: [] };
      await saveAppStateAsync(changed);

      assert.deepEqual(JSON.parse(values.get(storageKey)), {
        version: 1,
        ...changed,
      });
    } finally {
      Object.defineProperty(globalThis, "indexedDB", originalIndexedDb);
    }
  });
});
