import Icon from "./Icon.jsx";
import { useI18n } from "../i18n/LanguageContext.jsx";

export default function Header({
  search,
  onSearchChange,
  onRefresh,
  onHome,
  isRefreshing,
  isSourcesView,
  isSettingsView,
}) {
  const { t } = useI18n();
  const searchPlaceholder = isSourcesView
    ? t("search.sources")
    : t("search.feed");

  return (
    <header className={`topbar${isSettingsView ? " topbar-settings" : ""}`}>
      <button
        className="brand"
        type="button"
        onClick={onHome}
        aria-label={t("app.brandAria")}
      >
        <img
          className="brand-icon"
          src="/app-icon-header.png"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <span className="brand-name">Papers News</span>
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
          aria-label={
            isRefreshing ? t("refresh.updatingAria") : t("refresh.updateAria")
          }
        >
          <Icon name="refresh" />
          <span>
            {isRefreshing ? t("refresh.updating") : t("refresh.update")}
          </span>
        </button>
      </div>
    </header>
  );
}
