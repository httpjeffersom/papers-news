import { useState } from "react";
import Icon from "./Icon.jsx";
import { openExternalUrl } from "../services/desktop.js";
import { useI18n } from "../i18n/LanguageContext.jsx";

function formatPublishedAt(value, language) {
  const publishedAt = new Date(value);
  if (Number.isNaN(publishedAt.getTime())) return "";

  const date = new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(publishedAt);
  const time = new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(publishedAt);
  return `${date} · ${time}`;
}

export default function NewsItem({ article, isSaved, onToggleSaved, onRead }) {
  const { t, language } = useI18n();
  const [openError, setOpenError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const publishedAtLabel = formatPublishedAt(article.publishedAt, language);

  async function handleOpen() {
    setOpenError("");
    try {
      await openExternalUrl(article.url);
    } catch (error) {
      console.error("Não foi possível abrir a publicação:", error);
      setOpenError(t("item.openError"));
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
          <span className="meta-unknown">{t("item.unknownDate")}</span>
        )}
        {article.isDemo && <span className="demo-tag">{t("item.demoTag")}</span>}
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
            {t("item.read")}
          </button>
          <button className="text-action" type="button" onClick={handleOpen}>
            {article.isDemo ? t("item.openDemo") : t("item.open")} <Icon name="external" />
          </button>
        </div>
        <button
          className={`icon-action${isSaved ? " is-saved" : ""}`}
          type="button"
          onClick={() => onToggleSaved(article.id)}
          aria-label={isSaved ? t("item.unsave") : t("item.save")}
          aria-pressed={isSaved}
          title={isSaved ? t("item.unsave") : t("item.save")}
        >
          <Icon name="bookmark" />
        </button>
      </div>
      {openError && <p className="inline-error" role="alert">{openError}</p>}
    </article>
  );
}
