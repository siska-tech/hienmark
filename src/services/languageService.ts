import { invoke } from '@tauri-apps/api/core';
import { Language } from '../i18n/types';
import { DEFAULT_LANGUAGE } from '../i18n/locales';

const LANGUAGE_KEY = 'app_language';

export interface LanguageSettings {
  language: Language;
}

/**
 * Language service for managing language preferences
 */
export const languageService = {
  /**
   * Get the current language setting
   */
  async getLanguage(): Promise<Language> {
    try {
      const settings = await invoke<LanguageSettings | null>('get_app_settings', {
        key: LANGUAGE_KEY,
      });
      return settings?.language || DEFAULT_LANGUAGE;
    } catch (error) {
      console.error('Failed to get language setting:', error);
      return DEFAULT_LANGUAGE;
    }
  },

  /**
   * Save the language setting
   */
  async setLanguage(language: Language): Promise<void> {
    try {
      const settings: LanguageSettings = { language };
      await invoke('save_app_settings', {
        key: LANGUAGE_KEY,
        value: settings,
      });
    } catch (error) {
      console.error('Failed to save language setting:', error);
      throw error;
    }
  },

  /**
   * Get language from localStorage (fallback for quick access)
   */
  getLanguageLocal(): Language {
    try {
      const stored = localStorage.getItem(LANGUAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored) as LanguageSettings;
        return settings.language;
      }
    } catch (error) {
      console.error('Failed to get language from localStorage:', error);
    }
    return DEFAULT_LANGUAGE;
  },

  /**
   * Save language to localStorage (for quick access)
   */
  setLanguageLocal(language: Language): void {
    try {
      const settings: LanguageSettings = { language };
      localStorage.setItem(LANGUAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save language to localStorage:', error);
    }
  },
};
