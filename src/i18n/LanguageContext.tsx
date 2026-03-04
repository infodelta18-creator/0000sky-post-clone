import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import translations from "./translations";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("awaj-language") || "en";
  });

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("awaj-language", lang);
  }, []);

  // Listen for storage changes (from Settings page)
  useEffect(() => {
    const handler = () => {
      const lang = localStorage.getItem("awaj-language") || "en";
      setLanguageState(lang);
    };
    window.addEventListener("storage", handler);
    // Also poll for same-tab changes
    const interval = setInterval(() => {
      const lang = localStorage.getItem("awaj-language") || "en";
      if (lang !== language) setLanguageState(lang);
    }, 500);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  }, [language]);

  const t = useCallback(
    (key: string): string => {
      const langTranslations = translations[language] || translations.en;
      return langTranslations[key] || translations.en[key] || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
