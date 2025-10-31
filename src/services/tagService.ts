/**
 * タグ管理サービス
 * バックエンドのタグ関連APIを呼び出す
 */

import { invoke } from '@tauri-apps/api/core';
import type { TagIndex } from '../types/task';

export class TagService {
  /**
   * タグインデックスを取得
   * @param workspacePath - ワークスペースのルートパス
   * @returns タグインデックス
   */
  static async getTagIndex(workspacePath: string): Promise<TagIndex> {
    return await invoke<TagIndex>('get_tag_index', { workspacePath });
  }

  /**
   * タグをリネーム
   * @param workspacePath - ワークスペースのルートパス
   * @param category - タグ名
   * @param oldValue - 古い値
   * @param newValue - 新しい値
   * @returns 更新されたタスク数
   */
  static async renameTag(
    workspacePath: string,
    category: string,
    oldValue: string,
    newValue: string
  ): Promise<number> {
    return await invoke<number>('rename_tag', {
      workspacePath,
      category,
      oldValue,
      newValue,
    });
  }

  /**
   * タグを削除
   * @param workspacePath - ワークスペースのルートパス
   * @param category - タグ名
   * @param value - 削除する値（undefinedの場合はタグごと削除）
   * @returns 更新されたタスク数
   */
  static async deleteTag(
    workspacePath: string,
    category: string,
    value?: string
  ): Promise<number> {
    return await invoke<number>('delete_tag', {
      workspacePath,
      category,
      value: value || null,
    });
  }
}
