import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import ThemeSwitcher from "./ThemeSwitcher.jsx";
import { useI18n } from "../i18n/LanguageContext.jsx";
import { openExternalUrl } from "../services/desktop.js";
import { fontSizeLabel, fontSizeLevels, fontSizeScale } from "../services/fontSize.js";
import {
  articleRetentionPresets,
  clampArticleRetentionDays,
  maxArticleRetentionDays,
} from "../utils/articleRetention.js";

const repositoryUrl = "https://github.com/httpjeffersom/papers-news";

export default function SettingsView({
  theme,
  onThemeChange,
  fontSize,
  onFontSizeChange,
  retentionDays,
  onRetentionDaysChange,
}) {
  const { t } = useI18n();
  const selectedLevel = fontSizeLabel(fontSize);
  const [repositoryError, setRepositoryError] = useState("");
  const [isCustomRetention, setIsCustomRetention] = useState(
    () => !articleRetentionPresets.includes(retentionDays),
  );
  const [customRetentionValue, setCustomRetentionValue] = useState(
    () => String(retentionDays),
  );

  useEffect(() => {
    setCustomRetentionValue(String(retentionDays));
  }, [retentionDays]);

  function handleSliderChange(event) {
    onFontSizeChange(Number(event.target.value));
  }

  async function handleOpenRepository() {
    setRepositoryError("");
    try {
      await openExternalUrl(repositoryUrl);
    } catch (error) {
      console.error("Não foi possível abrir o repositório:", error);
      setRepositoryError(t("settings.repositoryError"));
    }
  }

  function handleOptionsKeyDown(event) {
    let next = null;
    const last = fontSizeLevels.length - 1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (fontSize + 1) % fontSizeLevels.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (fontSize - 1 + fontSizeLevels.length) % fontSizeLevels.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    }

    if (next === null) return;
    event.preventDefault();
    onFontSizeChange(next);
    event.currentTarget
      .querySelectorAll('[role="radio"]')
      [next]?.focus();
  }

  function selectRetentionPreset(days) {
    setIsCustomRetention(false);
    onRetentionDaysChange(days);
  }

  function selectCustomRetention() {
    setIsCustomRetention(true);
  }

  function handleRetentionKeyDown(event) {
    if (!event.target.closest(".retention-option")) return;

    const options = [...event.currentTarget.querySelectorAll('[role="radio"]')];
    const currentIndex = options.indexOf(document.activeElement);
    const last = options.length - 1;
    let next = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (currentIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    }

    if (next === null) return;
    event.preventDefault();

    const nextOption = options[next];
    if (nextOption.dataset.retentionDays === "custom") {
      selectCustomRetention();
    } else {
      selectRetentionPreset(Number(nextOption.dataset.retentionDays));
    }
    nextOption.focus();
  }

  function handleCustomRetentionChange(event) {
    const value = event.target.value;
    setCustomRetentionValue(value);

    const days = Number(value);
    if (
      Number.isInteger(days) &&
      days >= 1 &&
      days <= maxArticleRetentionDays
    ) {
      onRetentionDaysChange(days);
    }
  }

  function handleCustomRetentionBlur() {
    if (customRetentionValue.trim() === "") {
      setCustomRetentionValue(String(retentionDays));
      return;
    }

    const days = clampArticleRetentionDays(customRetentionValue);
    setCustomRetentionValue(String(days));
    if (days !== retentionDays) onRetentionDaysChange(days);
  }

  function handleCustomRetentionKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <section className="settings-section">
      <div className="feed-heading">
        <div className="feed-heading-main">
          <h1>{t("settings.title")}</h1>
          <p className="feed-note">{t("settings.note")}</p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon">
            <Icon name="settings" />
          </span>
          <div>
            <h2>{t("settings.language")}</h2>
            <p>{t("settings.languageText")}</p>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-title">{t("settings.language")}</span>
            <span className="settings-hint">{t("settings.languageHint")}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon">
            <Icon name="sun" />
          </span>
          <div>
            <h2>{t("settings.appearance")}</h2>
            <p>{t("settings.appearanceText")}</p>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-title">{t("settings.theme")}</span>
            <span className="settings-hint">{t("settings.themeHint")}</span>
          </div>
          <ThemeSwitcher theme={theme} onChange={onThemeChange} />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon">
            <Icon name="read" />
          </span>
          <div>
            <h2>{t("settings.reading")}</h2>
            <p>{t("settings.readingText")}</p>
          </div>
        </div>

        <div className="settings-row is-stacked">
          <div className="settings-row-label">
            <span className="settings-row-title">{t("settings.fontSize")}</span>
            <span className="settings-hint">
              {t("settings.fontSizeHint", { level: selectedLevel })}
            </span>
          </div>

          <div className="font-size-picker">
            <div
              className="font-size-options"
              role="radiogroup"
              aria-label={t("settings.fontSizeAria")}
              onKeyDown={handleOptionsKeyDown}
            >
              {fontSizeLevels.map((level, index) => {
                const isChecked = fontSize === index;
                const label = fontSizeLabel(index);
                return (
                  <button
                    key={level.id}
                    className="font-size-option"
                    type="button"
                    role="radio"
                    aria-checked={isChecked}
                    aria-label={label}
                    tabIndex={isChecked ? 0 : -1}
                    onClick={() => onFontSizeChange(index)}
                  >
                    <span
                      className="font-size-sample"
                      style={{ fontSize: `${0.85 + index * 0.18}rem` }}
                      aria-hidden="true"
                    >
                      A
                    </span>
                    <span className="font-size-label">{label}</span>
                  </button>
                );
              })}
            </div>

            <input
              className="font-size-slider"
              type="range"
              min={0}
              max={fontSizeLevels.length - 1}
              step={1}
              value={fontSize}
              onChange={handleSliderChange}
              aria-label={t("settings.fontSizeAria")}
              aria-valuetext={selectedLevel}
              style={{
                "--slider-progress": `${
                  (fontSize / (fontSizeLevels.length - 1)) * 100
                }%`,
              }}
            />
            <div className="font-size-scale" aria-hidden="true">
              <span>{t("settings.fontScaleSmall")}</span>
              <span>{t("settings.fontScaleLarge")}</span>
            </div>
          </div>
        </div>

        <div className="font-preview" aria-live="polite">
          <p className="font-preview-kicker">{t("settings.previewKicker")}</p>
          <p className="font-preview-title">{t("settings.previewTitle")}</p>
          <p className="font-preview-text">{t("settings.previewText")}</p>
          <span
            className="font-preview-meter"
            style={{ width: `${fontSizeScale(fontSize) * 100 - 80}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon">
            <Icon name="trash" />
          </span>
          <div>
            <h2>{t("settings.storage")}</h2>
            <p>{t("settings.storageText")}</p>
          </div>
        </div>

        <div className="settings-row is-stacked">
          <div className="settings-row-label">
            <span className="settings-row-title">{t("settings.retention")}</span>
            <span className="settings-hint">
              {t("settings.retentionHint", { days: retentionDays })}
            </span>
          </div>

          <div className="retention-picker">
            <div
              className="retention-options"
              role="radiogroup"
              aria-label={t("settings.retentionAria")}
              onKeyDown={handleRetentionKeyDown}
            >
              {articleRetentionPresets.map((days) => {
                const isChecked = !isCustomRetention && retentionDays === days;

                return (
                  <button
                    key={days}
                    className="retention-option"
                    type="button"
                    role="radio"
                    aria-checked={isChecked}
                    data-retention-days={days}
                    tabIndex={isChecked ? 0 : -1}
                    onClick={() => selectRetentionPreset(days)}
                  >
                    <span className="retention-value">{days}</span>
                    <span className="retention-unit">
                      {days === 1 ? t("settings.day") : t("settings.days")}
                    </span>
                  </button>
                );
              })}

              <button
                className="retention-option"
                type="button"
                role="radio"
                aria-checked={isCustomRetention}
                data-retention-days="custom"
                tabIndex={isCustomRetention ? 0 : -1}
                onClick={selectCustomRetention}
              >
                <span className="retention-value" aria-hidden="true">
                  ···
                </span>
                <span className="retention-unit">{t("settings.custom")}</span>
              </button>
            </div>

            {isCustomRetention && (
              <label className="retention-custom" htmlFor="retention-days">
                <span>{t("settings.custom")}</span>
                <span className="retention-custom-field">
                  <input
                    id="retention-days"
                    type="number"
                    min="1"
                    max={maxArticleRetentionDays}
                    step="1"
                    inputMode="numeric"
                    value={customRetentionValue}
                    onChange={handleCustomRetentionChange}
                    onBlur={handleCustomRetentionBlur}
                    onKeyDown={handleCustomRetentionKeyDown}
                  />
                  <span>{t("settings.days")}</span>
                </span>
              </label>
            )}
          </div>
        </div>
      </div>

      <p className="settings-footnote">{t("settings.footnote")}</p>

      <div className="settings-privacy">
        <div className="settings-privacy-text">
          <p className="settings-privacy-title">{t("settings.privacyTitle")}</p>
          <p>{t("settings.privacyText")}</p>
        </div>

        <button
          className="settings-link-button"
          type="button"
          onClick={handleOpenRepository}
        >
          <Icon name="external" />
          {t("settings.repository")}
        </button>

        {repositoryError && (
          <p className="inline-error settings-privacy-error" role="alert">
            {repositoryError}
          </p>
        )}
      </div>
    </section>
  );
}
