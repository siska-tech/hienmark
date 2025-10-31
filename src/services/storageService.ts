/**
 * ローカルストレージサービス
 * アプリケーション設定の永続化
 */

import { Store } from '@tauri-apps/plugin-store';

const STORE_FILE = 'settings.json';
const LAST_WORKSPACE_KEY = 'lastWorkspacePath';

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await Store.load(STORE_FILE);
  }
  return store;
}

export class StorageService {
  /**
   * 最後に開いたワークスペースパスを保存
   */
  static async saveLastWorkspace(path: string): Promise<void> {
    const s = await getStore();
    await s.set(LAST_WORKSPACE_KEY, path);
    await s.save();
  }

  /**
   * 最後に開いたワークスペースパスを取得
   */
  static async getLastWorkspace(): Promise<string | null> {
    const s = await getStore();
    const path = await s.get<string>(LAST_WORKSPACE_KEY);
    return path || null;
  }

  /**
   * 最後に開いたワークスペースパスをクリア
   */
  static async clearLastWorkspace(): Promise<void> {
    const s = await getStore();
    await s.delete(LAST_WORKSPACE_KEY);
    await s.save();
  }
}
