import Icon from "./Icon.jsx";

const items = [
  { id: "all", label: "Todas as notícias", icon: "feed" },
  { id: "favorites", label: "Favoritos", icon: "bookmark" },
  { id: "sources", label: "Fontes", icon: "source" },
  { id: "settings", label: "Configurações", icon: "settings" },
];

export default function Navigation({
  activeView,
  sourceCount,
  isDemoMode,
  onChange,
}) {
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
          </button>
        ))}
      </nav>
      <p className="sidebar-note">{sourceLabel}</p>
    </aside>
  );
}
