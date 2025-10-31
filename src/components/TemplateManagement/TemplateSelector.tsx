/**
 * テンプレート選択コンポーネント
 * タスク作成/編集時にテンプレートを選択して適用
 */

import { useState } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  workspacePath: string | null;
  currentContent: string;
  onApply: (content: string) => void;
  onClose: () => void;
  mode?: 'new' | 'existing';
}

export function TemplateSelector({
  workspacePath,
  currentContent,
  onApply,
  onClose,
  mode = 'new',
}: TemplateSelectorProps) {
  const { templates, loading, error } = useTemplates(workspacePath);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!selectedTemplate || !workspacePath) return;

    setIsApplying(true);

    try {
      const { TemplateService } = await import('../../services/templateService');

      let result: string;
      if (mode === 'new') {
        result = await TemplateService.applyTemplateToNewTask(
          workspacePath,
          selectedTemplate,
          currentContent
        );
      } else {
        result = await TemplateService.applyTemplateToExistingTask(
          workspacePath,
          selectedTemplate,
          currentContent,
          overwrite
        );
      }

      onApply(result);
      onClose();
    } catch (err) {
      alert(`テンプレートの適用に失敗しました: ${err}`);
    } finally {
      setIsApplying(false);
    }
  };

  const selectedTemplateData = templates.find((t) => t.name === selectedTemplate);

  return (
    <div className="template-selector-overlay">
      <div className="template-selector">
        <div className="template-selector-header">
          <h2>テンプレートを選択</h2>
          <button className="btn-close" onClick={onClose} disabled={isApplying}>
            ×
          </button>
        </div>

        {loading && <div className="loading">読み込み中...</div>}
        {error && <div className="error">エラー: {error}</div>}

        {!loading && !error && (
          <div className="template-selector-content">
            {templates.length === 0 ? (
              <div className="empty-state">
                <p>テンプレートがありません</p>
                <small>先にテンプレート管理からテンプレートを作成してください</small>
              </div>
            ) : (
              <>
                <div className="template-list">
                  {templates.map((template) => (
                    <div
                      key={template.name}
                      className={`template-option ${
                        selectedTemplate === template.name ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template.name)}
                    >
                      <div className="template-option-header">
                        <input
                          type="radio"
                          name="template"
                          checked={selectedTemplate === template.name}
                          onChange={() => setSelectedTemplate(template.name)}
                        />
                        <div className="template-option-info">
                          <h3>{template.name}</h3>
                          {template.description && <p>{template.description}</p>}
                          <small>{Object.keys(template.tags).length} タグ</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTemplateData && (
                  <div className="template-preview">
                    <h3>プレビュー</h3>
                    <div className="tags-list">
                      {Object.entries(selectedTemplateData.tags).map(([key, value]) => (
                        <div key={key} className="tag-item">
                          <span className="tag-key">{key}:</span>
                          <span className="tag-value">
                            {Array.isArray(value)
                              ? `[${value.join(', ')}]`
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mode === 'existing' && (
                  <div className="apply-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                      />
                      <span>
                        既存のタグを上書き
                        <small>
                          {overwrite
                            ? 'すべてのタグがテンプレートで置き換わります'
                            : 'テンプレートのタグが既存タグに追加されます（既存タグ優先）'}
                        </small>
                      </span>
                    </label>
                  </div>
                )}

                <div className="template-selector-actions">
                  <button
                    className="btn-primary"
                    onClick={handleApply}
                    disabled={!selectedTemplate || isApplying}
                  >
                    {isApplying ? '適用中...' : '適用'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={onClose}
                    disabled={isApplying}
                  >
                    キャンセル
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
