import Icon from "./Icon.jsx";
import packageJson from "../../package.json";

const items = [
  { id: "all", label: "Todas as notícias", icon: "feed" },
  { id: "favorites", label: "Favoritos", icon: "bookmark" },
  { id: "sources", label: "Fontes", icon: "source" },
];

const settingsItem = { id: "settings", label: "Configurações", icon: "settings" };

export default function Navigation({ activeView, onChange }) {
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

      <div className="sidebar-footer">
        <button
          className={`nav-item${activeView === settingsItem.id ? " is-active" : ""}`}
          type="button"
          onClick={() => onChange(settingsItem.id)}
          aria-current={activeView === settingsItem.id ? "page" : undefined}
        >
          <Icon name={settingsItem.icon} />
          <span>{settingsItem.label}</span>
        </button>
        <p className="sidebar-note">versão {packageJson.version}</p>
      </div>
    </aside>
  );
}
