/**
 * ワークスペース設定サービス
 */

import { invoke } from '@tauri-apps/api/core';
import type { WorkspaceConfig } from '../types/task';

export class WorkspaceConfigService {
  /**
   * ワークスペース設定を取得
   * @param workspacePath - ワークスペースのルートパス
   * @returns ワークスペース設定
   */
  static async getConfig(workspacePath: string): Promise<WorkspaceConfig> {
    const raw = await invoke<WorkspaceConfig>('get_workspace_config', { workspacePath });

    // Fill missing fields with sane defaults to avoid runtime errors
    // IMPORTANT: Preserve all existing fields from raw (e.g., editor settings like wordWrap/scrollSync)
    const filled: WorkspaceConfig = {
      ...raw,
      strictTagMode: raw?.strictTagMode ?? false,
      allowedCategories: raw?.allowedCategories ?? [],
      watchEnabled: raw?.watchEnabled ?? true,
      templates: raw?.templates ?? { templates: {} },
      tagConfigs: raw?.tagConfigs ?? { configs: {} },
      theme: raw?.theme ?? 'HienMark Dark',
    } as WorkspaceConfig;

    // Persist defaults back if important sections were missing
    const needsPersist = !raw?.tagConfigs || !raw?.templates || raw?.theme === undefined;
    if (needsPersist) {
      try {
        await this.updateConfig(workspacePath, filled);
      } catch (_) {
        // ignore persistence errors here; UI can still proceed with defaults
      }
    }

    return filled;
  }

  /**
   * ワークスペース設定を更新
   * @param workspacePath - ワークスペースのルートパス
   * @param config - 新しい設定
   */
  static async updateConfig(workspacePath: string, config: WorkspaceConfig): Promise<void> {
    await invoke('update_workspace_config', { workspacePath, config });
  }
}
