import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import Navigation from "./components/Navigation.jsx";
import NewsFeed from "./components/NewsFeed.jsx";
import SourcesView from "./components/SourcesView.jsx";
import { demoArticles, demoSources } from "./data/demoArticles.js";
import { useTheme } from "./hooks/useTheme.js";
import { loadAppState, saveAppState } from "./services/appStorage.js";
import { ensureDesktopProxy } from "./services/desktopProxy.js";
import { discoverAndFetchSource, refreshNews } from "./services/newsService.js";
import { sortArticlesByDateDesc } from "./utils/articleSort.js";

const maxRefreshFailuresShown = 3;

function isStorageQuotaError(error) {
  return (
    error?.name === "QuotaExceededError" ||
    error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 ||
    error?.code === 1014
  );
}

function formatRefreshFailures(errors) {
  const shownFailures = errors
    .slice(0, maxRefreshFailuresShown)
    .map((failure) => `${failure.sourceName}: ${failure.message}`)
    .join("; ");
  const remaining = errors.length - maxRefreshFailuresShown;

  if (remaining <= 0) return shownFailures;
  return `${shownFailures}; e mais ${remaining} ${remaining === 1 ? "fonte" : "fontes"}`;
}

export default function App() {
  const [initialState] = useState(loadAppState);
  const { theme, setTheme } = useTheme();
  const [activeView, setActiveView] = useState("all");
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState(() => initialState?.savedIds ?? []);
  const [sources, setSources] = useState(() => initialState?.sources ?? demoSources);
  const [articles, setArticles] = useState(() => initialState?.articles ?? demoArticles);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [persistenceError, setPersistenceError] = useState("");
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [sourceError, setSourceError] = useState("");

  useEffect(() => {
    void ensureDesktopProxy();
  }, []);

  useEffect(() => {
    try {
      saveAppState({ sources, articles, savedIds });
      setPersistenceError("");
    } catch (error) {
      console.error("Não foi possível salvar os dados do Papers News:", error);
      setPersistenceError(
        isStorageQuotaError(error)
          ? "O armazenamento local está cheio. Remova fontes ou favoritos para liberar espaço."
          : "Não foi possível salvar suas alterações neste dispositivo.",
      );
    }
  }, [articles, savedIds, sources]);

  const visibleArticles = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return sortArticlesByDateDesc(
      articles
        .filter((article) => activeView !== "favorites" || savedIds.includes(article.id))
        .filter((article) => {
          if (!normalizedSearch) return true;
          const searchableText = `${article.title} ${article.summary} ${article.sourceName}`;
          return searchableText.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
        }),
    );
  }, [activeView, articles, savedIds, search]);

  const visibleSources = useMemo(() => {
    if (activeView !== "sources") return sources;

    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) return sources;

    return sources.filter((source) => {
      const searchableText = `${source.name} ${source.url} ${source.feedUrl ?? ""}`;
      return searchableText.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
    });
  }, [activeView, search, sources]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError("");
    try {
      const result = await refreshNews(sources, articles, savedIds);
      setArticles(result.articles);
      if (result.errors.length > 0) {
        setRefreshError(
          `Atualização parcial. Não foi possível atualizar: ${formatRefreshFailures(result.errors)}. Notícias antigas permanecem disponíveis quando há cache.`,
        );
      }
    } catch (error) {
      console.error("Não foi possível atualizar as notícias:", error);
      setRefreshError("Não foi possível atualizar o feed. Tente novamente.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function toggleSaved(articleId) {
    setSavedIds((current) =>
      current.includes(articleId)
        ? current.filter((id) => id !== articleId)
        : [...current, articleId],
    );
  }

  async function addSource(source) {
    setIsAddingSource(true);
    setSourceError("");
    try {
      if (sources.some((existing) => !existing.isDemo && existing.url === source.url)) {
        throw new Error("Este site já está cadastrado.");
      }
      const result = await discoverAndFetchSource(source);
      setSources((current) => [
        ...current.filter((item) => !item.isDemo),
        result.source,
      ]);
      setArticles((current) => [
        ...current.filter((article) => !article.isDemo),
        ...result.articles,
      ]);
      return true;
    } catch (error) {
      console.error("Não foi possível adicionar a fonte:", error);
      setSourceError(error.message || "Não foi possível adicionar este site.");
      return false;
    } finally {
      setIsAddingSource(false);
    }
  }

  function removeSource(sourceId) {
    setSources((current) => current.filter((source) => source.id !== sourceId));
    setArticles((current) => current.filter((article) => article.sourceId !== sourceId));
    setSavedIds((current) =>
      current.filter(
        (id) => !articles.some((article) => article.id === id && article.sourceId === sourceId),
      ),
    );
  }

  function goHome() {
    setActiveView("all");
    setSearch("");
    const prefersReducedMotion =
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    globalThis.scrollTo?.({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  const isSourcesView = activeView === "sources";
  const isDemoMode =
    sources.length > 0 && sources.every((source) => source.isDemo);

  return (
    <div className="app-shell">
      <Header
        search={search}
        onSearchChange={setSearch}
        onRefresh={handleRefresh}
        onHome={goHome}
        isRefreshing={isRefreshing}
        isSourcesView={isSourcesView}
        theme={theme}
        onThemeChange={setTheme}
      />
      <div className="workspace">
        <Navigation
          activeView={activeView}
          sourceCount={sources.length}
          isDemoMode={isDemoMode}
          onChange={setActiveView}
        />
        <main className="main-content">
          {persistenceError && (
            <div className="error-state persistence-error" role="alert">
              {persistenceError}
            </div>
          )}
          {isSourcesView ? (
            <SourcesView
              sources={visibleSources}
              totalSources={sources.length}
              isFiltered={search.trim() !== ""}
              onAddSource={addSource}
              onRemoveSource={removeSource}
              isAddingSource={isAddingSource}
              addError={sourceError}
            />
          ) : (
            <NewsFeed
              articles={visibleArticles}
              savedIds={savedIds}
              activeView={activeView}
              isRefreshing={isRefreshing}
              refreshError={refreshError}
              onToggleSaved={toggleSaved}
            />
          )}
        </main>
      </div>
    </div>
  );
}
