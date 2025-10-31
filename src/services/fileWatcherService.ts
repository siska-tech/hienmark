/**
 * ファイルウォッチャーサービス
 * Tauriのファイル監視機能とのインターフェース
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

/**
 * ファイル変更イベント
 */
export interface FileChangeEvent {
  eventType: 'created' | 'modified' | 'removed';
  path: string;
}

/**
 * ファイル変更イベントのコールバック
 */
export type FileChangeCallback = (event: FileChangeEvent) => void;

/**
 * ファイル監視を開始
 *
 * @param workspacePath - 監視するワークスペースのパス
 */
export async function startFileWatcher(workspacePath: string): Promise<void> {
  await invoke('start_file_watcher', { workspacePath });
}

/**
 * ファイル監視を停止
 */
export async function stopFileWatcher(): Promise<void> {
  await invoke('stop_file_watcher');
}

/**
 * ファイル変更イベントをリッスン
 *
 * @param callback - イベント発生時のコールバック関数
 * @returns アンリッスン関数
 */
export async function listenToFileChanges(
  callback: FileChangeCallback
): Promise<UnlistenFn> {
  return await listen<FileChangeEvent>('file-change', (event) => {
    console.log('File change event received:', event.payload);
    callback(event.payload);
  });
}
