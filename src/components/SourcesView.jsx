import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import { useI18n } from "../i18n/LanguageContext.jsx";

export default function SourcesView({
  sources,
  totalSources,
  isFiltered,
  onAddSource,
  onRemoveSource,
  isAddingSource,
  addError,
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!pendingRemoval) return undefined;

    previousFocus.current = document.activeElement;
    cancelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingRemoval(null);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [pendingRemoval]);

  function handleConfirmRemoval() {
    if (!pendingRemoval) return;
    const { id } = pendingRemoval;
    setPendingRemoval(null);
    onRemoveSource(id);
  }

  const sourceCountLabel = t("sources.count", {
    shown: sources.length,
    total: totalSources,
    filtered: isFiltered,
  });

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedUrl = url.trim();
    let parsedUrl;

    try {
      parsedUrl = new URL(
        /^[a-z][a-z\d+.-]*:/i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`,
      );
    } catch {
      setValidationError(t("sources.invalidUrl"));
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setValidationError(t("sources.invalidProtocol"));
      return;
    }

    setValidationError("");
    Promise.resolve(onAddSource({ name: name.trim(), url: parsedUrl.href })).then((added) => {
      if (added) {
        setName("");
        setUrl("");
      }
    });
  }

  return (
    <section className="sources-section">
      <div className="feed-heading">
        <div>
          <p className="eyebrow">{t("sources.eyebrow")}</p>
          <div className="feed-heading-main">
            <h1>{t("sources.title")}</h1>
            <p className="feed-note">{t("sources.note")}</p>
          </div>
        </div>
        <span className="article-count">{sourceCountLabel}</span>
      </div>

      <div className="sources-notice">{t("sources.notice")}</div>

      <form className="source-form" onSubmit={handleSubmit}>
        <div className="source-form-fields">
          <label>
            <span>{t("sources.nameLabel")}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("sources.namePlaceholder")}
            />
          </label>
          <label>
            <span>{t("sources.urlLabel")}</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t("sources.urlPlaceholder")}
              type="text"
              inputMode="url"
              required
            />
          </label>
        </div>
        <button className="add-source-button" type="submit" disabled={isAddingSource}>
          <Icon name={isAddingSource ? "refresh" : "plus"} />
          {isAddingSource ? t("sources.searching") : t("sources.add")}
        </button>
        {isAddingSource && <p className="source-progress" role="status">{t("sources.verifying")}</p>}
        {validationError && <p className="inline-error" role="alert">{validationError}</p>}
        {addError && <p className="inline-error" role="alert">{addError}</p>}
      </form>

      <div className="source-list-heading">
        <h2>{t("sources.listTitle")}</h2>
        <span>{t("sources.listNote")}</span>
      </div>
      {totalSources === 0 ? (
        <div className="empty-state source-empty">
          <span className="empty-icon"><Icon name="source" /></span>
          <h2>{t("sources.emptyTitle")}</h2>
          <p>{t("sources.emptyText")}</p>
        </div>
      ) : sources.length === 0 ? (
        <div className="empty-state source-empty">
          <span className="empty-icon"><Icon name="search" /></span>
          <h2>{t("sources.emptyFilteredTitle")}</h2>
          <p>{t("sources.emptyFilteredText")}</p>
        </div>
      ) : (
        <ul className="source-list">
          {sources.map((source) => (
            <li className="source-row" key={source.id}>
              <span className="source-row-details">
                <span className="source-row-name">
                  {source.name}
                  {source.isDemo && <span className="demo-tag">{t("item.demoTag")}</span>}
                </span>
                <span className="source-row-url">
                  {source.url}
                  {source.feedUrl && source.feedUrl !== source.url &&
                    ` · ${t("sources.feedLabel", { url: source.feedUrl })}`}
                </span>
              </span>
              <button
                className="icon-action remove-source"
                type="button"
                onClick={() => setPendingRemoval(source)}
                aria-label={t("sources.removeAria", { name: source.name })}
                title={t("sources.removeTitle")}
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingRemoval &&
        createPortal(
          <div
            className="confirm-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPendingRemoval(null);
            }}
          >
            <div
              className="confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-remove-title"
              aria-describedby="confirm-remove-description"
              ref={dialogRef}
            >
              <span className="confirm-dialog-icon" aria-hidden="true">
                <Icon name="trash" />
              </span>
              <h2 id="confirm-remove-title">{t("sources.removeDialogTitle")}</h2>
              <p id="confirm-remove-description">
                {t("sources.removeDialogBefore")} <strong>{pendingRemoval.name}</strong>{" "}
                {t("sources.removeDialogAfter")}
              </p>
              <div className="confirm-actions">
                <button
                  className="confirm-cancel"
                  type="button"
                  onClick={() => setPendingRemoval(null)}
                  ref={cancelRef}
                >
                  {t("sources.cancel")}
                </button>
                <button className="confirm-remove" type="button" onClick={handleConfirmRemoval}>
                  {t("sources.remove")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
