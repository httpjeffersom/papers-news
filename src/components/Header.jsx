import Icon from "./Icon.jsx";

export default function Header({ search, onSearchChange, onRefresh, isRefreshing }) {
  return (
    <header className="topbar">
      <a className="brand" href="#feed" aria-label="Papers News, início">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="brand-name">papers<span>news</span></span>
      </a>

      <label className="search-box">
        <Icon name="search" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar no seu feed"
          aria-label="Buscar no seu feed"
        />
      </label>

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
    </header>
  );
}
