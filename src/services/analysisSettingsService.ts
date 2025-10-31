/**
 * 分析設定管理サービス
 * チャートマッピング設定の永続化を担当
 */

import { invoke } from '@tauri-apps/api/core';
import type { AnalysisSettings } from '../types/task';

/**
 * 分析設定を読み込む
 * @param workspacePath - ワークスペースのルートパス
 * @returns 分析設定（存在しない場合はデフォルト設定）
 */
export async function loadAnalysisSettings(workspacePath: string): Promise<AnalysisSettings> {
  try {
    const settingsJson = await invoke<string>('load_analysis_settings', { workspacePath });
    
    if (!settingsJson || settingsJson === '{}') {
      return getDefaultAnalysisSettings();
    }
    
    return JSON.parse(settingsJson) as AnalysisSettings;
  } catch (error) {
    console.error('Failed to load analysis settings:', error);
    return getDefaultAnalysisSettings();
  }
}

/**
 * 分析設定を保存
 * @param workspacePath - ワークスペースのルートパス
 * @param settings - 保存する分析設定
 */
export async function saveAnalysisSettings(
  workspacePath: string,
  settings: AnalysisSettings
): Promise<void> {
  const settingsJson = JSON.stringify(settings);
  await invoke('save_analysis_settings', { workspacePath, settingsJson });
}

/**
 * デフォルトの分析設定を取得
 */
function getDefaultAnalysisSettings(): AnalysisSettings {
  return {
    chartMappings: {
      gantt: {
        type: 'gantt',
        mapping: {},
      },
      pie: {
        type: 'pie',
        mapping: { value: '__default_count__' },
      },
      bar: {
        type: 'bar',
        mapping: { value: '__default_count__' },
      },
      line: {
        type: 'line',
        mapping: {},
      },
    },
  };
}

