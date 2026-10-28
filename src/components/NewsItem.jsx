import { useState } from "react";
import Icon from "./Icon.jsx";
import { openExternalUrl } from "../services/desktop.js";

function formatPublishedAt(value) {
  const publishedAt = new Date(value);
  if (Number.isNaN(publishedAt.getTime())) return "";

  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(publishedAt);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(publishedAt);
  return `${date} · ${time}`;
}

export default function NewsItem({ article, isSaved, onToggleSaved, onRead }) {
  const [openError, setOpenError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const publishedAtLabel = formatPublishedAt(article.publishedAt);

  async function handleOpen() {
    setOpenError("");
    try {
      await openExternalUrl(article.url);
    } catch (error) {
      console.error("Não foi possível abrir a publicação:", error);
      setOpenError("Não foi possível abrir o link.");
    }
  }

  return (
    <article className="news-item">
      <div className="article-meta">
        <span className="source-name">{article.sourceName}</span>
        <span className="meta-divider" />
        {publishedAtLabel ? (
          <time dateTime={article.publishedAt}>{publishedAtLabel}</time>
        ) : (
          <span className="meta-unknown">Data desconhecida</span>
        )}
        {article.isDemo && <span className="demo-tag">DEMO</span>}
      </div>

      <h2 className="article-title">{article.title}</h2>
      {article.image && !imageFailed && (
        <img
          className="article-image"
          src={article.image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      )}
      <p className="article-summary">{article.summary}</p>

      <div className="article-actions">
        <div className="article-actions-main">
          <button
            className="read-action"
            type="button"
            onClick={() => onRead(article)}
          >
            <Icon name="read" />
            Ler aqui
          </button>
          <button className="text-action" type="button" onClick={handleOpen}>
            {article.isDemo ? "Abrir exemplo" : "Abrir publicação"} <Icon name="external" />
          </button>
        </div>
        <button
          className={`icon-action${isSaved ? " is-saved" : ""}`}
          type="button"
          onClick={() => onToggleSaved(article.id)}
          aria-label={isSaved ? "Remover dos favoritos" : "Salvar nos favoritos"}
          aria-pressed={isSaved}
          title={isSaved ? "Remover dos favoritos" : "Salvar nos favoritos"}
        >
          <Icon name="bookmark" />
        </button>
      </div>
      {openError && <p className="inline-error" role="alert">{openError}</p>}
    </article>
  );
}
