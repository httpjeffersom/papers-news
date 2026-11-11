import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { openExternalUrl } from "../services/desktop.js";
import { proxiedImageUrl } from "../services/desktopProxy.js";
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
  const [imageSrc, setImageSrc] = useState(article.image || "");
  const [imageFailed, setImageFailed] = useState(!article.image);
  const publishedAtLabel = formatPublishedAt(article.publishedAt, language);

  useEffect(() => {
    setImageSrc(article.image || "");
    setImageFailed(!article.image);
  }, [article.image]);

  async function handleOpen() {
    setOpenError("");
    try {
      await openExternalUrl(article.url);
    } catch (error) {
      console.error("Não foi possível abrir a publicação:", error);
      setOpenError(t("item.openError"));
    }
  }

  // Se a imagem não abrir direto (referer, hotlink), tenta de novo pelo proxy
  // local, que baixa a foto sem enviar o referer da aplicação.
  function handleImageError() {
    const viaProxy = proxiedImageUrl(article.image);
    if (viaProxy && imageSrc !== viaProxy) {
      setImageSrc(viaProxy);
      return;
    }

    setImageFailed(true);
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
      {imageFailed ? (
        <div className="article-image article-image-fallback" aria-hidden="true">
          <span>{article.sourceInitials || "?"}</span>
        </div>
      ) : (
        <img
          className="article-image"
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleImageError}
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
