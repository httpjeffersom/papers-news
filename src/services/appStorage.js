// Persistência do Papers News.
//
// Fontes, publicações e favoritos vivem no IndexedDB, que tem cota dinâmica
// (normalmente uma fração do disco) em vez do teto de ~10 MB do localStorage.
// As preferências pequenas (tema, tamanho do texto, idioma e retenção) continuam
// no localStorage para serem lidas de forma síncrona antes da primeira pintura.

export const storageKey = "papers-news:state:v1";
export const databaseName = "papers-news";
export const databaseVersion = 1;

const storeNames = {
  articles: "articles",
  sources: "sources",
  meta: "meta",
};

const metaKeys = {
  initialized: "initialized",
  savedIds: "savedIds",
  migratedFrom: "migratedFrom",
  migratedAt: "migratedAt",
};

let databasePromise = null;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStoredSource(source) {
  return (
    isRecord(source) &&
    typeof source.id === "string" &&
    typeof source.name === "string" &&
    typeof source.url === "string" &&
    typeof source.isDemo === "boolean" &&
    (source.feedUrl === undefined || typeof source.feedUrl === "string")
  );
}

function isStoredArticle(article) {
  return (
    isRecord(article) &&
    typeof article.id === "string" &&
    typeof article.sourceId === "string" &&
    typeof article.sourceName === "string" &&
    typeof article.title === "string" &&
    typeof article.summary === "string" &&
    typeof article.publishedAt === "string" &&
    typeof article.url === "string" &&
    (article.sourceInitials === undefined || typeof article.sourceInitials === "string") &&
    (article.image === undefined || typeof article.image === "string") &&
    (article.content === undefined || typeof article.content === "string") &&
    typeof article.isDemo === "boolean"
  );
}

function normalizeStoredState(state) {
  if (!isRecord(state)) return null;

  const sources = Array.isArray(state.sources)
    ? state.sources.filter(isStoredSource)
    : [];
  const articles = Array.isArray(state.articles)
    ? state.articles.filter(isStoredArticle)
    : [];
  const savedIds = Array.isArray(state.savedIds)
    ? state.savedIds.filter((id) => typeof id === "string")
    : [];

  return { sources, articles, savedIds };
}

// ---------------------------------------------------------------------------
// Leitura e gravação legadas (localStorage). Servem de fallback quando o
// IndexedDB não está disponível e de origem para a migração automática.

export function loadAppState() {
  try {
    const serialized = globalThis.localStorage?.getItem(storageKey);
    if (!serialized) return null;

    const state = JSON.parse(serialized);
    if (
      !isRecord(state) ||
      state.version !== 1 ||
      !Array.isArray(state.sources) ||
      !state.sources.every(isStoredSource) ||
      !Array.isArray(state.articles) ||
      !state.articles.every(isStoredArticle) ||
      !Array.isArray(state.savedIds) ||
      !state.savedIds.every((id) => typeof id === "string")
    ) {
      throw new Error("Os dados salvos do Papers News estão em formato inválido.");
    }

    return {
      sources: state.sources,
      articles: state.articles,
      savedIds: state.savedIds,
    };
  } catch (error) {
    console.error("Não foi possível carregar os dados salvos:", error);
    return null;
  }
}

export function saveAppState({ sources, articles, savedIds }) {
  if (!globalThis.localStorage) {
    throw new Error("O armazenamento local não está disponível.");
  }

  globalThis.localStorage.setItem(
    storageKey,
    JSON.stringify({ version: 1, sources, articles, savedIds }),
  );
}

function removeLegacyAppState() {
  try {
    globalThis.localStorage?.removeItem?.(storageKey);
  } catch {
    // Sem problema: a cópia antiga apenas ocupa espaço até a próxima limpeza.
  }
}

function uniqueByKey(records, key) {
  const unique = new Map();
  for (const record of records) unique.set(record[key], record);
  return [...unique.values()];
}

// ---------------------------------------------------------------------------
// IndexedDB

