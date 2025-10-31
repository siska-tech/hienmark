import { useState, useEffect } from 'react';
import type { ThemeType } from '../types/task';
import { WorkspaceConfigService } from '../services/workspaceConfigService';

/**
 * テーマ管理フック
 * アプリケーション全体のテーマを管理する
 */
export function useTheme(workspacePath: string | null) {
  const [theme, setTheme] = useState<ThemeType>('HienMark Dark');

  useEffect(() => {
    if (workspacePath) {
      loadTheme();
    } else {
      // ワークスペースがない場合はデフォルトのダークテーマを適用
      applyTheme('HienMark Dark');
    }
  }, [workspacePath]);

  const loadTheme = async () => {
    if (!workspacePath) return;

    try {
      const config = await WorkspaceConfigService.getConfig(workspacePath);
      const themeToUse = config.theme || 'HienMark Dark';
      setTheme(themeToUse);
      applyTheme(themeToUse);
    } catch (error) {
      console.error('Failed to load theme:', error);
      applyTheme('HienMark Dark');
    }
  };

  const applyTheme = (newTheme: ThemeType) => {
    const root = document.documentElement;
    if (newTheme === 'HienMark White') {
      root.setAttribute('data-theme', 'hienmark-white');
    } else {
      root.setAttribute('data-theme', 'hienmark-dark');
    }
  };

  const updateTheme = async (newTheme: ThemeType) => {
    if (!workspacePath) {
      setTheme(newTheme);
      applyTheme(newTheme);
      return;
    }

    try {
      const config = await WorkspaceConfigService.getConfig(workspacePath);
      config.theme = newTheme;
      await WorkspaceConfigService.updateConfig(workspacePath, config);
      setTheme(newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return { theme, updateTheme };
}

