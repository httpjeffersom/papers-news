import Icon from "./Icon.jsx";
import packageJson from "../../package.json";
import { useI18n } from "../i18n/LanguageContext.jsx";

const items = [
  { id: "all", labelKey: "nav.all", icon: "feed" },
  { id: "favorites", labelKey: "nav.favorites", icon: "bookmark" },
  { id: "sources", labelKey: "nav.sources", icon: "source" },
];

const settingsItem = { id: "settings", labelKey: "nav.settings", icon: "settings" };

export default function Navigation({ activeView, onChange }) {
  const { t } = useI18n();

  return (
    <aside className="sidebar" aria-label={t("nav.aria")}>
      <p className="sidebar-label">{t("nav.space")}</p>
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
            <span>{t(item.labelKey)}</span>
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
          <span>{t(settingsItem.labelKey)}</span>
        </button>
        <p className="sidebar-note">
          {t("nav.version", { version: packageJson.version })}
        </p>
      </div>
    </aside>
  );
}
