/**
 * タグ設定エディタコンポーネント
 * タグの型と許容値の設定を編集する
 */

import { useState, useEffect } from 'react';
import type { TagConfig, TagType, AllowedValueType, TagIndex, WorkspaceConfig } from '../../types/task';
import { WorkspaceConfigService } from '../../services/workspaceConfigService';
import './TagConfigEditor.css';

interface TagConfigEditorProps {
  workspacePath: string | null;
  tagIndex: TagIndex | null;
  targetCategory?: string | null;
  onClose: () => void;
  onConfigSaved: () => void;
}

export function TagConfigEditor({ workspacePath, tagIndex, targetCategory, onClose, onConfigSaved }: TagConfigEditorProps) {
  const [configs, setConfigs] = useState<Record<string, TagConfig>>({});
  const [savedConfigs, setSavedConfigs] = useState<Record<string, TagConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTagKey, setNewTagKey] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig | null>(null);

  const loadConfigs = async () => {
    if (!workspacePath) return;

    setLoading(true);
    try {
      const config = await WorkspaceConfigService.getConfig(workspacePath);
      setWorkspaceConfig(config);
      setSavedConfigs(config.tagConfigs.configs);
      
      // タグインデックスから未設定のタグを取得して暗黙の設定を作成
      const allConfigs: Record<string, TagConfig> = { ...config.tagConfigs.configs };
      
      if (tagIndex) {
        const allCategories = Object.keys(tagIndex.categories);
        const missingCategories = allCategories.filter(cat => !config.tagConfigs.configs[cat]);
        
        // 暗黙の設定を追加（表示用）
        if (missingCategories.length > 0) {
          missingCategories.forEach(cat => {
            allConfigs[cat] = {
              tagType: 'String',
              required: false,
              allowedValueType: { type: 'DirectInput' },
            };
          });
        }
      }
      
      setConfigs(allConfigs);
    } catch (error) {
      console.error('Failed to load tag configs:', error);
      alert(`タグ設定の読み込みに失敗しました: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacePath, tagIndex]);
  
  // Apply theme
  useEffect(() => {
    if (workspaceConfig?.theme) {
      const root = document.documentElement;
      if (workspaceConfig.theme === 'HienMark White') {
        root.setAttribute('data-theme', 'hienmark-white');
      } else {
        root.setAttribute('data-theme', 'hienmark-dark');
      }
    }
  }, [workspaceConfig?.theme]);

  const handleSave = async () => {
    if (!workspacePath) return;

    setSaving(true);
    try {
      const config = await WorkspaceConfigService.getConfig(workspacePath);
      
      // 明示的に設定されたもののみ保存
      const actualConfigs: Record<string, TagConfig> = {};
      
      Object.entries(configs).forEach(([key, value]) => {
        // 編集された暗黙の設定も含めて保存
        const isImplicit = !(key in savedConfigs);
        
        // 既存の設定、または暗黙の設定を編集した場合
        if (!isImplicit || (isImplicit && editingKey === key)) {
          actualConfigs[key] = value;
        }
      });
      
      config.tagConfigs.configs = actualConfigs;
      await WorkspaceConfigService.updateConfig(workspacePath, config);
      alert('タグ設定を保存しました');
      setEditingKey(null); // 編集状態をリセット
      await loadConfigs(); // 再読み込み
      onConfigSaved();
    } catch (error) {
      console.error('Failed to save tag configs:', error);
      alert(`タグ設定の保存に失敗しました: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (!newTagKey.trim()) {
      alert('タグキーを入力してください');
      return;
    }

    if (configs[newTagKey]) {
      alert('そのタグキーは既に設定されています');
      return;
    }

    setConfigs({
      ...configs,
      [newTagKey]: {
        tagType: 'String',
        required: false,
        allowedValueType: { type: 'DirectInput' },
      },
    });
    setNewTagKey('');
  };

  const handleRemoveTag = (key: string) => {
    if (!confirm(`タグ設定 "${key}" を削除しますか？`)) {
      return;
    }

    const newConfigs = { ...configs };
    delete newConfigs[key];
    setConfigs(newConfigs);
  };

  const handleUpdateConfig = (key: string, updates: Partial<TagConfig>) => {
    setConfigs({
      ...configs,
      [key]: { ...configs[key], ...updates },
    });
  };

  if (loading) {
    return (
      <div className="tag-config-editor">
        <div className="tag-config-header">
          <h2>タグ設定編集</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="tag-config-content">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tag-config-editor">
      <div className="tag-config-header">
        <h2>タグ設定編集</h2>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="tag-config-content">
        {targetCategory && (
          <div className="target-category-info">
            <p>タグ: <strong>{targetCategory}</strong></p>
          </div>
        )}
        
        {!targetCategory && (
          <section className="config-section">
            <h3>新しいタグの追加</h3>
            <div className="add-tag-form">
              <input
                type="text"
                value={newTagKey}
                onChange={(e) => setNewTagKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                }}
                placeholder="タグキーを入力（例: status）"
                className="tag-key-input"
              />
              <button className="btn-add" onClick={handleAddTag}>
                追加
              </button>
            </div>
          </section>
        )}

        <section className="config-section">
          <h3>{targetCategory ? 'タグ設定' : '既存のタグ設定'}</h3>
          {(() => {
            // targetCategoryが指定されている場合はそのタグだけを表示
            const displayConfigs = targetCategory 
              ? Object.entries(configs).filter(([key]) => key === targetCategory)
              : Object.entries(configs);
            
            if (displayConfigs.length === 0) {
              // 設定がない場合は、targetCategoryがあればそのタグ用の設定を追加可能にする
              if (targetCategory) {
                return (
                  <div className="no-configs-info">
                    <p className="no-configs">このタグにはタグ設定がありません</p>
                    <p className="implicit-info">
                      <strong>暗黙の任意</strong>: タグ設定がない場合は、任意の型・任意の値で入力可能です。
                    </p>
                    <button 
                      className="btn-add-implicit" 
                      onClick={() => {
                        // 暗黙の設定を明示的に作成
                        if (!configs[targetCategory]) {
                          const newConfig: TagConfig = {
                            tagType: 'String',
                            required: false,
                            allowedValueType: { type: 'DirectInput' },
                          };
                          setConfigs({
                            ...configs,
                            [targetCategory]: newConfig,
                          });
                        }
                        setEditingKey(targetCategory);
                      }}
                    >
                      ⚙️ 設定を追加
                    </button>
                  </div>
                );
              }
              
              return (
                <div className="no-configs-info">
                  <p className="no-configs">タグ設定がありません</p>
                  <p className="implicit-info">
                    <strong>暗黙の任意</strong>: タグ設定がない場合は、任意の型・任意の値で入力可能です。
                  </p>
                </div>
              );
            }
            
            return displayConfigs.map(([key, config]) => {
              const isImplicit = !(key in savedConfigs);
              return (
                <TagConfigItem
                  key={key}
                  tagKey={key}
                  config={config}
                  onUpdate={(updates) => handleUpdateConfig(key, updates)}
                  onRemove={() => handleRemoveTag(key)}
                  isEditing={editingKey === key}
                  onEditToggle={() => setEditingKey(editingKey === key ? null : key)}
                  isImplicit={isImplicit}
                />
              );
            });
          })()}
        </section>

        <div className="config-actions">
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '✓'}
          </button>
          <button className="btn-cancel" onClick={onClose}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

interface TagConfigItemProps {
  tagKey: string;
  config: TagConfig;
  onUpdate: (updates: Partial<TagConfig>) => void;
  onRemove: () => void;
  isEditing: boolean;
  onEditToggle: () => void;
  isImplicit?: boolean; // 暗黙の設定かどうか
}

function TagConfigItem({ tagKey, config, onUpdate, onRemove, isEditing, onEditToggle, isImplicit = false }: TagConfigItemProps) {
  const [localConfig, setLocalConfig] = useState<TagConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onUpdate(localConfig);
    onEditToggle();
  };

  const handleCancel = () => {
    setLocalConfig(config);
    onEditToggle();
  };

  const tagTypes: TagType[] = ['String', 'Select', 'MultiSelect', 'Number', 'Boolean', 'Date', 'Array'];

  const renderSortSettingsEditor = () => {
    return (
      <div className="settings-section">
        <h4>ソート設定</h4>
        
        <div className="field-group">
          <label>
            <span>数値型として扱う:</span>
            <input
              type="checkbox"
              checked={localConfig.sortSettings?.isNumeric || false}
              onChange={(e) => {
                const newSettings = {
                  ...localConfig.sortSettings,
                  isNumeric: e.target.checked,
                };
                setLocalConfig({ ...localConfig, sortSettings: newSettings });
              }}
            />
          </label>
        </div>

        {!localConfig.sortSettings?.isNumeric && (
          <div className="field-group">
            <label>
              <span>カスタムソート順序:</span>
              <p className="field-description">
                値とソート順序（数値）を設定できます。例: Immediately=0, VeryHigh=1, High=2 など
              </p>
              <SortOrderEditor
                order={localConfig.sortSettings?.order || {}}
                onChange={(newOrder) => {
                  setLocalConfig({
                    ...localConfig,
                    sortSettings: {
                      ...localConfig.sortSettings,
                      order: newOrder,
                    },
                  });
                }}
              />
            </label>
          </div>
        )}
      </div>
    );
  };

  const renderFilterSettingsEditor = () => {
    return (
      <div className="settings-section">
        <h4>フィルタ設定</h4>
        
        <div className="field-group">
          <label>
            <span>フィルタで使用:</span>
            <input
              type="checkbox"
              checked={localConfig.filterSettings?.useInFilter || false}
              onChange={(e) => {
                const newSettings = {
                  ...localConfig.filterSettings,
                  useInFilter: e.target.checked,
                };
                setLocalConfig({ ...localConfig, filterSettings: newSettings });
              }}
            />
          </label>
        </div>

        {localConfig.filterSettings?.useInFilter && (
          <>
            <div className="field-group">
              <label>
                <span>Status判定に使用:</span>
                <input
                  type="checkbox"
                  checked={localConfig.filterSettings?.useForStatus || false}
                  onChange={(e) => {
                  setLocalConfig({
                    ...localConfig,
                    filterSettings: {
                      useInFilter: localConfig.filterSettings?.useInFilter ?? true,
                      ...localConfig.filterSettings,
                      useForStatus: e.target.checked,
                    },
                  });
                  }}
                />
              </label>
            </div>

            <div className="field-group">
              <label>
                <span>Priority判定に使用:</span>
                <input
                  type="checkbox"
                  checked={localConfig.filterSettings?.useForPriority || false}
                  onChange={(e) => {
                  setLocalConfig({
                    ...localConfig,
                    filterSettings: {
                      useInFilter: localConfig.filterSettings?.useInFilter ?? true,
                      ...localConfig.filterSettings,
                      useForPriority: e.target.checked,
                    },
                  });
                  }}
                />
              </label>
            </div>

            <div className="field-group">
              <label>
                <span>DueDate判定に使用:</span>
                <input
                  type="checkbox"
                  checked={localConfig.filterSettings?.useForDueDate || false}
                  onChange={(e) => {
                  setLocalConfig({
                    ...localConfig,
                    filterSettings: {
                      useInFilter: localConfig.filterSettings?.useInFilter ?? true,
                      ...localConfig.filterSettings,
                      useForDueDate: e.target.checked,
                    },
                  });
                  }}
                />
              </label>
            </div>

            <div className="field-group">
              <label>
                <span>Overdue判定に使用:</span>
                <input
                  type="checkbox"
                  checked={localConfig.filterSettings?.useForOverdue || false}
                  onChange={(e) => {
                  setLocalConfig({
                    ...localConfig,
                    filterSettings: {
                      ...localConfig.filterSettings,
                      useInFilter: localConfig.filterSettings?.useInFilter ?? true,
                      useForOverdue: e.target.checked,
                    },
                  });
                  }}
                />
              </label>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderAllowedValueTypeEditor = () => {
    const handleAllowedValueTypeChange = (type: AllowedValueType['type']) => {
      let newAllowedValueType: AllowedValueType;
      
      switch (type) {
        case 'List':
          newAllowedValueType = { type: 'List', values: [''] };
          break;
        case 'Pattern':
          newAllowedValueType = { type: 'Pattern', pattern: '.*' };
          break;
        case 'Range':
          newAllowedValueType = { type: 'Range', min: 0, max: 100 };
          break;
        default:
          newAllowedValueType = { type: 'DirectInput' };
      }
      
      setLocalConfig({ ...localConfig, allowedValueType: newAllowedValueType });
    };

    const updateListValues = (values: string[]) => {
      setLocalConfig({
        ...localConfig,
        allowedValueType: { type: 'List', values } as AllowedValueType,
      });
    };

    const updatePattern = (pattern: string) => {
      setLocalConfig({
        ...localConfig,
        allowedValueType: { type: 'Pattern', pattern } as AllowedValueType,
      });
    };

    const updateRange = (min: number, max: number) => {
      setLocalConfig({
        ...localConfig,
        allowedValueType: { type: 'Range', min, max } as AllowedValueType,
      });
    };

    const currentType = localConfig.allowedValueType?.type || 'DirectInput';

    return (
      <div className="allowed-value-type-editor">
        <label>
          <span>許容値タイプ:</span>
          <select
            value={currentType}
            onChange={(e) => handleAllowedValueTypeChange(e.target.value as AllowedValueType['type'])}
          >
            <option value="DirectInput">直接入力</option>
            <option value="List">リスト</option>
            <option value="Pattern">パターン（正規表現）</option>
            <option value="Range">範囲（数値）</option>
          </select>
        </label>

        {currentType === 'List' && 'values' in (localConfig.allowedValueType || {}) && (
          <div className="list-values-editor">
            <span>リスト値:</span>
            {(localConfig.allowedValueType as { type: 'List'; values: string[] }).values.map((val, idx) => (
              <div key={idx} className="list-value-item">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const newValues = [...(localConfig.allowedValueType as { type: 'List'; values: string[] }).values];
                    newValues[idx] = e.target.value;
                    updateListValues(newValues);
                  }}
                  placeholder="値"
                />
                <button
                  onClick={() => {
                    const newValues = (localConfig.allowedValueType as { type: 'List'; values: string[] }).values.filter((_, i) => i !== idx);
                    updateListValues(newValues);
                  }}
                >
                  削除
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newValues = [...(localConfig.allowedValueType as { type: 'List'; values: string[] }).values, ''];
                updateListValues(newValues);
              }}
            >
              + 追加
            </button>
          </div>
        )}

        {currentType === 'Pattern' && (
          <div className="pattern-editor">
            <span>正規表現パターン:</span>
            <input
              type="text"
              value={(localConfig.allowedValueType as { type: 'Pattern'; pattern: string })?.pattern || ''}
              onChange={(e) => updatePattern(e.target.value)}
              placeholder="例: ^[A-Za-z]+$"
            />
          </div>
        )}

        {currentType === 'Range' && (
          <div className="range-editor">
            <label>
              <span>最小値:</span>
              <input
                type="number"
                value={(localConfig.allowedValueType as { type: 'Range'; min: number; max: number })?.min || 0}
                onChange={(e) => {
                  const range = localConfig.allowedValueType as { type: 'Range'; min: number; max: number };
                  updateRange(parseFloat(e.target.value), range?.max || 100);
                }}
              />
            </label>
            <label>
              <span>最大値:</span>
              <input
                type="number"
                value={(localConfig.allowedValueType as { type: 'Range'; min: number; max: number })?.max || 100}
                onChange={(e) => {
                  const range = localConfig.allowedValueType as { type: 'Range'; min: number; max: number };
                  updateRange(range?.min || 0, parseFloat(e.target.value));
                }}
              />
            </label>
          </div>
        )}
      </div>
    );
  };

  if (!isEditing) {
    return (
      <div className={`tag-config-item ${isImplicit ? 'implicit' : ''}`}>
        <div className="tag-config-summary">
          <span className="tag-key">{tagKey}</span>
          {isImplicit && <span className="implicit-badge">暗黙の任意</span>}
          <span className="tag-type">{config.tagType}</span>
          <span className="tag-required">{config.required ? '必須' : '任意'}</span>
          <button className="btn-edit" onClick={onEditToggle}>
            {isImplicit ? '設定追加' : '編集'}
          </button>
          {!isImplicit && (
            <button className="btn-remove" onClick={onRemove}>
              削除
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tag-config-item editing">
      <div className="tag-config-details">
        <div className="field-group">
          <label>
            <span>タグキー:</span>
            <strong>{tagKey}</strong>
          </label>
        </div>

        <div className="field-group">
          <label>
            <span>表示名（エイリアス）:</span>
            <input
              type="text"
              value={localConfig.alias || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, alias: e.target.value || undefined })}
              placeholder="空欄の場合はタグキーを表示"
            />
          </label>
        </div>

        <div className="field-group">
          <label>
            <span>タグ型:</span>
            <select
              value={localConfig.tagType}
              onChange={(e) => setLocalConfig({ ...localConfig, tagType: e.target.value as TagType })}
            >
              {tagTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-group">
          <label>
            <span>必須:</span>
            <input
              type="checkbox"
              checked={localConfig.required}
              onChange={(e) => setLocalConfig({ ...localConfig, required: e.target.checked })}
            />
          </label>
        </div>

        <div className="field-group">
          <label>
            <span>説明:</span>
            <input
              type="text"
              value={localConfig.description || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, description: e.target.value || undefined })}
              placeholder="タグの説明（任意）"
            />
          </label>
        </div>

        {renderAllowedValueTypeEditor()}

        {renderSortSettingsEditor()}
        {renderFilterSettingsEditor()}

        <div className="config-item-actions">
          <button className="btn-save-item" onClick={handleSave}>
            保存
          </button>
          <button className="btn-cancel-item" onClick={handleCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

interface SortOrderEditorProps {
  order: Record<string, number>;
  onChange: (order: Record<string, number>) => void;
}

function SortOrderEditor({ order, onChange }: SortOrderEditorProps) {
  const [entries, setEntries] = useState<Array<{ key: string; value: number }>>(
    Object.entries(order).map(([key, value]) => ({ key, value }))
  );

  useEffect(() => {
    const newOrder: Record<string, number> = {};
    entries.forEach(({ key, value }) => {
      if (key.trim()) {
        newOrder[key.trim()] = value;
      }
    });
    onChange(newOrder);
  }, [entries, onChange]);

  const addEntry = () => {
    setEntries([...entries, { key: '', value: 0 }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, key: string, value: number) => {
    const newEntries = [...entries];
    newEntries[index] = { key, value };
    setEntries(newEntries);
  };

  return (
    <div className="sort-order-editor">
      {entries.map((entry, idx) => (
        <div key={idx} className="sort-order-item">
          <input
            type="text"
            value={entry.key}
            onChange={(e) => updateEntry(idx, e.target.value, entry.value)}
            placeholder="値（例: Immediately）"
            className="sort-order-key"
          />
          <span>→</span>
          <input
            type="number"
            value={entry.value}
            onChange={(e) => updateEntry(idx, entry.key, parseInt(e.target.value, 10) || 0)}
            placeholder="順序"
            className="sort-order-value"
          />
          <button
            type="button"
            onClick={() => removeEntry(idx)}
            className="btn-remove-entry"
          >
            削除
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addEntry}
        className="btn-add-entry"
      >
        + エントリを追加
      </button>
    </div>
  );
}
