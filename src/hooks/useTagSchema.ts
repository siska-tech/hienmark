import { useState, useEffect, useCallback } from 'react';
import * as tagSchemaService from '../services/tagSchemaService';
import type { TagSchema } from '../types/task';

/**
 * タグスキーマ管理のためのカスタムフック
 * 
 * @param workspacePath - ワークスペースのルートパス
 * @returns タグスキーマと関連する関数
 */
export function useTagSchema(workspacePath: string | null) {
  const [schema, setSchema] = useState<TagSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchema = useCallback(async () => {
    if (!workspacePath) {
      setSchema(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedSchema = await tagSchemaService.loadTagSchema(workspacePath);
      setSchema(loadedSchema);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tag schema';
      setError(errorMessage);
      console.error('Failed to load tag schema:', err);
    } finally {
      setLoading(false);
    }
  }, [workspacePath]);

  const saveSchema = useCallback(async (newSchema: TagSchema) => {
    if (!workspacePath) {
      throw new Error('Workspace path is required');
    }

    try {
      await tagSchemaService.saveTagSchema(workspacePath, newSchema);
      setSchema(newSchema);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save tag schema';
      setError(errorMessage);
      throw err;
    }
  }, [workspacePath]);

  const reloadSchema = useCallback(async () => {
    await loadSchema();
  }, [loadSchema]);

  useEffect(() => {
    loadSchema();
  }, [loadSchema]);

  return {
    schema,
    loading,
    error,
    loadSchema,
    saveSchema,
    reloadSchema,
  };
}
