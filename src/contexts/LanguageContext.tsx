import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Translations } from '../i18n/types';
import { translations } from '../i18n/locales';
import { languageService } from '../services/languageService';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Initialize from localStorage for instant UI rendering
    return languageService.getLanguageLocal();
  });

  useEffect(() => {
    // Load language from persistent storage
    const loadLanguage = async () => {
      const lang = await languageService.getLanguage();
      setLanguageState(lang);
    };
    loadLanguage();
  }, []);

  const setLanguage = async (newLanguage: Language) => {
    // Update state immediately for responsive UI
    setLanguageState(newLanguage);

    // Save to localStorage for quick access
    languageService.setLanguageLocal(newLanguage);

    // Save to persistent storage
    try {
      await languageService.setLanguage(newLanguage);
    } catch (error) {
      console.error('Failed to save language setting:', error);
      // Note: We don't revert the state here to maintain UI responsiveness
    }
  };

  const t = translations[language];

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to access language context
 */
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