function openDatabase() {
  return new Promise((resolve, reject) => {
    const factory = globalThis.indexedDB;
    if (!factory) {
      const error = new Error("O IndexedDB não está disponível neste ambiente.");
      error.databaseUnavailable = true;
      reject(error);
      return;
    }

    let request;
    try {
      request = factory.open(databaseName, databaseVersion);
    } catch (error) {
      error.databaseUnavailable = true;
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(storeNames.articles)) {
        const articles = database.createObjectStore(storeNames.articles, {
          keyPath: "id",
        });
        articles.createIndex("publishedAt", "publishedAt");
        articles.createIndex("sourceId", "sourceId");
      }

      if (!database.objectStoreNames.contains(storeNames.sources)) {
        database.createObjectStore(storeNames.sources, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(storeNames.meta)) {
        database.createObjectStore(storeNames.meta);
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();

      // Pede ao navegador que preserve os dados locais em vez de descartá-los
      // sob pressão de espaço. É uma dica; o IndexedDB continua funcionando
      // quando o pedido é negado.
      try {
        globalThis.navigator?.storage?.persist?.().catch(() => {});
      } catch {
        // Sem a API de persistência: segue com o comportamento padrão.
      }

      resolve(database);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Não foi possível abrir o IndexedDB."));
    };

    request.onblocked = () => {
      reject(new Error("O banco de dados está bloqueado por outra janela."));
    };
  });
}

function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error) => {
      // Permite tentar novamente em uma próxima chamada (por exemplo, se o
      // usuário fechar a outra janela que bloqueava o banco).
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

/** Fecha a conexão em cache. Útil para testar e para liberar o banco. */
export function closeAppDatabase() {
  if (!databasePromise) return Promise.resolve();

  const pending = databasePromise;
  databasePromise = null;

  return pending
    .then((database) => database.close())
    .catch(() => {});
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("A gravação no IndexedDB foi cancelada."));
  });
}

async function readMetaValue(database, key) {
  const transaction = database.transaction(storeNames.meta, "readonly");
  const done = transactionDone(transaction);
  const value = await requestResult(transaction.objectStore(storeNames.meta).get(key));
  await done;
  return value;
}

async function readStoredState(database) {
  const transaction = database.transaction(
    [storeNames.articles, storeNames.sources, storeNames.meta],
    "readonly",
  );
  const done = transactionDone(transaction);

  const articlesRequest = transaction.objectStore(storeNames.articles).getAll();
  const sourcesRequest = transaction.objectStore(storeNames.sources).getAll();
  const savedIdsRequest = transaction
    .objectStore(storeNames.meta)
    .get(metaKeys.savedIds);

  const [articles, sources, savedIds] = await Promise.all([
    requestResult(articlesRequest),
    requestResult(sourcesRequest),
    requestResult(savedIdsRequest),
  ]);

  await done;

  return normalizeStoredState({ sources, articles, savedIds }) ?? {
    sources: [],
    articles: [],
    savedIds: [],
  };
}

function replaceStore(store, records) {
  store.clear();
  for (const record of records) store.put(record);
}

