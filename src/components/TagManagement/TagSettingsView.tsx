/**
 * タグ管理設定ビュー（マスター/ディテール型UI）
 * 左ペイン：タグリスト、右ペイン：選択タグの詳細表示
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TagSchema, TagAttributeType, TagAttributeOptions, Workspace, Task } from '../../types/task';
import { useTagSchema } from '../../hooks/useTagSchema';
import { useTags } from '../../hooks/useTags';
import { useTemplates } from '../../hooks/useTemplates';
import { Resizer } from '../Resizer/Resizer';
import { FilterPopover } from './FilterPopover';
import './TagSettingsView.css';

interface TagSettingsViewProps {
  workspacePath: string | null;
  workspace?: Workspace | null;
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
}

export function TagSettingsView({ workspacePath, workspace, onClose, onOpenTask }: TagSettingsViewProps) {
  const { t } = useLanguage();
  // Pass workspacePath directly; hooks gracefully handle null
  const { schema, loading, error, saveSchema } = useTagSchema(workspacePath);
  const { tagIndex } = useTags(workspacePath);
  const { templates } = useTemplates(workspacePath);
  const [localSchema, setLocalSchema] = useState<TagSchema>({});
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'settings' | 'analysis'>('settings');
  const [masterPanelWidth, setMasterPanelWidth] = useState(300);
  const [searchQuery, setSearchQuery] = useState('');
  const [newUndefType, setNewUndefType] = useState<TagAttributeType>('String');

  // 並べ替え・フィルタ状態
  const [sortKey, setSortKey] = useState<'usage' | 'name' | 'attribute' | 'valueName'>('usage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hideUnused, setHideUnused] = useState<boolean>(false);
  const [attributeFilter, setAttributeFilter] = useState<TagAttributeType | 'all'>('all');
  const [minUsage, setMinUsage] = useState<number | ''>('');
  const [templateFilter, setTemplateFilter] = useState<string | ''>('');
  
  // 新規追加フォームの状態
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagAttributeType, setNewTagAttributeType] = useState<TagAttributeType>('String');
  
  // 一時的な選択肢リストの状態
  const [tempOptionsList, setTempOptionsList] = useState<Record<string, string>>({});

  const handleResize = (delta: number) => {
    setMasterPanelWidth(prev => {
      const newWidth = prev + delta;
      // Min: 250px, Max: 600px
      return Math.min(Math.max(newWidth, 250), 600);
    });
  };

  // タグの統計情報を計算
  const tagStats = useMemo(() => {
    if (!tagIndex) return {};
    
    const stats: Record<string, { totalCount: number; uniqueValues: number }> = {};
    
    Object.entries(tagIndex.categories).forEach(([categoryName, category]) => {
      const totalCount = Object.values(category.values).reduce((sum, count) => sum + count, 0);
      const uniqueValues = Object.keys(category.values).length;
      
      stats[categoryName] = {
        totalCount,
        uniqueValues
      };
    });
    
    return stats;
  }, [tagIndex]);

  useEffect(() => {
    if (schema) {
      setLocalSchema(schema);
    }
  }, [schema]);

  const handleSave = async () => {
    if (!workspacePath) return;

    setSaving(true);
    try {
      await saveSchema(localSchema);
    } catch (error) {
      console.error('Failed to save tag schema:', error);
      alert(`${t.tagSchemaManager.saveSchemaFailed}: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (schema) {
      setLocalSchema(schema);
    }
  };

  const handleShowNewTagForm = () => {
    setSelectedTag('__NEW__');
  };

  const handleCreateTag = async () => {
    if (!newTagKey.trim()) {
      alert(t.tagSchemaManager.tagNameRequired);
      return;
    }

    if (localSchema[newTagKey]) {
      alert(t.tagSchemaManager.tagAlreadyExists);
      return;
    }

    // デフォルトオプションを設定
    const defaultOptions: Record<TagAttributeType, any> = {
      String: { maxLength: undefined, defaultValue: undefined },
      Number: { min: undefined, max: undefined, decimalPlaces: undefined, defaultValue: undefined, formatAsPercentage: false },
      Boolean: { defaultValue: undefined },
      Datetime: { format: 'dateOnly', defaultValue: undefined },
      Select: { optionsList: [], allowManualEntry: false, defaultValue: undefined, displayFormat: 'dropdown' },
      MultiSelect: { optionsList: [], allowManualEntry: false, defaultValue: [] },
      Currency: { min: undefined, max: undefined, decimalPlaces: 2, defaultValue: undefined, currencyFormat: 'JPY' },
      Image: {},
      Hyperlink: {},
    };

    const newTag: TagAttributeOptions = {
      type: newTagAttributeType,
      options: defaultOptions[newTagAttributeType],
    };

    const updatedSchema = { ...localSchema, [newTagKey]: newTag };
    setLocalSchema(updatedSchema);
    setSelectedTag(newTagKey);
    setNewTagKey('');
    setNewTagAttributeType('String');
  };

  const handleDeleteTag = (tagKey: string) => {
    if (confirm(t.tagSchemaManager.deleteTagConfirm(tagKey))) {
      const newSchema = { ...localSchema };
      delete newSchema[tagKey];
      setLocalSchema(newSchema);
      
      // 削除したタグが選択されていた場合、選択を解除
      if (selectedTag === tagKey) {
        setSelectedTag(null);
      }
    }
  };

  const handleUpdateOptions = (tagKey: string, field: string, value: any) => {
    const tag = localSchema[tagKey];
    if (!tag) return;

    const newOptions: any = { ...tag.options };
    if (Array.isArray(value)) {
      newOptions[field] = [...value];
    } else {
      newOptions[field] = value;
    }

    setLocalSchema({
      ...localSchema,
      [tagKey]: {
        type: tag.type,
        options: newOptions,
      },
    });
  };

  const renderAttributeForm = (tagKey: string, options: TagAttributeOptions) => {
    switch (options.type) {
      case 'String':
        return (
          <div className="attribute-form">
            <div className="form-group">
              <label>{t.tagSchemaManager.maxLength}</label>
              <input
                type="number"
                value={options.options.maxLength ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={t.tagSchemaManager.unlimited}
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.defaultValue}</label>
              <input
                type="text"
                value={options.options.defaultValue ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'defaultValue', e.target.value || undefined)}
                placeholder={t.tagSchemaManager.defaultValuePlaceholder}
              />
            </div>
          </div>
        );

      case 'Number':
        return (
          <div className="attribute-form">
            <div className="form-group">
              <label>{t.tagSchemaManager.minValue}</label>
              <input
                type="number"
                value={options.options.min ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'min', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={t.tagSchemaManager.unlimited}
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.maxValue}</label>
              <input
                type="number"
                value={options.options.max ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'max', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={t.tagSchemaManager.unlimited}
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.decimalPlacesLabel}</label>
              <input
                type="number"
                value={options.options.decimalPlaces ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'decimalPlaces', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.defaultValue}</label>
              <input
                type="number"
                value={options.options.defaultValue ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'defaultValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={t.tagSchemaManager.defaultValuePlaceholder}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={options.options.formatAsPercentage || false}
                  onChange={(e) => handleUpdateOptions(tagKey, 'formatAsPercentage', e.target.checked)}
                />
                {t.tagSchemaManager.formatAsPercentage}
              </label>
            </div>
          </div>
        );

      case 'Boolean':
        return (
          <div className="attribute-form">
            <div className="form-group">
              <label>{t.tagSchemaManager.defaultValue}</label>
              <select
                value={options.options.defaultValue === undefined ? '' : String(options.options.defaultValue)}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : e.target.value === 'true';
                  handleUpdateOptions(tagKey, 'defaultValue', value);
                }}
              >
                <option value="">{t.tagSchemaManager.notSpecified}</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>
        );

      case 'Datetime':
        return (
          <div className="attribute-form">
            <div className="form-group">
              <label>{t.tagSchemaManager.dateFormatLabel}</label>
              <select
                value={options.options.format}
                onChange={(e) => handleUpdateOptions(tagKey, 'format', e.target.value as 'dateOnly' | 'dateTime')}
              >
                <option value="dateOnly">{t.tagSchemaManager.dateOnly}</option>
                <option value="dateTime">{t.tagSchemaManager.dateTime}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.defaultValue}</label>
              <input
                type="text"
                value={typeof options.options.defaultValue === 'string' ? options.options.defaultValue : ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'defaultValue', e.target.value || undefined)}
                placeholder="=[TODAY]+7 または 2025-01-01"
              />
              <small style={{ color: 'var(--app-text-sub)', fontSize: '0.75rem' }}>{t.tagSchemaManager.dynamicValueExample}</small>
            </div>
          </div>
        );

      case 'Select': {
        const selectOptions = options.options as any;
        const displayValue = tempOptionsList[tagKey] ?? selectOptions.optionsList?.join(', ') ?? '';
        
        return (
          <div className="attribute-form">
            <div className="form-group">
              <label>{t.tagSchemaManager.optionsListLabel}</label>
              <input
                type="text"
                value={displayValue}
                onChange={(e) => {
                  setTempOptionsList({ ...tempOptionsList, [tagKey]: e.target.value });
                }}
                onBlur={(e) => {
                  const arrayValue = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                  handleUpdateOptions(tagKey, 'optionsList', arrayValue);
                }}
                placeholder="high, medium, low"
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.defaultValue}</label>
              <input
                type="text"
                value={selectOptions.defaultValue ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'defaultValue', e.target.value || undefined)}
                placeholder={t.tagSchemaManager.defaultValuePlaceholder}
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.displayFormat}</label>
              <select
                value={selectOptions.displayFormat || 'dropdown'}
                onChange={(e) => handleUpdateOptions(tagKey, 'displayFormat', e.target.value as 'dropdown' | 'radio')}
              >
                <option value="dropdown">{t.tagSchemaManager.dropdown}</option>
                <option value="radio">{t.tagSchemaManager.radio}</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={selectOptions.allowManualEntry || false}
                  onChange={(e) => handleUpdateOptions(tagKey, 'allowManualEntry', e.target.checked)}
                />
                {t.tagSchemaManager.allowManualEntry}
              </label>
            </div>
          </div>
        );
      }

      case 'MultiSelect': {
        const multiSelectOptions = options.options as any;
        const displayValue = tempOptionsList[tagKey] ?? multiSelectOptions.optionsList?.join(', ') ?? '';
        
        return (
          <div className="attribute-form">
            <div className="form-group">
              <label>{t.tagSchemaManager.optionsListLabel}</label>
              <input
                type="text"
                value={displayValue}
                onChange={(e) => {
                  setTempOptionsList({ ...tempOptionsList, [tagKey]: e.target.value });
                }}
                onBlur={(e) => {
                  const arrayValue = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                  handleUpdateOptions(tagKey, 'optionsList', arrayValue);
                }}
                placeholder="bug, feature, enhancement"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={multiSelectOptions.allowManualEntry || false}
                  onChange={(e) => handleUpdateOptions(tagKey, 'allowManualEntry', e.target.checked)}
                />
                {t.tagSchemaManager.allowManualEntry}
              </label>
            </div>
          </div>
        );
      }

      case 'Currency':
        return (
          <div className="attribute-form">
            <div className="form-group">
              <label>{t.tagSchemaManager.minValue}</label>
              <input
                type="number"
                value={options.options.min ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'min', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={t.tagSchemaManager.unlimited}
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.maxValue}</label>
              <input
                type="number"
                value={options.options.max ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'max', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={t.tagSchemaManager.unlimited}
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.decimalPlacesLabel}</label>
              <input
                type="number"
                value={options.options.decimalPlaces ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'decimalPlaces', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="2"
              />
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.currencyFormat}</label>
              <select
                value={options.options.currencyFormat || 'JPY'}
                onChange={(e) => handleUpdateOptions(tagKey, 'currencyFormat', e.target.value)}
              >
                <option value="JPY">JPY (¥)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t.tagSchemaManager.defaultValue}</label>
              <input
                type="number"
                value={options.options.defaultValue ?? ''}
                onChange={(e) => handleUpdateOptions(tagKey, 'defaultValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={t.tagSchemaManager.defaultValuePlaceholder}
              />
            </div>
          </div>
        );

      case 'Image':
      case 'Hyperlink':
        return (
          <div className="attribute-form">
            <p className="form-hint">{t.tagSchemaManager.noOptions}</p>
          </div>
        );

      default:
        return null;
    }
  };

  // 未定義タグのおすすめ型推定
  const inferRecommendedType = useCallback((tagKey: string): TagAttributeType => {
    const values = Object.keys(tagIndex?.categories[tagKey]?.values || {});
    if (values.length === 0) return 'String';

    const allNumeric = values.every(v => /^[-+]?\d+(?:[.,]\d+)?$/.test(v));
    if (allNumeric) return 'Number';

    const allBoolean = values.every(v => /^(true|false|0|1)$/i.test(v));
    if (allBoolean) return 'Boolean';

    const allDateLike = values.every(v => /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(v));
    if (allDateLike) return 'Datetime';

    const manyDistinct = values.length > 0 && values.length <= 12 && values.every(v => v.length <= 24);
    if (manyDistinct) return 'Select';

    const looksMulti = values.some(v => v.includes(','));
    if (looksMulti) return 'MultiSelect';

    return 'String';
  }, [tagIndex]);

  // 未定義タグ選択時に型の初期候補を更新
  useEffect(() => {
    if (selectedTag && !localSchema[selectedTag]) {
      setNewUndefType(inferRecommendedType(selectedTag));
    }
  }, [selectedTag, localSchema, inferRecommendedType]);

  const isDirty = useMemo(() => {
    return JSON.stringify(localSchema) !== JSON.stringify(schema);
  }, [localSchema, schema]);

  // スキーマ定義済み + スキャン済みタグの結合リスト
  const allTagKeys = useMemo(() => {
    const schemaKeys = Object.keys(localSchema);
    const scannedKeys = tagIndex ? Object.keys(tagIndex.categories) : [];
    return Array.from(new Set([...schemaKeys, ...scannedKeys]));
  }, [localSchema, tagIndex]);

  // タグの使用回数合計
  const getUsageCount = useCallback((tagKey: string): number => {
    const cat = tagIndex?.categories[tagKey];
    if (!cat) return 0;
    return Object.values(cat.values).reduce((a, b) => a + b, 0);
  }, [tagIndex]);

  // 検索・フィルタ・ソート（全タグ）
  const filteredTags = useMemo(() => {
    let keys = [...allTagKeys];

    // テンプレートで使用されているタグのみ
    if (templateFilter && templates.length > 0) {
      const tpl = templates.find(t => t.name === templateFilter);
      if (tpl) {
        const templateTagKeys = new Set(Object.keys(tpl.tags));
        keys = keys.filter(k => templateTagKeys.has(k));
      }
    }

    // タグ名検索
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      keys = keys.filter(k => k.toLowerCase().includes(q));
    }

    // 属性フィルタ
    if (attributeFilter !== 'all') {
      keys = keys.filter(k => localSchema[k]?.type === attributeFilter);
    }

    // 未使用非表示
    if (hideUnused) {
      keys = keys.filter(k => getUsageCount(k) > 0);
    }

    // 使用数しきい値
    if (minUsage !== '' && typeof minUsage === 'number') {
      keys = keys.filter(k => getUsageCount(k) >= minUsage);
    }

    // 並べ替え
    keys.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortKey === 'usage') {
        return (getUsageCount(a) - getUsageCount(b)) * dir;
      }
      if (sortKey === 'name') {
        return a.localeCompare(b) * dir;
      }
      if (sortKey === 'attribute') {
        const at = localSchema[a]?.type || '';
        const bt = localSchema[b]?.type || '';
        const cmp = String(at).localeCompare(String(bt));
        return cmp * dir || a.localeCompare(b);
      }
      if (sortKey === 'valueName') {
        const av = Object.keys(tagIndex?.categories[a]?.values || {}).sort()[0] || '';
        const bv = Object.keys(tagIndex?.categories[b]?.values || {}).sort()[0] || '';
        return av.localeCompare(bv) * dir || a.localeCompare(b);
      }
      return 0;
    });

    return keys;
  }, [allTagKeys, templates, templateFilter, searchQuery, attributeFilter, hideUnused, minUsage, sortKey, sortOrder, localSchema, tagIndex, getUsageCount]);

  // If no workspace is open, show a friendly placeholder instead of rendering nothing
  if (!workspacePath) {
    return (
      <div className="tag-settings-view">
        <div className="placeholder">
          <p>{t.settings.workspace}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tag-settings-view">
        <div className="placeholder">
          <p>{t.app.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tag-settings-view">
        <div className="placeholder">
          <p className="error">{t.common.error}: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tag-settings-view">
      <div className="tag-settings-header">
        <h2>{t.tags.management}</h2>
        <div className="header-actions">
          <button className="btn-close" onClick={onClose} title={t.common.close} aria-label={t.common.close}>×</button>
        </div>
      </div>
      
      <div className="tag-settings-content">
        {/* 左ペイン：マスター */}
        <div className="master-panel" style={{ width: `${masterPanelWidth}px` }}>
          <button className="btn-new-tag" onClick={handleShowNewTagForm} title={t.tags.addTag} aria-label={t.tags.addTag}>
            ＋ {t.tags.addTag}
          </button>
          
          {/* 検索行（アイコン + 入力 + フィルタボタン） */}
          <div className="search-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--app-text-sub)' }}>
              <path d="M10 2a8 8 0 105.293 14.293l4.207 4.207 1.414-1.414-4.207-4.207A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z" />
            </svg>
            <input
              type="text"
              className="tag-search-input"
              placeholder={t.tags.searchTags}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FilterPopover
              sortKey={sortKey}
              sortOrder={sortOrder}
              attributeFilter={attributeFilter}
              minUsage={minUsage}
              hideUnused={hideUnused}
              templateFilter={templateFilter}
              templateNames={templates.map(t => t.name)}
              onSortKeyChange={(k) => setSortKey(k)}
              onSortOrderChange={(o) => setSortOrder(o)}
              onAttributeFilterChange={(a) => setAttributeFilter(a)}
              onMinUsageChange={(v) => setMinUsage(v)}
              onHideUnusedChange={(c) => setHideUnused(c)}
              onTemplateFilterChange={(name) => setTemplateFilter(name)}
            />
          </div>
          
          <div className="tag-list">
            {allTagKeys.length === 0 ? (
              <p className="empty-state">{t.tags.noTags}</p>
            ) : filteredTags.length === 0 ? (
              <p className="empty-state">{t.tags.noResults || ''}</p>
            ) : (
              filteredTags.map((tagKey) => (
                <div
                  key={tagKey}
                  className={`tag-list-item ${selectedTag === tagKey ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tagKey)}
                >
                  <span className="tag-name">{tagKey}</span>
                  <span className="tag-type">
                    {localSchema[tagKey]?.type || 'Undefined'}
                  </span>
                  <div className="tag-right-group">
                    <span className="tag-count">{getUsageCount(tagKey)}</span>
                    {localSchema[tagKey] && (
                      <button
                        className="btn-delete-tag"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTag(tagKey);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Resizer onResize={handleResize} direction="horizontal" />

        {/* 右ペイン：ディテール */}
        <div className="detail-panel">
          {selectedTag === null && (
            <div className="detail-placeholder">
              <p>{t.tags.selectTagHint || ''}</p>
            </div>
          )}
          
          {selectedTag === '__NEW__' && (
            <div className="detail-content">
              <h3>{t.tagSchemaManager.addTag}</h3>
              <div className="form-group">
                <label>{t.tagSchemaManager.tagKey}</label>
                <input
                  type="text"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                  placeholder={t.tagSchemaManager.tagKeyPlaceholder}
                />
              </div>
              <div className="form-group">
                <label>{t.tagSchemaManager.tagType}</label>
                <select
                  value={newTagAttributeType}
                  onChange={(e) => setNewTagAttributeType(e.target.value as TagAttributeType)}
                >
                  <option value="String">String</option>
                  <option value="Number">Number</option>
                  <option value="Boolean">Boolean</option>
                  <option value="Datetime">Datetime</option>
                  <option value="Select">Select</option>
                  <option value="MultiSelect">MultiSelect</option>
                  <option value="Currency">Currency</option>
                  <option value="Image">Image</option>
                  <option value="Hyperlink">Hyperlink</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button 
                  className="btn-save" 
                  onClick={handleCreateTag}
                  title={t.common.add}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    minWidth: '48px',
                    minHeight: '48px',
                    padding: '0'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                  </svg>
                </button>
                <button 
                  className="btn-cancel" 
                  onClick={() => {
                    setSelectedTag(null);
                    setNewTagKey('');
                    setNewTagAttributeType('String');
                  }}
                  style={{ 
                    background: 'var(--app-bg-hover)', 
                    color: 'var(--app-text-main)', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    minWidth: '48px',
                    minHeight: '48px',
                    padding: '0'
                  }}
                  title={t.common.cancel}
                >
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {selectedTag && selectedTag !== '__NEW__' && localSchema[selectedTag] && (
            <div className="detail-content">
              <div className="detail-tabs">
                <button
                  className={`tab-button ${activeDetailTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('settings')}
                >
                  {t.tagSchemaManager.settingsTab}
                </button>
                <button
                  className={`tab-button ${activeDetailTab === 'analysis' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('analysis')}
                >
                  {t.tagSchemaManager.analysisTab}
                </button>
              </div>
              
              {activeDetailTab === 'settings' && localSchema[selectedTag] && (
                <div className="settings-content">
                  <h3>{selectedTag}</h3>
                  <p className="tag-type-label">{t.tagSchemaManager.typeReadOnly(localSchema[selectedTag]?.type || '')}</p>
                  {renderAttributeForm(selectedTag, localSchema[selectedTag])}
                  <div className="detail-actions">
                    <button
                      className="btn-cancel"
                      onClick={handleDiscard}
                      title={t.common.cancel}
                      aria-label={t.common.cancel}
                    >
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                      </svg>
                    </button>
                    <button
                      className="btn-save"
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                      title={t.common.save}
                      aria-label={t.common.save}
                    >
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: saving ? 0.6 : 1 }}>
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {activeDetailTab === 'analysis' && (
                <div className="analysis-content">
                  <h3>{t.tagSchemaManager.statistics}</h3>
                  {tagStats[selectedTag] ? (
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-label">{t.tagSchemaManager.uniqueValues}</div>
                        <div className="stat-value">{tagStats[selectedTag].uniqueValues}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">{t.tagSchemaManager.totalUsage}</div>
                        <div className="stat-value">{tagStats[selectedTag].totalCount}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="no-stats">{t.tagSchemaManager.noStatistics}</p>
                  )}

                  {/* 値一覧と逆引き */}
                  <div style={{ marginTop: '1rem' }}>
                    <h4>{t.tagSchemaManager.usageByValue}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {Object.entries(tagIndex?.categories[selectedTag]?.values || {}).sort((a, b) => (b[1] - a[1])).map(([val, count]) => (
                        <button
                          key={val}
                          className={`chip ${selectedValue === val ? 'active' : ''}`}
                          onClick={() => setSelectedValue(selectedValue === val ? null : val)}
                          title={`${val}: ${count}`}
                          style={{ cursor: 'pointer' }}
                        >
                          {val} <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>{count}</span>
                        </button>
                      ))}
                    </div>

                    {/* 該当タスク一覧 */}
                    {selectedValue && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <h4>{t.tagSchemaManager.relatedTasks}</h4>
                        <ul className="task-list">
                          {Object.values(workspace?.tasks || {}).filter((task: Task) => {
                            const v = task.frontMatter[selectedTag!];
                            if (Array.isArray(v)) return v.includes(selectedValue!);
                            if (typeof v === 'object' && v && 'url' in (v as any)) return false; // 非対応
                            return String(v) === selectedValue!;
                          }).map(task => (
                            <li key={task.id}>
                              <button className="task-link" onClick={() => onOpenTask && onOpenTask(task.id)} title={task.id}>
                                {task.id}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 未定義タグの詳細（追加を促す） */}
          {selectedTag && selectedTag !== '__NEW__' && !localSchema[selectedTag] && (
            <div className="detail-content">
              <h3>{selectedTag}</h3>
              <p className="tag-type-label">{t.tagSchemaManager.tagNotDefined}</p>
              {tagStats[selectedTag] ? (
                <div className="analysis-content" style={{ marginTop: '1rem' }}>
                  <h4>{t.tagSchemaManager.statistics}</h4>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">{t.tagSchemaManager.uniqueValues}</div>
                      <div className="stat-value">{tagStats[selectedTag].uniqueValues}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">{t.tagSchemaManager.totalUsage}</div>
                      <div className="stat-value">{tagStats[selectedTag].totalCount}</div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>{t.tagSchemaManager.attributeTypeRecommended(inferRecommendedType(selectedTag))}</label>
                <select value={newUndefType} onChange={(e) => setNewUndefType(e.target.value as TagAttributeType)}>
                  <option value="String">{t.tagSchemaManager.stringType}</option>
                  <option value="Number">{t.tagSchemaManager.numberType}</option>
                  <option value="Boolean">{t.tagSchemaManager.booleanType}</option>
                  <option value="Datetime">{t.tagSchemaManager.datetimeType}</option>
                  <option value="Select">{t.tagSchemaManager.selectType}</option>
                  <option value="MultiSelect">{t.tagSchemaManager.multiselectType}</option>
                  <option value="Currency">{t.tagSchemaManager.currencyType}</option>
                  <option value="Image">{t.tagSchemaManager.imageType}</option>
                  <option value="Hyperlink">{t.tagSchemaManager.hyperlinkType}</option>
                </select>
              </div>
              <div className="detail-actions">
                <button
                  className="btn-save"
                  title={t.tagSchemaManager.addToSchema}
                  aria-label={t.tagSchemaManager.addToSchema}
                  onClick={() => {
                    // 選択型で追加
                    const defaultOptions: Record<TagAttributeType, any> = {
                      String: { maxLength: undefined, defaultValue: undefined },
                      Number: { min: undefined, max: undefined, decimalPlaces: undefined, defaultValue: undefined, formatAsPercentage: false },
                      Boolean: { defaultValue: undefined },
                      Datetime: { format: 'dateOnly', defaultValue: undefined },
                      Select: { optionsList: Object.keys(tagIndex?.categories[selectedTag!]?.values || {}), allowManualEntry: false, defaultValue: undefined, displayFormat: 'dropdown' },
                      MultiSelect: { optionsList: Object.keys(tagIndex?.categories[selectedTag!]?.values || {}), allowManualEntry: false, defaultValue: [] },
                      Currency: { min: undefined, max: undefined, decimalPlaces: 2, defaultValue: undefined, currencyFormat: 'JPY' },
                      Image: {},
                      Hyperlink: {},
                    };
                    const updated = {
                      ...localSchema,
                      [selectedTag]: {
                        type: newUndefType,
                        options: defaultOptions[newUndefType],
                      } as any,
                    };
                    setLocalSchema(updated);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a.5.5 0 0 1 .5.5V7H14a.5.5 0 0 1 0 1H8.5v5.5a.5.5 0 0 1-1 0V8H2a.5.5 0 0 1 0-1h5.5V1.5A.5.5 0 0 1 8 1z"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

