import { useState } from "react";
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
              <span className="source-row-icon"><Icon name="source" /></span>
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
                onClick={() => onRemoveSource(source.id)}
                aria-label={`Remover ${source.name}`}
                title="Remover fonte"
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
