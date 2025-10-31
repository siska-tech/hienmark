/**
 * テンプレート選択コンポーネント
 * 新規タスク作成時にテンプレートを選択するためのモーダル
 */

import { useState } from 'react';
import type { TagTemplate } from '../types/task';
import { useLanguage } from '../contexts/LanguageContext';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  templates: TagTemplate[];
  defaultTemplate: TagTemplate | null;
  onSelect: (templateName: string | null) => void;
  onCancel: () => void;
}

export function TemplateSelector({ templates, defaultTemplate, onSelect, onCancel }: TemplateSelectorProps) {
  const { t } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(defaultTemplate?.name || null);

  const handleConfirm = () => {
    onSelect(selectedTemplate);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="template-selector-overlay" onKeyDown={handleKeyDown}>
      <div className="template-selector-modal">
        <div className="template-selector-header">
          <h2>{t.templateSelector.title}</h2>
          <button className="btn-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="template-selector-content">
          <p className="template-selector-description">
            {t.templateSelector.description}
          </p>

          <div className="template-options">
            <label className="template-option">
              <input
                type="radio"
                name="template"
                value=""
                checked={selectedTemplate === null}
                onChange={() => setSelectedTemplate(null)}
              />
              <div className="template-option-content">
                <div className="template-option-name">{t.templateSelector.emptyTask}</div>
                <div className="template-option-description">{t.templateSelector.emptyTaskDescription}</div>
              </div>
            </label>

            {templates.map((template) => (
              <label key={template.name} className="template-option">
                <input
                  type="radio"
                  name="template"
                  value={template.name}
                  checked={selectedTemplate === template.name}
                  onChange={() => setSelectedTemplate(template.name)}
                />
                <div className="template-option-content">
                  <div className="template-option-name">
                    {template.name}
                    {defaultTemplate?.name === template.name && (
                      <span className="default-badge">{t.templateSelector.default}</span>
                    )}
                  </div>
                  {template.description && (
                    <div className="template-option-description">{template.description}</div>
                  )}
                  <div className="template-option-tags">
                    {Object.keys(template.tags).length} {t.templateSelector.tags}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="template-selector-footer">
          <button className="btn-secondary" onClick={onCancel}>
            {t.common.cancel}
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            {t.templateSelector.select}
          </button>
        </div>
      </div>
    </div>
  );
}


