import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import Navigation from "./components/Navigation.jsx";
import NewsFeed from "./components/NewsFeed.jsx";
import SourcesView from "./components/SourcesView.jsx";
import { demoArticles, demoSources } from "./data/demoArticles.js";
import { loadAppState, saveAppState } from "./services/appStorage.js";
import { discoverAndFetchSource, refreshNews } from "./services/newsService.js";

export default function App() {
  const [initialState] = useState(loadAppState);
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
    try {
      saveAppState({ sources, articles, savedIds });
      setPersistenceError("");
    } catch (error) {
      console.error("Não foi possível salvar os dados do Papers News:", error);
      setPersistenceError("Não foi possível salvar suas alterações neste dispositivo.");
    }
  }, [articles, savedIds, sources]);

  const visibleArticles = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return articles
      .filter((article) => activeView !== "favorites" || savedIds.includes(article.id))
      .filter((article) => {
        if (!normalizedSearch) return true;
        const searchableText = `${article.title} ${article.summary} ${article.sourceName}`;
        return searchableText.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [activeView, articles, savedIds, search]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError("");
    try {
      const result = await refreshNews(sources, articles, savedIds);
      setArticles(result.articles);
      if (result.errors.length > 0) {
        const failedSources = result.errors.map((failure) => failure.sourceName).join(", ");
        setRefreshError(
          `Atualização parcial. Não foi possível atualizar: ${failedSources}. Notícias antigas permanecem disponíveis quando há cache.`,
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

  const isSourcesView = activeView === "sources";

  return (
    <div className="app-shell">
      <Header
        search={search}
        onSearchChange={setSearch}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="workspace">
        <Navigation activeView={activeView} onChange={setActiveView} />
        <main className="main-content">
          {persistenceError && (
            <div className="error-state persistence-error" role="alert">
              {persistenceError}
            </div>
          )}
          {isSourcesView ? (
            <SourcesView
              sources={sources}
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
