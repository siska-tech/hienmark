import { useState, useEffect, useCallback } from 'react';
import { TemplateService } from '../services/templateService';
import type { TagTemplate, TagValue } from '../types/task';

/**
 * テンプレート管理用フック
 */
export function useTemplates(workspacePath: string | null) {
  const [templates, setTemplates] = useState<TagTemplate[]>([]);
  const [defaultTemplate, setDefaultTemplate] = useState<TagTemplate | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * テンプレート一覧をリロード
   */
  const reload = useCallback(async () => {
    if (!workspacePath) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [templateList, defaultTpl] = await Promise.all([
        TemplateService.listTemplates(workspacePath),
        TemplateService.getDefaultTemplate(workspacePath),
      ]);

      setTemplates(templateList);
      setDefaultTemplate(defaultTpl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, [workspacePath]);

  /**
   * 初回ロードとworkspacePath変更時にリロード
   */
  useEffect(() => {
    reload();
  }, [reload]);

  /**
   * テンプレートを作成
   */
  const createTemplate = useCallback(
    async (
      name: string,
      description: string | undefined,
      tags: Record<string, TagValue>
    ) => {
      if (!workspacePath) throw new Error('No workspace selected');

      const template = await TemplateService.createTemplate(
        workspacePath,
        name,
        description,
        tags
      );
      await reload();
      return template;
    },
    [workspacePath, reload]
  );

  /**
   * テンプレートを更新
   */
  const updateTemplate = useCallback(
    async (
      name: string,
      description: string | undefined,
      tags: Record<string, TagValue>
    ) => {
      if (!workspacePath) throw new Error('No workspace selected');

      const template = await TemplateService.updateTemplate(
        workspacePath,
        name,
        description,
        tags
      );
      await reload();
      return template;
    },
    [workspacePath, reload]
  );

  /**
   * テンプレートを削除
   */
  const deleteTemplate = useCallback(
    async (name: string) => {
      if (!workspacePath) throw new Error('No workspace selected');

      await TemplateService.deleteTemplate(workspacePath, name);
      await reload();
    },
    [workspacePath, reload]
  );

  /**
   * テンプレート名を変更
   */
  const renameTemplate = useCallback(
    async (oldName: string, newName: string) => {
      if (!workspacePath) throw new Error('No workspace selected');

      await TemplateService.renameTemplate(workspacePath, oldName, newName);
      await reload();
    },
    [workspacePath, reload]
  );

  /**
   * デフォルトテンプレートを設定
   */
  const setAsDefault = useCallback(
    async (templateName: string | undefined) => {
      if (!workspacePath) throw new Error('No workspace selected');

      await TemplateService.setDefaultTemplate(workspacePath, templateName);
      await reload();
    },
    [workspacePath, reload]
  );

  /**
   * テンプレートを新規タスクに適用
   */
  const applyToNewTask = useCallback(
    async (templateName: string, content: string = '') => {
      if (!workspacePath) throw new Error('No workspace selected');

      return await TemplateService.applyTemplateToNewTask(
        workspacePath,
        templateName,
        content
      );
    },
    [workspacePath]
  );

  /**
   * テンプレートを既存タスクに適用
   */
  const applyToExistingTask = useCallback(
    async (
      templateName: string,
      taskContent: string,
      overwrite: boolean = false
    ) => {
      if (!workspacePath) throw new Error('No workspace selected');

      return await TemplateService.applyTemplateToExistingTask(
        workspacePath,
        templateName,
        taskContent,
        overwrite
      );
    },
    [workspacePath]
  );

  /**
   * 既存タスクからテンプレートを作成
   */
  const createFromTask = useCallback(
    async (
      taskContent: string,
      templateName: string,
      description: string | undefined
    ) => {
      if (!workspacePath) throw new Error('No workspace selected');

      const template = await TemplateService.createTemplateFromTask(
        workspacePath,
        taskContent,
        templateName,
        description
      );
      await reload();
      return template;
    },
    [workspacePath, reload]
  );

  /**
   * テンプレートのプレビューを取得
   */
  const previewTemplate = useCallback(
    async (templateName: string) => {
      if (!workspacePath) throw new Error('No workspace selected');

      return await TemplateService.previewTemplate(workspacePath, templateName);
    },
    [workspacePath]
  );

  return {
    templates,
    defaultTemplate,
    loading,
    error,
    reload,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    renameTemplate,
    setAsDefault,
    applyToNewTask,
    applyToExistingTask,
    createFromTask,
    previewTemplate,
  };
}
