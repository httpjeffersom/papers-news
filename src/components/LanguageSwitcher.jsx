import Icon from "./Icon.jsx";
import { useI18n } from "../i18n/LanguageContext.jsx";
import { languages } from "../services/i18n.js";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  function handleKeyDown(event) {
    const currentIndex = languages.findIndex((item) => item.id === language);
    let nextIndex = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % languages.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + languages.length) % languages.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = languages.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    setLanguage(languages[nextIndex].id);
    event.currentTarget.querySelectorAll('[role="radio"]')[nextIndex]?.focus();
  }

  return (
    <div
      className="language-picker"
      role="radiogroup"
      aria-label={t("settings.language")}
      onKeyDown={handleKeyDown}
    >
      {languages.map((option) => {
        const isChecked = language === option.id;

        return (
          <button
            key={option.id}
            className="language-choice"
            type="button"
            role="radio"
            aria-checked={isChecked}
            aria-label={option.label}
            data-language-choice={option.id}
            tabIndex={isChecked ? 0 : -1}
            onClick={() => setLanguage(option.id)}
          >
            <span className="language-choice-code" aria-hidden="true">
              {option.code}
            </span>
            <span className="language-choice-label">{option.label}</span>
            <span className="theme-choice-check" aria-hidden="true">
              <Icon name="check" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
