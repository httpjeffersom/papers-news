import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { useI18n } from "../i18n/LanguageContext.jsx";
import { openExternalUrl } from "../services/desktop.js";
import { loadArticleContent } from "../services/reader.js";

function formatPublishedAt(value, language) {
  const publishedAt = new Date(value);
  if (Number.isNaN(publishedAt.getTime())) return "";

  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(publishedAt);
}

function escapeSummary(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function ArticleReader({ article, onClose }) {
  const { t, language } = useI18n();
  const [state, setState] = useState({ status: "loading", content: null });
  const [progress, setProgress] = useState(0);
  const [openError, setOpenError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const scrollRef = useRef(null);
  const closeRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", content: null });

    loadArticleContent(article)
      .then((content) => {
        if (!cancelled) setState({ status: "ready", content });
      })
      .catch((error) => {
        console.error("Não foi possível preparar a leitura:", error);
        const summary = (article.summary || "").trim();
        if (cancelled) return;
        setState({
          status: "ready",
          content: {
            html: summary ? `<p>${escapeSummary(summary)}</p>` : "",
            text: summary,
            length: summary.length,
            origin: "summary",
            limited: true,
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [article]);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [onClose]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;

    const scrollable = element.scrollHeight - element.clientHeight;
    setProgress(scrollable > 0 ? Math.min(100, (element.scrollTop / scrollable) * 100) : 0);
  }

  async function handleOpen() {
    setOpenError("");
    try {
      await openExternalUrl(article.url);
    } catch (error) {
      console.error("Não foi possível abrir a publicação:", error);
      setOpenError(t("item.openError"));
    }
  }

  const publishedAtLabel = formatPublishedAt(article.publishedAt, language);
  const isLoading = state.status === "loading";
  const content = state.content;

  return (
    <div
      className="reader"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-title"
    >
      <div className="reader-bar">
        <button
          className="reader-back"
          type="button"
          onClick={onClose}
          ref={closeRef}
        >
          <Icon name="back" />
          <span>{t("reader.back")}</span>
        </button>

        <span className="reader-bar-source">{article.sourceName}</span>

        <button
          className="reader-bar-external"
          type="button"
          onClick={handleOpen}
        >
          <span>{article.isDemo ? t("item.openDemo") : t("item.open")}</span>
          <Icon name="external" />
        </button>

        <span
          className="reader-progress"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="reader-scroll" ref={scrollRef} onScroll={handleScroll}>
        <article className="reader-paper">
          <header className="reader-header">
            <p className="reader-kicker">
              <span>{article.sourceName}</span>
              {publishedAtLabel && (
                <>
                  <span className="reader-kicker-divider" />
                  <time dateTime={article.publishedAt}>{publishedAtLabel}</time>
                </>
              )}
            </p>
            <h1 id="reader-title">{article.title}</h1>
          </header>

          {article.image && !imageFailed && (
            <img
              className="reader-hero"
              src={article.image}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          )}

          {isLoading ? (
            <div className="reader-loading" role="status">
              <span className="spinner" />
              {t("reader.loading")}
            </div>
          ) : (
            <>
              {content?.limited && (
                <p className="reader-notice">{t("reader.limited")}</p>
              )}
              <div
                className="reader-content"
                dangerouslySetInnerHTML={{ __html: content?.html || "" }}
              />
              {!content?.html && (
                <p className="reader-notice">{t("reader.noText")}</p>
              )}
            </>
          )}

          {openError && (
            <p className="inline-error" role="alert">
              {openError}
            </p>
          )}

          <footer className="reader-footer">
            <p>{t("reader.footer")}</p>
            <button className="text-action" type="button" onClick={handleOpen}>
              {article.isDemo ? t("item.openDemo") : t("reader.continue")}
              <Icon name="external" />
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
}
