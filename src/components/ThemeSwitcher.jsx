import Icon from "./Icon.jsx";

const options = [
  { value: "light", label: "Tema claro", icon: "sun" },
  { value: "dark", label: "Tema escuro", icon: "moon" },
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
      className="theme-switcher"
      role="radiogroup"
      aria-label="Tema da interface"
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const isChecked = theme === option.value;
        return (
          <button
            key={option.value}
            className="theme-option"
            type="button"
            role="radio"
            aria-checked={isChecked}
            aria-label={option.label}
            title={option.label}
            tabIndex={isChecked ? 0 : -1}
            onClick={() => onChange(option.value)}
          >
            <Icon name={option.icon} />
          </button>
        );
      })}
    </div>
  );
}
