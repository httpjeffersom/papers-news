import Icon from "./Icon.jsx";
import NewsItem from "./NewsItem.jsx";

export default function NewsFeed({
  articles,
  savedIds,
  activeView,
  isRefreshing,
  refreshError,
  onToggleSaved,
  onReadArticle,
}) {
  const isFavorites = activeView === "favorites";
  const hasDemoArticles = articles.some((article) => article.isDemo);

  return (
    <section className="feed-section" aria-label={isFavorites ? "Notícias favoritas" : "Feed de notícias"}>
      <div className="feed-heading">
        <div className="feed-heading-main">
          <h1>{isFavorites ? "Favoritos" : "Seu feed"}</h1>
          <p className="feed-note">
            {isFavorites ? "guardados para ler depois" : "em ordem cronológica"}
          </p>
        </div>
        <span className="article-count">
          {articles.length} {articles.length === 1 ? "publicação" : "publicações"}
        </span>
      </div>

      {hasDemoArticles && (
        <div className="demo-notice">
          <span className="demo-notice-icon"><Icon name="check" /></span>
          <p>
            <strong>Conteúdo de demonstração.</strong> Estas publicações são fictícias. Adicione um site
            em Fontes para acompanhar notícias reais.
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
          Atualizando publicações…
        </div>
      )}

      <div className="article-list" aria-busy={isRefreshing}>
        {isRefreshing && articles.length === 0 ? (
          <div className="loading-state"><span className="spinner" />Carregando publicações…</div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Icon name={isFavorites ? "bookmark" : "search"} /></span>
            <h2>{isFavorites ? "Sua coleção começa aqui" : "Nenhuma publicação encontrada"}</h2>
            <p>
              {isFavorites
                ? "Salve uma publicação com o marcador para encontrá-la aqui."
                : "Tente outro termo de busca ou volte mais tarde."}
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
      <footer className="feed-footer">Você chegou ao fim das publicações disponíveis.</footer>
    </section>
  );
}
