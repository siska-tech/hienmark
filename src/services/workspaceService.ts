/**
 * Workspace管理のためのフロントエンドサービス
 * Tauriバックエンドとの通信を担当
 */

import { invoke } from '@tauri-apps/api/core';
import type { Task, Workspace } from '../types/task';

/**
 * ワークスペースを開く
 *
 * @param path - ワークスペースのルートディレクトリパス
 * @returns 読み込まれたワークスペース
 */
export async function openWorkspace(path: string): Promise<Workspace> {
  return await invoke<Workspace>('open_workspace', { path });
}

/**
 * ワークスペース内のタスク一覧を取得
 *
 * @param workspacePath - ワークスペースのルートパス
 * @returns タスクIDのリスト
 */
export async function listTasks(workspacePath: string): Promise<string[]> {
  return await invoke<string[]>('list_tasks', { workspacePath });
}

/**
 * 特定のタスクを取得
 *
 * @param workspacePath - ワークスペースのルートパス
 * @param taskId - タスクID
 * @returns タスク
 */
export async function getTask(workspacePath: string, taskId: string): Promise<Task> {
  return await invoke<Task>('get_task', { workspacePath, taskId });
}

/**
 * 新しいタスクを作成
 *
 * @param workspacePath - ワークスペースのルートパス
 * @param taskId - タスクID（ファイル名）
 * @param content - タスクの初期内容
 * @returns 作成されたタスク
 */
export async function createTask(
  workspacePath: string,
  taskId: string,
  content: string
): Promise<Task> {
  return await invoke<Task>('create_task', { workspacePath, taskId, content });
}

/**
 * タスクを保存
 *
 * @param task - 保存するタスク
 */
export async function saveTask(task: Task): Promise<void> {
  await invoke('save_task', { task });
}

/**
 * ワークスペース設定を更新
 *
 * @param workspacePath - ワークスペースのルートパス
 * @param config - 更新する設定
 */
export async function updateWorkspaceConfig(
  workspacePath: string,
  config: Workspace['config']
): Promise<void> {
  await invoke('update_workspace_config', { workspacePath, config });
}

/**
 * タスクを削除
 *
 * @param workspacePath - ワークスペースのルートパス
 * @param taskId - 削除するタスクID
 */
export async function deleteTask(workspacePath: string, taskId: string): Promise<void> {
  await invoke('delete_task', { workspacePath, taskId });
}

/**
 * タスクをリネーム
 *
 * @param workspacePath - ワークスペースのルートパス
 * @param oldTaskId - 古いタスクID
 * @param newTaskId - 新しいタスクID
 */
export async function renameTask(
  workspacePath: string,
  oldTaskId: string,
  newTaskId: string
): Promise<void> {
  await invoke('rename_task', { workspacePath, oldTaskId, newTaskId });
}

/**
 * ディレクトリを作成
 *
 * @param workspacePath - ワークスペースのルートパス
 * @param folderPath - 作成するディレクトリのパス（相対パス）
 */
export async function createFolder(
  workspacePath: string,
  folderPath: string
): Promise<void> {
  await invoke('create_folder', { workspacePath, folderPath });
}

/**
 * タスクをフォルダ間で移動
 *
 * @param workspacePath - ワークスペースのルートパス
 * @param taskId - タスクID（ファイル名）
 * @param sourcePath - 移動元の相対パス
 * @param destPath - 移動先の相対パス
 */
export async function moveTask(
  workspacePath: string,
  taskId: string,
  sourcePath: string,
  destPath: string
): Promise<void> {
  await invoke('move_task', { workspacePath, taskId, sourcePath, destPath });
}