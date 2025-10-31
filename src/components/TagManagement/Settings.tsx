/**
 * 設定コンポーネント
 * タグの固定モード/任意モード切り替えと、許可されたタグの管理
 */

import { useState, useEffect } from 'react';
import type { WorkspaceConfig, TagIndex, ThemeType } from '../../types/task';
import { useLanguage } from '../../contexts/LanguageContext';
import { WorkspaceConfigService } from '../../services/workspaceConfigService';
import { CustomFilterSortManager } from './CustomFilterSortManager';
import { useTemplates } from '../../hooks/useTemplates';
import type { Language } from '../../i18n/types';
import { SettingsNavigation } from './SettingsNavigation';
import { SettingsDetailPanel } from './SettingsDetailPanel';
import './Settings.css';

interface SettingsProps {
  workspacePath: string | null;
  tagIndex: TagIndex | null;
  onClose: () => void;
  currentTheme?: ThemeType;
  onThemeChange?: (theme: ThemeType) => void;
  onConfigUpdate?: (config: WorkspaceConfig) => void;
}

export function Settings({ workspacePath, tagIndex, onClose, currentTheme, onThemeChange, onConfigUpdate }: SettingsProps) {
  const { language, setLanguage, t } = useLanguage();
  const { templates } = useTemplates(workspacePath);
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [showCustomFilterSort, setShowCustomFilterSort] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState('3');
  const [activeSection, setActiveSection] = useState<'general' | 'tags' | 'editor' | 'workflow' | 'advanced' | 'filters' | 'analysis' | 'about'>('general');
  const [editorFontFamily, setEditorFontFamily] = useState('');
  const [editorFontSize, setEditorFontSize] = useState('14');
  const [wordWrap, setWordWrap] = useState(false);
  const [scrollSync, setScrollSync] = useState(true);
  const [defaultTaskTemplate, setDefaultTaskTemplate] = useState('');
  const [defaultSortOrder, setDefaultSortOrder] = useState('modified-desc');
  const [gitIntegration, setGitIntegration] = useState(false);

  const handleLanguageChange = async (newLanguage: Language) => {
    try {
      await setLanguage(newLanguage);
    } catch (error) {
      console.error('Failed to change language:', error);
      alert(t.settings.languageChangeFailed);
    }
  };
  
  const loadConfig = async () => {
    if (!workspacePath) return;

    setLoading(true);
    try {
      const cfg = await WorkspaceConfigService.getConfig(workspacePath);
      // Set default theme if not present
      if (!cfg.theme) {
        cfg.theme = 'HienMark Dark';
      }
      // Set default auto-save settings if not present
      if (cfg.autoSaveEnabled === undefined) {
        cfg.autoSaveEnabled = true;
      }
      if (cfg.autoSaveInterval === undefined) {
        cfg.autoSaveInterval = 3000;
      }
      setConfig(cfg);
      setAutoSaveInterval((cfg.autoSaveInterval / 1000).toString());
      setEditorFontFamily(cfg.editorFontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      setEditorFontSize(cfg.editorFontSize?.toString() || '14');
      setWordWrap(cfg.wordWrap ?? false);
      setScrollSync(cfg.scrollSync ?? true);
      setDefaultTaskTemplate(cfg.defaultTaskTemplate || '');
      setDefaultSortOrder(cfg.defaultSortOrder || 'modified-desc');
      setGitIntegration(cfg.gitIntegration ?? false);
    } catch (error) {
      console.error('Failed to load config:', error);
      alert(`${t.settings.loadFailed}: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleThemeChange = async (theme: ThemeType) => {
    if (!config || !workspacePath) return;
    const newConfig = { ...config, theme };
    setConfig(newConfig);
    
    // Appレベルでテーマ更新
    if (onThemeChange) {
      onThemeChange(theme);
    }
    
    // 自動保存
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  useEffect(() => {
    loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacePath]);

  const handleToggleMode = async () => {
    if (!config || !workspacePath) return;
    const newConfig = {
      ...config,
      strictTagMode: !config.strictTagMode,
    };
    setConfig(newConfig);
    
    // 自動保存
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleAddCategory = async () => {
    if (!config || !workspacePath) return;
    if (!newCategory.trim()) {
      alert(t.tagConfig.tagNameRequired);
      return;
    }

    if (config.allowedCategories.includes(newCategory.trim())) {
      alert(t.tagConfig.tagAlreadyExists);
      return;
    }

    const newConfig = {
      ...config,
      allowedCategories: [...config.allowedCategories, newCategory.trim()],
    };
    setConfig(newConfig);
    setNewCategory('');
    
    // 自動保存
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleRemoveCategory = async (category: string) => {
    if (!config || !workspacePath) return;

    if (!confirm(t.tagConfig.removeTagConfirm(category))) {
      return;
    }

    const newConfig = {
      ...config,
      allowedCategories: config.allowedCategories.filter((c) => c !== category),
    };
    setConfig(newConfig);
    
    // 自動保存
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleToggleAutoSave = async () => {
    if (!config || !workspacePath) return;
    const newConfig = {
      ...config,
      autoSaveEnabled: !config.autoSaveEnabled,
    };
    console.log('🔄 Toggling auto save:', { 
      current: config.autoSaveEnabled, 
      new: newConfig.autoSaveEnabled 
    });
    setConfig(newConfig);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      console.log('✅ Config updated, calling onConfigUpdate');
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleAutoSaveIntervalChange = async () => {
    if (!config || !workspacePath) return;
    
    // 空文字列の場合は何もしない
    if (autoSaveInterval === '') {
      setAutoSaveInterval(String((config.autoSaveInterval ?? 3000) / 1000));
      return;
    }
    
    const seconds = parseInt(autoSaveInterval, 10);
    // 3秒未満の場合は自動的に3秒に修正
    const finalSeconds = isNaN(seconds) || seconds < 3 ? 3 : seconds;
    
    // 修正が必要な場合のみ表示を更新
    if (finalSeconds !== seconds) {
      setAutoSaveInterval(finalSeconds.toString());
    }
    
    const newConfig = {
      ...config,
      autoSaveInterval: finalSeconds * 1000,
    };
    setConfig(newConfig);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleEditorFontFamilyChange = async (fontFamily: string) => {
    if (!config || !workspacePath) return;
    const newConfig = {
      ...config,
      editorFontFamily: fontFamily,
    };
    setConfig(newConfig);
    setEditorFontFamily(fontFamily);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleEditorFontSizeChange = async () => {
    if (!config || !workspacePath) return;
    
    if (editorFontSize === '') {
      setEditorFontSize(String(config.editorFontSize || 14));
      return;
    }
    
    const fontSize = parseInt(editorFontSize, 10);
    const finalFontSize = isNaN(fontSize) || fontSize < 8 ? 14 : fontSize;
    
    if (finalFontSize !== fontSize) {
      setEditorFontSize(finalFontSize.toString());
    }
    
    const newConfig = {
      ...config,
      editorFontSize: finalFontSize,
    };
    setConfig(newConfig);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleWordWrapChange = async () => {
    if (!config || !workspacePath) return;
    const newConfig = {
      ...config,
      wordWrap: !config.wordWrap,
    };
    setConfig(newConfig);
    setWordWrap(!wordWrap);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleScrollSyncChange = async () => {
    if (!config || !workspacePath) return;
    const newConfig = {
      ...config,
      scrollSync: !config.scrollSync,
    };
    setConfig(newConfig);
    setScrollSync(!scrollSync);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleDefaultTaskTemplateChange = async (templateName: string) => {
    if (!config || !workspacePath) return;
    const newConfig = {
      ...config,
      defaultTaskTemplate: templateName,
    };
    setConfig(newConfig);
    setDefaultTaskTemplate(templateName);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleDefaultSortOrderChange = async (sortOrder: string) => {
    if (!config || !workspacePath) return;
    const newConfig = {
      ...config,
      defaultSortOrder: sortOrder,
    };
    setConfig(newConfig);
    setDefaultSortOrder(sortOrder);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };

  const handleGitIntegrationChange = async () => {
    if (!config || !workspacePath) return;
    const newConfig = {
      ...config,
      gitIntegration: !config.gitIntegration,
    };
    setConfig(newConfig);
    setGitIntegration(!gitIntegration);
    
    try {
      await WorkspaceConfigService.updateConfig(workspacePath, newConfig);
      onConfigUpdate?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${t.settings.saveFailed}: ${error}`);
    }
  };


  if (loading) {
    return (
      <div className="tag-settings">
        <div className="tag-settings-header">
          <h2>{t.settings.title}</h2>
          <button className="btn-close" onClick={onClose} title={t.common.close} aria-label={t.common.close}>
            ×
          </button>
        </div>
        <div className="tag-settings-content">
          <p>{t.tagConfig.loading}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="tag-settings">
        <div className="tag-settings-header">
          <h2>{t.settings.title}</h2>
          <button className="btn-close" onClick={onClose} title={t.common.close} aria-label={t.common.close}>
            ×
          </button>
        </div>
        <div className="tag-settings-content">
          <p>{t.tagConfig.loadError}</p>
        </div>
      </div>
    );
  }

  if (showCustomFilterSort) {
    return (
      <CustomFilterSortManager
        workspacePath={workspacePath}
        tagIndex={tagIndex}
        onClose={() => setShowCustomFilterSort(false)}
      />
    );
  }

  return (
      <div className="tag-settings">
      <div className="tag-settings-header">
        <h2>{t.settings.title}</h2>
        <button className="btn-close" onClick={onClose} title={t.common.close} aria-label={t.common.close}>
          ×
        </button>
      </div>

      <div className="tag-settings-content">
        <SettingsNavigation 
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          t={t}
        />
        
        <SettingsDetailPanel
          activeSection={activeSection}
          config={config}
          language={language}
          currentTheme={currentTheme}
          newCategory={newCategory}
          autoSaveInterval={autoSaveInterval}
          editorFontFamily={editorFontFamily}
          editorFontSize={editorFontSize}
          wordWrap={wordWrap}
          scrollSync={scrollSync}
          defaultTaskTemplate={defaultTaskTemplate}
          defaultSortOrder={defaultSortOrder}
          gitIntegration={gitIntegration}
          templates={templates}
          workspacePath={workspacePath}
          tagIndex={tagIndex}
          onLanguageChange={handleLanguageChange}
          onThemeChange={handleThemeChange}
          onToggleMode={handleToggleMode}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
          onNewCategoryChange={setNewCategory}
          onToggleAutoSave={handleToggleAutoSave}
          onAutoSaveIntervalChange={setAutoSaveInterval}
          onAutoSaveIntervalBlur={handleAutoSaveIntervalChange}
          onEditorFontFamilyChange={handleEditorFontFamilyChange}
          onEditorFontSizeChange={setEditorFontSize}
          onEditorFontSizeBlur={handleEditorFontSizeChange}
          onWordWrapChange={handleWordWrapChange}
          onScrollSyncChange={handleScrollSyncChange}
          onDefaultTaskTemplateChange={handleDefaultTaskTemplateChange}
          onDefaultSortOrderChange={handleDefaultSortOrderChange}
          onGitIntegrationChange={handleGitIntegrationChange}
          onShowCustomFilterSort={() => setShowCustomFilterSort(true)}
          t={t}
        />
      </div>
    </div>
  );
}

