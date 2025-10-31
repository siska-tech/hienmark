/**
 * タグスキーマ管理のためのフロントエンドサービス
 * Tauriバックエンドとの通信を担当
 */

import { invoke } from '@tauri-apps/api/core';
import type { TagSchema } from '../types/task';

/**
 * タグスキーマを読み込む
 *
 * @param workspacePath - ワークスペースのルートパス
 * @returns タグスキーマ
 */
export async function loadTagSchema(workspacePath: string): Promise<TagSchema> {
  try {
    const schemaJson = await invoke<string>('load_tag_schema', { workspacePath });
    
    if (!schemaJson || schemaJson === '{}') {
      return {};
    }
    
    return JSON.parse(schemaJson) as TagSchema;
  } catch (error) {
    console.error('Failed to load tag schema:', error);
    return {};
  }
}

/**
 * タグスキーマを保存
 *
 * @param workspacePath - ワークスペースのルートパス
 * @param schema - 保存するタグスキーマ
 */
export async function saveTagSchema(workspacePath: string, schema: TagSchema): Promise<void> {
  const schemaJson = JSON.stringify(schema);
  await invoke('save_tag_schema', { workspacePath, schemaJson });
}

/**
 * 動的デフォルト値を計算
 *
 * @param formula - 計算式（例: `=[TODAY]+30`）
 * @returns 計算結果のISO 8601形式の文字列
 */
export async function getDynamicDefaultValue(formula: string): Promise<string> {
  return await invoke<string>('get_dynamic_default_value', { formula });
}
