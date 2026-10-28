import { useState } from "react";
import Icon from "./Icon.jsx";
import ThemeSwitcher from "./ThemeSwitcher.jsx";
import { openExternalUrl } from "../services/desktop.js";
import { fontSizeLevels, fontSizeScale } from "../services/fontSize.js";

const repositoryUrl = "https://github.com/httpjeffersom/papers-news";

export default function SettingsView({
  theme,
  onThemeChange,
  fontSize,
  onFontSizeChange,
}) {
  const selectedLevel = fontSizeLevels[fontSize];
  const [repositoryError, setRepositoryError] = useState("");

  function handleSliderChange(event) {
    onFontSizeChange(Number(event.target.value));
  }

  async function handleOpenRepository() {
    setRepositoryError("");
    try {
      await openExternalUrl(repositoryUrl);
    } catch (error) {
      console.error("Não foi possível abrir o repositório:", error);
      setRepositoryError("Não foi possível abrir o navegador.");
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

  return (
    <section className="settings-section">
      <div className="feed-heading">
        <div className="feed-heading-main">
          <h1>Configurações</h1>
          <p className="feed-note">deixe o seu espaço com a sua cara</p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon">
            <Icon name="sun" />
          </span>
          <div>
            <h2>Aparência</h2>
            <p>Escolha como o Papers News deve ser exibido.</p>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-title">Tema</span>
            <span className="settings-hint">
              Claro para o dia, escuro para ambientes com pouca luz.
            </span>
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
            <h2>Leitura</h2>
            <p>Ajuste o texto do feed e do modo de leitura.</p>
          </div>
        </div>

        <div className="settings-row is-stacked">
          <div className="settings-row-label">
            <span className="settings-row-title">Tamanho do texto</span>
            <span className="settings-hint">
              {selectedLevel.label} — o tamanho vale para toda a interface.
            </span>
          </div>

          <div className="font-size-picker">
            <div
              className="font-size-options"
              role="radiogroup"
              aria-label="Tamanho do texto"
              onKeyDown={handleOptionsKeyDown}
            >
              {fontSizeLevels.map((level, index) => {
                const isChecked = fontSize === index;
                return (
                  <button
                    key={level.id}
                    className="font-size-option"
                    type="button"
                    role="radio"
                    aria-checked={isChecked}
                    aria-label={level.label}
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
                    <span className="font-size-label">{level.label}</span>
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
              aria-label="Tamanho do texto"
              aria-valuetext={selectedLevel.label}
              style={{
                "--slider-progress": `${
                  (fontSize / (fontSizeLevels.length - 1)) * 100
                }%`,
              }}
            />
            <div className="font-size-scale" aria-hidden="true">
              <span>Pequeno</span>
              <span>Maior</span>
            </div>
          </div>
        </div>

        <div className="font-preview" aria-live="polite">
          <p className="font-preview-kicker">PRÉ-VISUALIZAÇÃO</p>
          <p className="font-preview-title">
            Uma leitura confortável, do seu jeito
          </p>
          <p className="font-preview-text">
            As notícias aparecem em ordem cronológica, com espaço para
            respirar. Ajuste o tamanho até encontrar o que funciona melhor
            para você.
          </p>
          <span
            className="font-preview-meter"
            style={{ width: `${fontSizeScale(fontSize) * 100 - 80}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <p className="settings-footnote">
        Suas preferências ficam salvas apenas neste computador.
      </p>

      <div className="settings-privacy">
        <div className="settings-privacy-text">
          <p className="settings-privacy-title">Sem coleta de dados</p>
          <p>
            Não coletamos nada: fontes, notícias e favoritos ficam salvos
            localmente, no seu computador. O código é aberto e você pode
            conferi-lo no repositório do projeto.
          </p>
        </div>

        <button
          className="settings-link-button"
          type="button"
          onClick={handleOpenRepository}
        >
          <Icon name="external" />
          Abrir repositório no GitHub
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
