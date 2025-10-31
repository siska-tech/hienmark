/**
 * タグ管理のためのカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import { TagService } from '../services/tagService';
import { WorkspaceConfigService } from '../services/workspaceConfigService';
import type { TagIndex, TagConfig } from '../types/task';

export function useTags(workspacePath: string | null) {
  const [tagIndex, setTagIndex] = useState<TagIndex | null>(null);
  const [tagConfigs, setTagConfigs] = useState<Record<string, TagConfig>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // タグインデックスとタグ設定を読み込む
  const loadTagIndex = useCallback(async () => {
    if (!workspacePath) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading tag index for workspace:', workspacePath);
      const index = await TagService.getTagIndex(workspacePath);
      setTagIndex(index);

      // タグ設定も読み込む
      try {
        const config = await WorkspaceConfigService.getConfig(workspacePath);
        setTagConfigs(config.tagConfigs.configs);
      } catch (err) {
        console.warn('Failed to load tag configs:', err);
        setTagConfigs({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tag index');
      console.error('Failed to load tag index:', err);
    } finally {
      setLoading(false);
    }
  }, [workspacePath]);

  // ワークスペースが変更されたらタグインデックスを再読み込み
  useEffect(() => {
    if (workspacePath) {
      console.log('Workspace path changed, loading tag index:', workspacePath);
      loadTagIndex();
    } else {
      // ワークスペースがnullの場合、タグインデックスもクリア
      setTagIndex(null);
      setTagConfigs({});
    }
  }, [workspacePath, loadTagIndex]);

  return {
    tagIndex,
    tagConfigs,
    loading,
    error,
    reload: loadTagIndex,
  };
}
