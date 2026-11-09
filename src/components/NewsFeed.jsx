import Icon from "./Icon.jsx";
import NewsItem from "./NewsItem.jsx";
import { useI18n } from "../i18n/LanguageContext.jsx";

export default function NewsFeed({
  articles,
  savedIds,
  activeView,
  isRefreshing,
  refreshError,
  onToggleSaved,
  onReadArticle,
}) {
  const { t } = useI18n();
  const isFavorites = activeView === "favorites";
  const hasDemoArticles = articles.some((article) => article.isDemo);

  return (
    <section
      className="feed-section"
      aria-label={isFavorites ? t("feed.favoritesAria") : t("feed.aria")}
    >
      <div className="feed-heading">
        <div className="feed-heading-main">
          <h1>{isFavorites ? t("feed.favoritesTitle") : t("feed.title")}</h1>
          <p className="feed-note">
            {isFavorites ? t("feed.favoritesNote") : t("feed.note")}
          </p>
        </div>
        <span className="article-count">
          {t("feed.count", { count: articles.length })}
        </span>
      </div>

      {hasDemoArticles && (
        <div className="demo-notice">
          <span className="demo-notice-icon"><Icon name="check" /></span>
          <p>
            <strong>{t("feed.demoTitle")}</strong> {t("feed.demoText")}
          </p>
        </div>
      )}

      {refreshError && (
        <div className="error-state" role="alert">
          <span>{refreshError}</span>
        </div>
      )}
      {isRefreshing && articles.length > 0 && (
        <div className="loading-banner" role="status">
          <span className="spinner" />
          {t("feed.updating")}
        </div>
      )}

      <div className="article-list" aria-busy={isRefreshing}>
        {isRefreshing && articles.length === 0 ? (
          <div className="loading-state"><span className="spinner" />{t("feed.loading")}</div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Icon name={isFavorites ? "bookmark" : "search"} /></span>
            <h2>
              {isFavorites ? t("feed.emptyFavoritesTitle") : t("feed.emptyTitle")}
            </h2>
            <p>
              {isFavorites ? t("feed.emptyFavoritesText") : t("feed.emptyText")}
            </p>
          </div>
        ) : (
          articles.map((article) => (
            <NewsItem
              article={article}
              key={article.id}
              isSaved={savedIds.includes(article.id)}
              onToggleSaved={onToggleSaved}
              onRead={onReadArticle}
            />
          ))
        )}
      </div>
      <footer className="feed-footer">{t("feed.footer")}</footer>
    </section>
  );
}
