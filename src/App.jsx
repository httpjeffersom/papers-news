import { useEffect, useMemo, useRef, useState } from "react";
import ArticleReader from "./components/ArticleReader.jsx";
import Header from "./components/Header.jsx";
import Navigation from "./components/Navigation.jsx";
import NewsFeed from "./components/NewsFeed.jsx";
import SettingsView from "./components/SettingsView.jsx";
import SourcesView from "./components/SourcesView.jsx";
import { getDemoArticles, getDemoSources } from "./data/demoArticles.js";
import { useI18n } from "./i18n/LanguageContext.jsx";
import { useFontSize } from "./hooks/useFontSize.js";
import { useRetentionDays } from "./hooks/useRetentionDays.js";
import { useTheme } from "./hooks/useTheme.js";
import { loadAppState, saveAppState } from "./services/appStorage.js";
import { ensureDesktopProxy } from "./services/desktopProxy.js";
import { discoverAndFetchSource, refreshNews } from "./services/newsService.js";
import { pruneExpiredArticles } from "./utils/articleRetention.js";
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

function formatRefreshFailures(errors, t) {
  const shownFailures = errors
    .slice(0, maxRefreshFailuresShown)
    .map((failure) => `${failure.sourceName}: ${failure.message}`)
    .join("; ");
  const remaining = errors.length - maxRefreshFailuresShown;

  if (remaining <= 0) return shownFailures;
  return `${shownFailures}; ${t("app.moreSources", { count: remaining })}`;
}

