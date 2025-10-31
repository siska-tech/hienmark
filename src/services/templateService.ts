import { invoke } from '@tauri-apps/api/core';
import type { TagTemplate, TagValue } from '../types/task';

/**
 * タグテンプレートサービス - Tauriコマンドのラッパー
 */
export class TemplateService {
  /**
   * すべてのテンプレートを取得
   */
  static async listTemplates(workspacePath: string): Promise<TagTemplate[]> {
    return await invoke<TagTemplate[]>('list_templates', { workspacePath });
  }

  /**
   * 特定のテンプレートを取得
   */
  static async getTemplate(
    workspacePath: string,
    templateName: string
  ): Promise<TagTemplate> {
    return await invoke<TagTemplate>('get_template', {
      workspacePath,
      templateName,
    });
  }

  /**
   * デフォルトテンプレートを取得
   */
  static async getDefaultTemplate(
    workspacePath: string
  ): Promise<TagTemplate | null> {
    return await invoke<TagTemplate | null>('get_default_template', {
      workspacePath,
    });
  }

  /**
   * テンプレートを作成
   */
  static async createTemplate(
    workspacePath: string,
    name: string,
    description: string | undefined,
    tags: Record<string, TagValue>
  ): Promise<TagTemplate> {
    return await invoke<TagTemplate>('create_template', {
      workspacePath,
      name,
      description,
      tags,
    });
  }

  /**
   * テンプレートを更新
   */
  static async updateTemplate(
    workspacePath: string,
    name: string,
    description: string | undefined,
    tags: Record<string, TagValue>
  ): Promise<TagTemplate> {
    return await invoke<TagTemplate>('update_template', {
      workspacePath,
      name,
      description,
      tags,
    });
  }

  /**
   * テンプレートを削除
   */
  static async deleteTemplate(
    workspacePath: string,
    name: string
  ): Promise<void> {
    await invoke('delete_template', { workspacePath, name });
  }

  /**
   * テンプレート名を変更
   */
  static async renameTemplate(
    workspacePath: string,
    oldName: string,
    newName: string
  ): Promise<void> {
    await invoke('rename_template', { workspacePath, oldName, newName });
  }

  /**
   * デフォルトテンプレートを設定
   */
  static async setDefaultTemplate(
    workspacePath: string,
    templateName: string | undefined
  ): Promise<void> {
    await invoke('set_default_template', { workspacePath, templateName });
  }

  /**
   * テンプレートを新規タスクに適用
   */
  static async applyTemplateToNewTask(
    workspacePath: string,
    templateName: string,
    content: string
  ): Promise<string> {
    return await invoke<string>('apply_template_to_new_task', {
      workspacePath,
      templateName,
      content,
    });
  }

  /**
   * テンプレートを既存タスクに適用
   */
  static async applyTemplateToExistingTask(
    workspacePath: string,
    templateName: string,
    taskContent: string,
    overwrite: boolean
  ): Promise<string> {
    return await invoke<string>('apply_template_to_existing_task', {
      workspacePath,
      templateName,
      taskContent,
      overwrite,
    });
  }

  /**
   * 既存タスクからテンプレートを作成
   */
  static async createTemplateFromTask(
    workspacePath: string,
    taskContent: string,
    templateName: string,
    description: string | undefined
  ): Promise<TagTemplate> {
    return await invoke<TagTemplate>('create_template_from_task', {
      workspacePath,
      taskContent,
      templateName,
      description,
    });
  }

  /**
   * テンプレートのプレビューを取得（YAML形式）
   */
  static async previewTemplate(
    workspacePath: string,
    templateName: string
  ): Promise<string> {
    return await invoke<string>('preview_template', {
      workspacePath,
      templateName,
    });
  }
}
