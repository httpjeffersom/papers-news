import { useCallback, useEffect, useState } from "react";
import {
  applyLanguage,
  defaultLanguage,
  isLanguage,
  loadLanguage,
  saveLanguage,
  setActiveLanguage,
  translate,
} from "../services/i18n.js";

export function useLanguage() {
  const [language, setLanguageState] = useState(loadLanguage);

  useEffect(() => {
    applyLanguage(language);
    setActiveLanguage(language);
  }, [language]);

  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  const setLanguage = useCallback((next) => {
    const normalized = isLanguage(next) ? next : defaultLanguage;
    // Mantém os serviços (que não são React) no mesmo idioma da interface.
    setActiveLanguage(normalized);
    setLanguageState(normalized);
  }, []);

  const t = useCallback((key, vars) => translate(language, key, vars), [language]);

  return { language, setLanguage, t };
}