export default function App() {
  const { language, t } = useI18n();
  const [initialState] = useState(loadAppState);
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { retentionDays, setRetentionDays } = useRetentionDays();
  const [activeView, setActiveView] = useState("all");
  const [readingArticle, setReadingArticle] = useState(null);
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState(() => initialState?.savedIds ?? []);
  const [sources, setSources] = useState(
    () => initialState?.sources ?? getDemoSources(language),
  );
  const [articles, setArticles] = useState(() =>
    pruneExpiredArticles(
      initialState?.articles ?? getDemoArticles(language),
      initialState?.savedIds ?? [],
      Date.now(),
      retentionDays,
    ),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [persistenceError, setPersistenceError] = useState("");
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [sourceError, setSourceError] = useState("");

  // Ao abrir, atualiza os feeds sozinho. Só vale a pena quando existe ao menos
  // uma fonte de verdade — o conteúdo de demonstração não depende de rede.
  const autoRefreshStarted = useRef(false);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Espera o proxy local acordar para não cair nos serviços públicos.
      await ensureDesktopProxy();
      if (cancelled || autoRefreshStarted.current) return;
      if (!sources.some((source) => !source.isDemo)) return;

      autoRefreshStarted.current = true;
      await handleRefresh();
    })();

    return () => {
      cancelled = true;
    };
    // Executa uma única vez, com o estado já carregado do disco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // As publicações e fontes de demonstração acompanham o idioma escolhido.
  useEffect(() => {
    setSources((current) => {
      if (!current.some((source) => source.isDemo)) return current;
      return [
        ...getDemoSources(language),
        ...current.filter((source) => !source.isDemo),
      ];
    });

    setArticles((current) => {
      if (!current.some((article) => article.isDemo)) return current;
      const localized = new Map(
        getDemoArticles(language).map((article) => [article.id, article]),
      );
      return current.map((article) =>
        article.isDemo ? localized.get(article.id) ?? article : article,
      );
    });
  }, [language]);

  useEffect(() => {
    try {
      saveAppState({ sources, articles, savedIds });
      setPersistenceError("");
    } catch (error) {
      console.error("Não foi possível salvar os dados do Papers News:", error);
      setPersistenceError(
        isStorageQuotaError(error) ? t("app.storageFull") : t("app.saveError"),
      );
    }
  }, [articles, savedIds, sources]);

  const visibleArticles = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(language);
    return sortArticlesByDateDesc(
      articles
        .filter((article) => activeView !== "favorites" || savedIds.includes(article.id))
        .filter((article) => {
          if (!normalizedSearch) return true;
          const searchableText = `${article.title} ${article.summary} ${article.sourceName}`;
          return searchableText.toLocaleLowerCase(language).includes(normalizedSearch);
        }),
    );
  }, [activeView, articles, language, savedIds, search]);

  const visibleSources = useMemo(() => {
    if (activeView !== "sources") return sources;

    const normalizedSearch = search.trim().toLocaleLowerCase(language);
    if (!normalizedSearch) return sources;

    return sources.filter((source) => {
      const searchableText = `${source.name} ${source.url} ${source.feedUrl ?? ""}`;
      return searchableText.toLocaleLowerCase(language).includes(normalizedSearch);
    });
  }, [activeView, language, search, sources]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError("");
    try {
      const result = await refreshNews(sources, articles, savedIds);
      setArticles(
        pruneExpiredArticles(result.articles, savedIds, Date.now(), retentionDays),
      );
      if (result.errors.length > 0) {
        setRefreshError(
          t("app.refreshPartial", {
            detail: formatRefreshFailures(result.errors, t),
          }),
        );
      }
    } catch (error) {
      console.error("Não foi possível atualizar as notícias:", error);
      setRefreshError(t("app.refreshError"));
    } finally {
      setIsRefreshing(false);
    }
  }

  function toggleSaved(articleId) {
    const isSaved = savedIds.includes(articleId);
    const nextSavedIds = isSaved
      ? savedIds.filter((id) => id !== articleId)
      : [...savedIds, articleId];

    setSavedIds(nextSavedIds);
    if (isSaved) {
      setArticles((current) =>
        pruneExpiredArticles(current, nextSavedIds, Date.now(), retentionDays),
      );
    }
  }

  function changeRetentionDays(nextDays) {
    setRetentionDays(nextDays);
    setArticles((current) =>
      pruneExpiredArticles(current, savedIds, Date.now(), nextDays),
    );
  }

  async function addSource(source) {
    setIsAddingSource(true);
    setSourceError("");
    try {
      if (sources.some((existing) => !existing.isDemo && existing.url === source.url)) {
        throw new Error(t("app.alreadyAdded"));
      }
      const result = await discoverAndFetchSource(source);
      setSources((current) => [
        ...current.filter((item) => !item.isDemo),
        result.source,
      ]);
      setArticles((current) =>
        pruneExpiredArticles(
          [...current.filter((article) => !article.isDemo), ...result.articles],
          savedIds,
          Date.now(),
          retentionDays,
        ),
      );
      return true;
    } catch (error) {
      console.error("Não foi possível adicionar a fonte:", error);
      setSourceError(error.message || t("app.addSourceError"));
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
    scrollToTop();
  }

  function goToView(view) {
    setActiveView(view);
    setSearch("");
    scrollToTop();
  }

  function scrollToTop() {
    const prefersReducedMotion =
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    globalThis.scrollTo?.({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  const isSourcesView = activeView === "sources";
  const isSettingsView = activeView === "settings";

  return (
    <div className="app-shell">
      <Header
        search={search}
        onSearchChange={setSearch}
        onRefresh={handleRefresh}
        onHome={goHome}
        isRefreshing={isRefreshing}
        isSourcesView={isSourcesView}
        isSettingsView={isSettingsView}
      />
      <div className="workspace">
        <Navigation activeView={activeView} onChange={goToView} />
        <main className="main-content">
          {persistenceError && (
            <div className="error-state persistence-error" role="alert">
              {persistenceError}
            </div>
          )}
          {isSettingsView ? (
            <SettingsView
              theme={theme}
              onThemeChange={setTheme}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
              retentionDays={retentionDays}
              onRetentionDaysChange={changeRetentionDays}
            />
          ) : isSourcesView ? (
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
              onReadArticle={setReadingArticle}
            />
          )}
        </main>
      </div>

      {readingArticle && (
        <ArticleReader
          article={readingArticle}
          onClose={() => setReadingArticle(null)}
        />
      )}
    </div>
  );
}
