import Icon from "./Icon.jsx";

const items = [
  { id: "all", label: "Todas as notícias", icon: "feed" },
  { id: "favorites", label: "Favoritos", icon: "bookmark" },
  { id: "sources", label: "Fontes", icon: "source" },
];

export default function Navigation({
  activeView,
  sourceCount,
  isDemoMode,
  onChange,
}) {
  const isLive = sourceCount > 0 && !isDemoMode;
  const sourceLabel =
    sourceCount === 0
      ? "Nenhuma fonte conectada"
      : isDemoMode
        ? "Modo demonstração"
        : `${sourceCount} ${sourceCount === 1 ? "fonte conectada" : "fontes conectadas"}`;

  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <p className="sidebar-label">SEU ESPAÇO</p>
      <nav className="nav-list">
        {items.map((item) => (
          <button
            className={`nav-item${activeView === item.id ? " is-active" : ""}`}
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={activeView === item.id ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.id === "favorites" && <span className="nav-accent" />}
          </button>
        ))}
      </nav>
      <div className={`sidebar-note${isLive ? " is-live" : ""}`}>
        <span className="status-dot" />
        <span>{sourceLabel}</span>
      </div>
    </aside>
  );
}
