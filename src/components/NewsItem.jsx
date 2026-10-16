import { useState } from "react";
import Icon from "./Icon.jsx";
import { openExternalUrl } from "../services/desktop.js";

function formatPublishedAt(value) {
  const publishedAt = new Date(value);
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

export default function NewsItem({ article, isSaved, onToggleSaved }) {
  const [openError, setOpenError] = useState("");

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
        <span className="source-avatar">{article.sourceInitials}</span>
        <span className="source-name">{article.sourceName}</span>
        <span className="meta-divider" />
        <time dateTime={article.publishedAt}>{formatPublishedAt(article.publishedAt)}</time>
        {article.isDemo && <span className="demo-tag">DEMO</span>}
      </div>

      <h2 className="article-title">{article.title}</h2>
      {article.image && <img className="article-image" src={article.image} alt="" />}
      <p className="article-summary">{article.summary}</p>

      <div className="article-actions">
        <button className="text-action" type="button" onClick={handleOpen}>
          {article.isDemo ? "Abrir exemplo" : "Abrir publicação"} <Icon name="external" />
        </button>
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