function setMetaValue(database, key, value) {
  const transaction = database.transaction(storeNames.meta, "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(storeNames.meta).put(value, key);
  return done;
}

async function markInitialized(database, extraMeta = {}) {
  const transaction = database.transaction(storeNames.meta, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(storeNames.meta);

  store.put(true, metaKeys.initialized);
  for (const [key, value] of Object.entries(extraMeta)) store.put(value, key);

  await done;
}

async function writeStoredState(database, state, previousState) {
  const sourcesChanged = !previousState || state.sources !== previousState.sources;
  const articlesChanged = !previousState || state.articles !== previousState.articles;
  const savedIdsChanged = !previousState || state.savedIds !== previousState.savedIds;

  if (!sourcesChanged && !articlesChanged && !savedIdsChanged) return;

  const transaction = database.transaction(
    [storeNames.sources, storeNames.articles, storeNames.meta],
    "readwrite",
  );
  const done = transactionDone(transaction);

  if (sourcesChanged) {
    replaceStore(transaction.objectStore(storeNames.sources), state.sources);
  }

  if (articlesChanged) {
    replaceStore(transaction.objectStore(storeNames.articles), state.articles);
  }

  const meta = transaction.objectStore(storeNames.meta);
  if (savedIdsChanged) meta.put(state.savedIds, metaKeys.savedIds);
  meta.put(true, metaKeys.initialized);

  await done;
}

async function migrateFromLocalStorage(database) {
  // Se já houver registros no IndexedDB (por exemplo, de uma tentativa
  // anterior que não chegou a marcar a inicialização), preserve-os.
  const existing = await readStoredState(database);
  const hasRecords =
    existing.sources.length > 0 ||
    existing.articles.length > 0 ||
    existing.savedIds.length > 0;

  if (hasRecords) {
    await markInitialized(database);
    return existing;
  }

  const legacy = loadAppState();
  if (!legacy) {
    await markInitialized(database);
    return null;
  }

  // O IndexedDB usa o `id` como chave; se a cópia antiga tiver duplicatas,
  // mantém a última ocorrência para a conferência de contagem bater.
  const migratedState = {
    sources: uniqueByKey(legacy.sources, "id"),
    articles: uniqueByKey(legacy.articles, "id"),
    savedIds: [...new Set(legacy.savedIds)],
  };

  await writeStoredState(database, migratedState, null);

  // Confere a cópia antes de apagar a origem, para não perder dados se a
  // gravação tiver sido interrompida.
  const migrated = await readStoredState(database);
  if (
    migrated.sources.length !== migratedState.sources.length ||
    migrated.articles.length !== migratedState.articles.length ||
    migrated.savedIds.length !== migratedState.savedIds.length
  ) {
    throw new Error("A migração para o IndexedDB não foi concluída corretamente.");
  }

  await markInitialized(database, {
    [metaKeys.migratedFrom]: "localStorage",
    [metaKeys.migratedAt]: new Date().toISOString(),
  });
  removeLegacyAppState();

  console.info(
    `Papers News: ${migratedState.sources.length} fontes e ` +
      `${migratedState.articles.length} publicações migradas para o IndexedDB.`,
  );

  return migratedState;
}

/**
 * Carrega fontes, publicações e favoritos. Retorna `null` quando ainda não há
 * nenhum estado salvo (primeira execução). Se o IndexedDB não estiver
 * disponível, usa o localStorage como fallback.
 */
export async function loadAppStateAsync() {
  let database;
  try {
    database = await getDatabase();
  } catch (error) {
    console.warn(
      "IndexedDB indisponível; usando o armazenamento local como fallback:",
      error,
    );
    return loadAppState();
  }

  try {
    const initialized = await readMetaValue(database, metaKeys.initialized);
    if (initialized === true) return readStoredState(database);
    return await migrateFromLocalStorage(database);
  } catch (error) {
    console.error("Não foi possível carregar os dados do IndexedDB:", error);
    return loadAppState();
  }
}

/**
 * Grava um retrato do estado. Quando `previousState` é informado, apenas as
 * partes que mudaram de referência são reescritas — favoritar uma publicação,
 * por exemplo, grava somente a lista de favoritos.
 */
export async function saveAppStateAsync(state, previousState = null) {
  let database;
  try {
    database = await getDatabase();
  } catch (error) {
    console.warn(
      "IndexedDB indisponível; usando o armazenamento local como fallback:",
      error,
    );
    saveAppState(state);
    return;
  }

  await writeStoredState(database, state, previousState);
}

/** Remove todos os dados do aplicativo (usado por testes e limpeza manual). */
export async function clearAppStateAsync() {
  const database = await getDatabase();
  const transaction = database.transaction(
    [storeNames.articles, storeNames.sources, storeNames.meta],
    "readwrite",
  );
  const done = transactionDone(transaction);
  transaction.objectStore(storeNames.articles).clear();
  transaction.objectStore(storeNames.sources).clear();
  transaction.objectStore(storeNames.meta).clear();
  await done;
}
