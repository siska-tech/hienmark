/**
 * Workspace管理のためのReactカスタムフック
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import type { Workspace, Task } from '../types/task';
import * as workspaceService from '../services/workspaceService';
import * as fileWatcherService from '../services/fileWatcherService';
import { StorageService } from '../services/storageService';
import type { UnlistenFn } from '@tauri-apps/api/event';

interface UseWorkspaceReturn {
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
  openWorkspace: () => Promise<void>;
  loadWorkspaceFromPath: (path: string) => Promise<void>;
  getTask: (taskId: string) => Promise<Task | null>;
  createTask: (taskId: string, content: string) => Promise<Task | null>;
  saveTask: (task: Task) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  renameTask: (oldTaskId: string, newTaskId: string) => Promise<boolean>;
  updateWorkspaceConfig: (config: Partial<Workspace['config']>) => Promise<boolean>;
  updateTask: (task: Task) => void;
  reloadWorkspace: () => Promise<void>;
}

/**
 * ワークスペース管理フック
 */
export function useWorkspace(): UseWorkspaceReturn {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // ファイル変更イベントのリスナーをセットアップ
  useEffect(() => {
    const setupFileWatcher = async () => {
      if (!workspace) return;

      try {
        // ファイル監視を開始
        await fileWatcherService.startFileWatcher(workspace.rootPath);
        console.log('File watcher started for:', workspace.rootPath);

        // ファイル変更イベントをリッスン
        const unlisten = await fileWatcherService.listenToFileChanges((event) => {
          console.log('File change detected:', event);
          handleFileChange(event);
        });

        unlistenRef.current = unlisten;
      } catch (err) {
        console.error('Failed to setup file watcher:', err);
      }
    };

    setupFileWatcher();

    // クリーンアップ
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      if (workspace) {
        fileWatcherService.stopFileWatcher().catch(console.error);
      }
    };
  }, [workspace?.rootPath]);

  /**
   * ファイル変更を処理
   */
  const handleFileChange = useCallback(
    async (event: fileWatcherService.FileChangeEvent) => {
      if (!workspace) return;

      // ファイル名からタスクIDを抽出
      const pathParts = event.path.split(/[\\/]/);
      const fileName = pathParts[pathParts.length - 1];
      const taskId = fileName.replace('.md', '');

      console.log(`File ${event.eventType}:`, taskId);

      try {
        if (event.eventType === 'removed') {
          // タスクを削除
          setWorkspace((prev) => {
            if (!prev) return prev;
            const { [taskId]: removed, ...remainingTasks } = prev.tasks;
            return {
              ...prev,
              tasks: remainingTasks,
            };
          });
        } else {
          // タスクを再読み込み
          const updatedTask = await workspaceService.getTask(workspace.rootPath, taskId);
          setWorkspace((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              tasks: {
                ...prev.tasks,
                [taskId]: updatedTask,
              },
            };
          });
        }
      } catch (err) {
        console.error('Failed to handle file change:', err);
      }
    },
    [workspace]
  );

  /**
   * パスからワークスペースを読み込む
   */
  const loadWorkspaceFromPath = useCallback(async (pathString: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading workspace from:', pathString);

      // ワークスペースを読み込む
      const ws = await workspaceService.openWorkspace(pathString);
      console.log('Workspace loaded successfully:', ws);
      setWorkspace(ws);

      // 最後に開いたワークスペースとして保存
      await StorageService.saveLastWorkspace(pathString);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error in loadWorkspaceFromPath:', err);
      setError(`Failed to open workspace: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ワークスペースディレクトリを開く
   */
  const openWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Opening directory dialog...');

      // ディレクトリ選択ダイアログを表示
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Workspace Directory',
      });

      console.log('Selected path:', selectedPath, 'Type:', typeof selectedPath);

      if (!selectedPath) {
        console.log('No directory selected');
        setLoading(false);
        return;
      }

      // selectedPathが配列の場合は最初の要素を使用
      const pathString = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;

      await loadWorkspaceFromPath(pathString);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error in openWorkspace:', err);
      setError(`Failed to open workspace: ${errorMessage}`);
      setLoading(false);
    }
  }, [loadWorkspaceFromPath]);

  /**
   * タスクを取得
   */
  const getTask = useCallback(
    async (taskId: string): Promise<Task | null> => {
      if (!workspace) {
        setError('No workspace opened');
        return null;
      }

      try {
        const task = await workspaceService.getTask(workspace.rootPath, taskId);
        return task;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get task');
        console.error('Failed to get task:', err);
        return null;
      }
    },
    [workspace]
  );

  /**
   * 新しいタスクを作成
   */
  const createTask = useCallback(
    async (taskId: string, content: string): Promise<Task | null> => {
      if (!workspace) {
        setError('No workspace opened');
        return null;
      }

      try {
        const task = await workspaceService.createTask(workspace.rootPath, taskId, content);

        // ワークスペースの状態を更新
        setWorkspace((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: {
              ...prev.tasks,
              [task.id]: task,
            },
          };
        });

        return task;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create task');
        console.error('Failed to create task:', err);
        return null;
      }
    },
    [workspace]
  );

  /**
   * タスクを保存
   */
  const saveTask = useCallback(
    async (task: Task): Promise<boolean> => {
      if (!workspace) {
        setError('No workspace opened');
        return false;
      }

      try {
        await workspaceService.saveTask(task);

        // ワークスペースの状態を更新
        setWorkspace((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: {
              ...prev.tasks,
              [task.id]: task,
            },
          };
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save task');
        console.error('Failed to save task:', err);
        return false;
      }
    },
    [workspace]
  );

  /**
   * タスクを削除
   */
  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!workspace) {
        setError('No workspace opened');
        return false;
      }

      try {
        await workspaceService.deleteTask(workspace.rootPath, taskId);

        // ワークスペースの状態を更新
        setWorkspace((prev) => {
          if (!prev) return prev;
          const { [taskId]: removed, ...remainingTasks } = prev.tasks;
          return {
            ...prev,
            tasks: remainingTasks,
          };
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete task');
        console.error('Failed to delete task:', err);
        return false;
      }
    },
    [workspace]
  );

  /**
   * タスクをリネーム
   */
  const renameTask = useCallback(
    async (oldTaskId: string, newTaskId: string): Promise<boolean> => {
      if (!workspace) {
        setError('No workspace opened');
        return false;
      }

      try {
        await workspaceService.renameTask(workspace.rootPath, oldTaskId, newTaskId);

        // ワークスペースを再読み込み
        const ws = await workspaceService.openWorkspace(workspace.rootPath);
        setWorkspace(ws);

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to rename task');
        console.error('Failed to rename task:', err);
        return false;
      }
    },
    [workspace]
  );

  /**
   * ワークスペース設定を更新
   */
  const updateWorkspaceConfig = useCallback(
    async (config: Partial<Workspace['config']>): Promise<boolean> => {
      if (!workspace) {
        setError('No workspace opened');
        return false;
      }

      try {
        const updatedConfig = { ...workspace.config, ...config };
        await workspaceService.updateWorkspaceConfig(workspace.rootPath, updatedConfig);

        // ワークスペースの状態を更新
        setWorkspace((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            config: updatedConfig,
          };
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update workspace config');
        console.error('Failed to update workspace config:', err);
        return false;
      }
    },
    [workspace]
  );

  // 初回マウント時に最後のワークスペースを自動読み込み
  useEffect(() => {
    const loadLastWorkspace = async () => {
      const lastPath = await StorageService.getLastWorkspace();
      if (lastPath) {
        console.log('Auto-loading last workspace:', lastPath);
        await loadWorkspaceFromPath(lastPath);
      }
    };

    loadLastWorkspace();
  }, [loadWorkspaceFromPath]);

  /**
   * ワークスペースを再読み込み
   */
  const reloadWorkspace = useCallback(async () => {
    if (!workspace) return;
    try {
      console.log('🔄 Reloading workspace from:', workspace.rootPath);
      const ws = await workspaceService.openWorkspace(workspace.rootPath);
      console.log('📦 Workspace config loaded:', {
        autoSaveEnabled: ws.config.autoSaveEnabled,
        autoSaveInterval: ws.config.autoSaveInterval
      });
      setWorkspace(ws);
    } catch (err) {
      console.error('Failed to reload workspace:', err);
    }
  }, [workspace]);

  /**
   * ワークスペース内のタスクを更新（ファイル保存なし）
   */
  const updateTask = useCallback((task: Task) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [task.id]: task,
        },
      };
    });
  }, []);

  return {
    workspace,
    loading,
    error,
    openWorkspace,
    loadWorkspaceFromPath,
    getTask,
    createTask,
    saveTask,
    deleteTask,
    renameTask,
    updateWorkspaceConfig,
    updateTask,
    reloadWorkspace,
  };
}
