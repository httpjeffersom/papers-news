import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  defaultTheme,
  isThemePreference,
  loadThemePreference,
  saveThemePreference,
} from "../services/theme.js";

export function useTheme() {
  const [theme, setThemeState] = useState(loadThemePreference);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveThemePreference(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(isThemePreference(next) ? next : defaultTheme);
  }, []);

  return { theme, setTheme };
}
