import Icon from "./Icon.jsx";

const options = [
  { value: "light", label: "Claro", icon: "sun" },
  { value: "dark", label: "Escuro", icon: "moon" },
];

export default function ThemeSwitcher({ theme, onChange }) {
  function handleKeyDown(event) {
    const currentIndex = options.findIndex((option) => option.value === theme);
    let nextIndex = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    onChange(options[nextIndex].value);
    event.currentTarget.querySelectorAll('[role="radio"]')[nextIndex]?.focus();
  }

  return (
    <div
      className="theme-picker"
      role="radiogroup"
      aria-label="Tema da interface"
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const isChecked = theme === option.value;
        return (
          <button
            key={option.value}
            className="theme-choice"
            type="button"
            role="radio"
            aria-checked={isChecked}
            aria-label={`Tema ${option.label.toLocaleLowerCase("pt-BR")}`}
            data-theme-choice={option.value}
            tabIndex={isChecked ? 0 : -1}
            onClick={() => onChange(option.value)}
          >
            <span className="theme-choice-preview" aria-hidden="true">
              <span className="theme-choice-preview-bar" />
              <span className="theme-choice-preview-body">
                <span className="theme-choice-preview-letter">Aa</span>
                <span className="theme-choice-preview-lines">
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            </span>

            <span className="theme-choice-label">
              <Icon name={option.icon} />
              <span>{option.label}</span>
              <span className="theme-choice-check">
                <Icon name="check" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
