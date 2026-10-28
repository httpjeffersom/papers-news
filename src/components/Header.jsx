import Icon from "./Icon.jsx";

export default function Header({
  search,
  onSearchChange,
  onRefresh,
  onHome,
  isRefreshing,
  isSourcesView,
  isSettingsView,
}) {
  const searchPlaceholder = isSourcesView ? "Buscar fonte" : "Buscar no seu feed";

  return (
    <header className={`topbar${isSettingsView ? " topbar-settings" : ""}`}>
      <button
        className="brand"
        type="button"
        onClick={onHome}
        aria-label="papersnews, ir para todas as notícias"
      >
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="brand-name">papers<span>news</span></span>
      </button>

      {!isSettingsView && (
        <label className="search-box">
          <Icon name="search" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </label>
      )}

      <div className="topbar-actions">
        <button
          className={`refresh-button${isRefreshing ? " is-refreshing" : ""}`}
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={isRefreshing ? "Atualizando feed" : "Atualizar feed"}
        >
          <Icon name="refresh" />
          <span>{isRefreshing ? "Atualizando" : "Atualizar"}</span>
        </button>
      </div>
    </header>
  );
}
