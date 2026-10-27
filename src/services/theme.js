export const themeStorageKey = "papers-news:theme:v1";

export const themePreferences = ["light", "dark"];

export const defaultTheme = "light";

export function isThemePreference(value) {
  return themePreferences.includes(value);
}

export function loadThemePreference() {
  try {
    const stored = globalThis.localStorage?.getItem(themeStorageKey);
    return isThemePreference(stored) ? stored : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

export function saveThemePreference(preference) {
  try {
    globalThis.localStorage?.setItem(themeStorageKey, preference);
  } catch {
    // Sem armazenamento disponível: o tema ainda funciona na sessão atual.
  }
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", theme === "dark" ? "#1f1f1f" : "#f3f3f3");
  }
}
