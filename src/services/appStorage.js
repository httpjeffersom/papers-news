const storageKey = "papers-news:state:v1";

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
