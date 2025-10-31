import { Language, Translations } from '../types';
import { ja } from './ja';
import { en } from './en';
import { vi } from './vi';

export const translations: Record<Language, Translations> = {
  ja,
  en,
  vi,
};

export const DEFAULT_LANGUAGE: Language = 'ja';
