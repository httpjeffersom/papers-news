import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";

export default function SourcesView({
  sources,
  totalSources,
  isFiltered,
  onAddSource,
  onRemoveSource,
  isAddingSource,
  addError,
}) {
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

  const sourceCountLabel =
    totalSources === 0
      ? "0 fontes"
      : isFiltered
        ? `${sources.length} de ${totalSources} ${totalSources === 1 ? "fonte" : "fontes"}`
        : `${totalSources} ${totalSources === 1 ? "fonte" : "fontes"}`;

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedUrl = url.trim();
    let parsedUrl;

    try {
      parsedUrl = new URL(
        /^[a-z][a-z\d+.-]*:/i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`,
      );
    } catch {
      setValidationError("Informe um endereço de site válido.");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setValidationError("Informe um endereço de site HTTP ou HTTPS.");
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
          <p className="eyebrow">PERSONALIZE SEU FEED</p>
          <div className="feed-heading-main">
            <h1>Fontes</h1>
            <p className="feed-note">os sites que você acompanha</p>
          </div>
        </div>
        <span className="article-count">{sourceCountLabel}</span>
      </div>

      <div className="sources-notice">
        Cole o endereço do site (por exemplo, https://exemplo.com/) e o Papers News encontra o feed
        automaticamente. Se preferir, informe o endereço direto do RSS/Atom. O proxy local é iniciado
        junto com o app, então não depende de serviços públicos.
      </div>

      <form className="source-form" onSubmit={handleSubmit}>
        <div className="source-form-fields">
          <label>
            <span>Nome da fonte (opcional)</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Usar o nome do site"
            />
          </label>
          <label>
            <span>Endereço do site</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="exemplo.com ou https://exemplo.com/feed/"
              type="text"
              inputMode="url"
              required
            />
          </label>
        </div>
        <button className="add-source-button" type="submit" disabled={isAddingSource}>
          <Icon name={isAddingSource ? "refresh" : "plus"} />
          {isAddingSource ? "Procurando feed..." : "Buscar e adicionar"}
        </button>
        {isAddingSource && <p className="source-progress" role="status">Verificando o site e buscando publicações…</p>}
        {validationError && <p className="inline-error" role="alert">{validationError}</p>}
        {addError && <p className="inline-error" role="alert">{addError}</p>}
      </form>

      <div className="source-list-heading">
        <h2>Fontes cadastradas</h2>
        <span>Sites e feeds encontrados</span>
      </div>
      {totalSources === 0 ? (
        <div className="empty-state source-empty">
          <span className="empty-icon"><Icon name="source" /></span>
          <h2>Nenhuma fonte cadastrada</h2>
          <p>Adicione um site para buscar suas publicações.</p>
        </div>
      ) : sources.length === 0 ? (
        <div className="empty-state source-empty">
          <span className="empty-icon"><Icon name="search" /></span>
          <h2>Nenhuma fonte encontrada</h2>
          <p>Tente outro termo de busca.</p>
        </div>
      ) : (
        <ul className="source-list">
          {sources.map((source) => (
            <li className="source-row" key={source.id}>
              <span className="source-row-details">
                <span className="source-row-name">
                  {source.name}
                  {source.isDemo && <span className="demo-tag">DEMO</span>}
                </span>
                <span className="source-row-url">
                  {source.url}
                  {source.feedUrl && source.feedUrl !== source.url && ` · Feed: ${source.feedUrl}`}
                </span>
              </span>
              <button
                className="icon-action remove-source"
                type="button"
                onClick={() => setPendingRemoval(source)}
                aria-label={`Remover ${source.name}`}
                title="Remover fonte"
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
              <h2 id="confirm-remove-title">Remover fonte?</h2>
              <p id="confirm-remove-description">
                Você quer realmente remover <strong>{pendingRemoval.name}</strong> da sua lista
                de fontes?
              </p>
              <div className="confirm-actions">
                <button
                  className="confirm-cancel"
                  type="button"
                  onClick={() => setPendingRemoval(null)}
                  ref={cancelRef}
                >
                  Cancelar
                </button>
                <button className="confirm-remove" type="button" onClick={handleConfirmRemoval}>
                  Remover
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
