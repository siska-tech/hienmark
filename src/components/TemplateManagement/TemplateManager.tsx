/**
 * テンプレート管理コンポーネント
 * テンプレートの一覧表示、作成、編集、削除機能を提供
 */

import { useState } from 'react';
import type { TagTemplate, TagIndex } from '../../types/task';
import { useTemplates } from '../../hooks/useTemplates';
import { TemplateEditor } from './TemplateEditor';
import './TemplateManager.css';
import { useLanguage } from '../../contexts/LanguageContext';

interface TemplateManagerProps {
  workspacePath: string | null;
  tagIndex?: TagIndex | null;
  onClose: () => void;
}

export function TemplateManager({ workspacePath, tagIndex, onClose }: TemplateManagerProps) {
  const { t, language } = useLanguage();
  const {
    templates,
    defaultTemplate,
    loading,
    error,
    deleteTemplate,
    setAsDefault,
    reload,
  } = useTemplates(workspacePath);

  const [editingTemplate, setEditingTemplate] = useState<TagTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingTemplate(null);
  };

  const handleEdit = (template: TagTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
  };

  const handleDelete = async (templateName: string) => {
    if (!confirm(t.templates.deleteConfirm)) {
      return;
    }

    try {
      await deleteTemplate(templateName);
      alert(t.templates.deleteTemplate);
    } catch (err) {
      alert(`${t.common.error}: ${err}`);
    }
  };

  const handleSetDefault = async (templateName: string | null) => {
    try {
      await setAsDefault(templateName ?? undefined);
      alert(templateName ? t.templates.setAsDefault : t.common.success);
    } catch (err) {
      alert(`${t.common.error}: ${err}`);
    }
  };

  const handleEditorClose = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    reload();
  };

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(selectedTemplate === templateName ? null : templateName);
  };

  if (isCreating || editingTemplate) {
    return (
      <div className="template-manager">
        <TemplateEditor
          workspacePath={workspacePath}
          template={editingTemplate ?? undefined}
          tagIndex={tagIndex}
          onClose={handleEditorClose}
        />
      </div>
    );
  }

  return (
    <div className="template-manager">
      <div className="template-manager-header">
        <h2>{t.templates.title}</h2>
        <div className="header-actions">
          <button className="btn-create" onClick={handleCreateNew} title={t.common.add} aria-label={t.common.add}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button className="btn-close" onClick={onClose} title={t.common.close} aria-label={t.common.close}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {loading && <div className="loading">{t.app.loading}</div>}
      {error && <div className="error">{t.common.error}: {String(error)}</div>}

      <div className="template-manager-content">
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>{t.templates.noTemplates}</p>
            <button className="btn-primary" onClick={handleCreateNew}>
              {t.templates.newTemplate}
            </button>
          </div>
        ) : (
          <div className="template-list">
            {templates.map((template) => {
              const isDefault = defaultTemplate?.name === template.name;
              const isSelected = selectedTemplate === template.name;
              const tagCount = Object.keys(template.tags).length;

              return (
                <div
                  key={template.name}
                  className={`template-item ${isSelected ? 'selected' : ''} ${
                    isDefault ? 'default' : ''
                  }`}
                >
                  <div
                    className="template-header"
                    onClick={() => handleTemplateSelect(template.name)}
                  >
                    <div className="template-info">
                      <h3 className="template-name">
                        {template.name}
                        {isDefault && <span className="default-badge">{t.templates.setAsDefault}</span>}
                      </h3>
                      {template.description && (
                        <p className="template-description">{template.description}</p>
                      )}
                      <div className="template-meta">
                        <span className="tag-count">{tagCount} {t.taskEditor.tags}</span>
                        <span className="updated-at">
                          {new Date(template.updatedAt).toLocaleString(language === 'ja' ? 'ja-JP' : language === 'vi' ? 'vi-VN' : 'en-US')}
                        </span>
                      </div>
                    </div>
                    <button className="toggle-btn">
                      {isSelected ? '▲' : '▼'}
                    </button>
                  </div>

                  {isSelected && (
                    <div className="template-details">
                      <div className="tags-preview">
                        <h4>{t.taskEditor.tags}</h4>
                        <table className="tags-table">
                          <thead>
                            <tr>
                              <th>{t.templateEditor.key}</th>
                              <th>{t.templateEditor.value}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(template.tags).map(([key, value]) => (
                              <tr key={key}>
                                <td className="tag-key">{key}</td>
                                <td className="tag-value">
                                  {Array.isArray(value)
                                    ? `[${value.join(', ')}]`
                                    : String(value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="template-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => handleEdit(template)}
                        >
                          {t.common.edit}
                        </button>
                        {!isDefault && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleSetDefault(template.name)}
                          >
                            {t.templates.setAsDefault}
                          </button>
                        )}
                        {isDefault && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleSetDefault(null)}
                          >
                            {t.common.cancel}
                          </button>
                        )}
                        <button
                          className="btn-danger"
                          onClick={() => handleDelete(template.name)}
                        >
                          {t.common.delete}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
