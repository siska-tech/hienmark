/**
 * 設定画面のナビゲーションパネル（マスターパネル）
 */

import type { Translations } from '../../i18n/types';
import './Settings.css';

interface SettingsNavigationProps {
  activeSection: 'general' | 'tags' | 'editor' | 'filters' | 'workflow' | 'advanced' | 'analysis' | 'about';
  onSelectSection: (section: 'general' | 'tags' | 'editor' | 'filters' | 'workflow' | 'advanced' | 'analysis' | 'about') => void;
  t: Translations;
}

export function SettingsNavigation({ activeSection, onSelectSection, t }: SettingsNavigationProps) {
  return (
    <div className="settings-nav-panel">
      <button
        className={`nav-button ${activeSection === 'general' ? 'active' : ''}`}
        onClick={() => onSelectSection('general')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="21" x2="4" y2="14"></line>
          <line x1="4" y1="10" x2="4" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="3"></line>
          <line x1="20" y1="21" x2="20" y2="16"></line>
          <line x1="20" y1="12" x2="20" y2="3"></line>
          <line x1="1" y1="14" x2="7" y2="14"></line>
          <line x1="9" y1="8" x2="15" y2="8"></line>
          <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
        <span>{t.settings.general}</span>
      </button>

      <button
        className={`nav-button ${activeSection === 'tags' ? 'active' : ''}`}
        onClick={() => onSelectSection('tags')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <circle cx="7" cy="7" r="1"></circle>
        </svg>
        <span>{t.tagConfig.title}</span>
      </button>

      <button
        className={`nav-button ${activeSection === 'editor' ? 'active' : ''}`}
        onClick={() => onSelectSection('editor')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <path d="M14 2v6h6"></path>
          <path d="M16 13H8"></path>
          <path d="M16 17H8"></path>
          <path d="M10 9H8"></path>
        </svg>
        <span>{t.settings.editor}</span>
      </button>

      <button
        className={`nav-button ${activeSection === 'workflow' ? 'active' : ''}`}
        onClick={() => onSelectSection('workflow')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
        <span>{t.settings.workflow}</span>
      </button>

      <button
        className={`nav-button ${activeSection === 'advanced' ? 'active' : ''}`}
        onClick={() => onSelectSection('advanced')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
        <span>{t.settings.advanced}</span>
      </button>

      <button
        className={`nav-button ${activeSection === 'analysis' ? 'active' : ''}`}
        onClick={() => onSelectSection('analysis')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span>{t.settings.analysis}</span>
      </button>

      <button
        className={`nav-button ${activeSection === 'filters' ? 'active' : ''}`}
        onClick={() => onSelectSection('filters')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        <span>{t.tagConfig.customFilterSort}</span>
      </button>

      <button
        className={`nav-button ${activeSection === 'about' ? 'active' : ''}`}
        onClick={() => onSelectSection('about')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>{t.settings.about}</span>
      </button>
    </div>
  );
}

