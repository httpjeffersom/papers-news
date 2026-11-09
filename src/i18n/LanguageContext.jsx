import { createContext, useContext } from "react";
import { useLanguage } from "../hooks/useLanguage.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const value = useLanguage();
  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useI18n precisa estar dentro de LanguageProvider.");
  }

  return context;
}
