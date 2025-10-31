/**
 * テンプレート編集コンポーネント
 * テンプレートの作成・編集フォーム
 */

import { useState } from 'react';
import type { TagTemplate, TagValue, TagConfig, TagIndex, HyperlinkValue } from '../../types/task';
import { useTemplates } from '../../hooks/useTemplates';
import { useTagSchema } from '../../hooks/useTagSchema';
import { BooleanInput, SelectInput, MultiSelectInput, NumberInput, DateInput, CurrencyInput, ImageInput, HyperlinkInput } from '../DynamicTagInputs';
import { useLanguage } from '../../contexts/LanguageContext';
import './TemplateEditor.css';

interface TemplateEditorProps {
  workspacePath: string | null;
  template?: TagTemplate;
  tagConfigs?: Record<string, TagConfig>;
  tagIndex?: TagIndex | null;
  onClose: () => void;
}

export function TemplateEditor({ workspacePath, template, tagConfigs, tagIndex, onClose }: TemplateEditorProps) {
  const { t } = useLanguage();
  const { createTemplate, updateTemplate } = useTemplates(workspacePath);
  const { schema: tagSchema } = useTagSchema(workspacePath);

  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [tags, setTags] = useState<Record<string, TagValue>>(template?.tags ?? {});
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [newTagType, setNewTagType] = useState<'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'currency' | 'image' | 'hyperlink'>('string');
  const [isSaving, setIsSaving] = useState(false);
  
  const [useTagIndex, setUseTagIndex] = useState(false); // タグインデックスから選択するかどうか
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>(t.common.none || 'None');

  const isEditing = !!template;

  const handleAddTag = () => {
    if (!newTagKey.trim()) {
      alert(t.templateEditor.noTagKey);
      return;
    }

    if (tags[newTagKey]) {
      alert(t.templateEditor.duplicateKey);
      return;
    }

    let value: TagValue;
    switch (newTagType) {
      case 'number':
      case 'currency':
        value = parseFloat(newTagValue) || 0;
        break;
      case 'boolean':
        value = newTagValue.toLowerCase() === 'true';
        break;
      case 'multiselect':
        value = newTagValue.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'date':
        // 日付はYYYY-MM-DD形式の文字列として保存
        value = newTagValue;
        break;
      case 'select':
        value = newTagValue || '';
        break;
      case 'image':
      case 'hyperlink':
        value = newTagValue || '';
        break;
      default:
        value = newTagValue;
    }

    setTags({ ...tags, [newTagKey]: value });
    setNewTagKey('');
    setNewTagValue('');
  };

  const handleRemoveTag = (key: string) => {
    const newTags = { ...tags };
    delete newTags[key];
    setTags(newTags);
  };

  // タグインデックスからタグを追加（タグスキーマの型情報から）
  const handleAddTagFromIndex = () => {
    if (!selectedCategory) {
      alert(t.templateEditor.selectTag);
      return;
    }

    // 重複チェック
      if (tags[selectedCategory]) {
      if (!confirm(`${t.tags.category} "${selectedCategory}" ${t.templateEditor.duplicateKey}`)) {
        return;
      }
    }

    // 「なし」が選択されている場合はデフォルト値を設定
    if (selectedValue === (t.common.none || 'None') || !selectedValue) {
      // タグスキーマから型情報を取得して「なし」用のデフォルト値を設定
      const attributeOptions = tagSchema?.[selectedCategory];
      let defaultValue: TagValue = '';
      
      if (attributeOptions) {
        switch (attributeOptions.type) {
          case 'Number':
          case 'Currency':
            defaultValue = 0;
            break;
          case 'Boolean':
            defaultValue = false;
            break;
          case 'MultiSelect':
            defaultValue = [];
            break;
          case 'String':
          case 'Datetime':
          case 'Select':
          case 'Image':
          case 'Hyperlink':
          default:
            defaultValue = '';
        }
      } else {
        defaultValue = '';
      }
      
      setTags({ ...tags, [selectedCategory]: defaultValue });
      setSelectedCategory('');
      setSelectedValue(t.common.none || 'None');
      return;
    }

    // タグスキーマから型情報を取得して値を設定
    const attributeOptions = tagSchema?.[selectedCategory];
    let value: TagValue = selectedValue;
    
    if (attributeOptions) {
      // デフォルト値が設定されている場合は使用
      switch (attributeOptions.type) {
        case 'String':
          value = selectedValue;
          break;
        case 'Number':
          value = Number(selectedValue) || 0;
          break;
        case 'Boolean':
          value = selectedValue.toLowerCase() === 'true';
          break;
        case 'Datetime':
          value = selectedValue;
          break;
        case 'Select':
          value = selectedValue;
          break;
        case 'MultiSelect':
          value = selectedValue.split(',').map((v) => v.trim()).filter(Boolean);
          break;
        case 'Currency':
          value = Number(selectedValue) || 0;
          break;
        case 'Image':
        case 'Hyperlink':
          value = selectedValue;
          break;
        default:
          value = selectedValue;
      }
    } else {
      // タグスキーマがない場合は値から推測
      if (!isNaN(Number(selectedValue)) && selectedValue.trim() !== '') {
        value = Number(selectedValue);
      }
    }

    setTags({ ...tags, [selectedCategory]: value });
    setSelectedCategory('');
    setSelectedValue(t.common.none || 'None');
  };

  // タグが選択されたとき、値のリストを更新
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedValue(t.common.none || 'None'); // reset to None
  };

  // タグインデックスから利用可能なタグリストを取得
  const getCategories = () => {
    if (!tagIndex) return [];
    return Object.keys(tagIndex.categories);
  };

  // 選択されたタグの値リストを取得
  const getValuesForCategory = () => {
    if (!tagIndex || !selectedCategory) return [];
    const category = tagIndex.categories[selectedCategory];
    if (!category) return [];
    return Object.keys(category.values);
  };


  const handleUpdateTag = (key: string, value: string) => {
    const currentValue = tags[key];
    let newValue: TagValue;

    if (typeof currentValue === 'number') {
      newValue = parseFloat(value) || 0;
    } else if (typeof currentValue === 'boolean') {
      newValue = value.toLowerCase() === 'true';
    } else if (Array.isArray(currentValue)) {
      newValue = value.split(',').map((v) => v.trim()).filter(Boolean);
    } else {
      newValue = value;
    }

    setTags({ ...tags, [key]: newValue });
  };

  const handleSave = async () => {
    if (!workspacePath) return;

    if (!name.trim()) {
      alert(t.templateEditor.templateNameRequired);
      return;
    }

    if (Object.keys(tags).length === 0) {
      alert(t.templates.noTemplates);
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing) {
        await updateTemplate(name, description || undefined, tags);
        alert(t.templateEditor.savedSuccess);
      } else {
        await createTemplate(name, description || undefined, tags);
        alert(t.templateEditor.savedSuccess);
      }
      onClose();
    } catch (err) {
      alert(`${t.templateEditor.saveError}: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 旧TagSchemaManagerは廃止

  const getValueString = (value: TagValue): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value ?? '');
  };

  const getTypeLabel = (key: string, value: TagValue): string => {
    // タグスキーマから型情報を取得
    const attributeOptions = tagSchema?.[key];
    
    if (attributeOptions) {
      switch (attributeOptions.type) {
        case 'String':
          return '文字列';
        case 'Number':
          return '数値';
        case 'Boolean':
          return '真偽値';
        case 'Datetime':
          return '日付';
        case 'Select':
          return '選択肢';
        case 'MultiSelect':
          return '複数選択肢';
        case 'Currency':
          return '通貨';
        case 'Image':
          return '画像';
        case 'Hyperlink':
          return 'ハイパーリンク';
        default:
          return '不明';
      }
    }
    
    // タグスキーマがない場合は値から推測
    if (Array.isArray(value)) return '配列';
    if (typeof value === 'number') return '数値';
    if (typeof value === 'boolean') return '真偽値';
    // YYYY-MM-DD形式の文字列を日付として判定
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return '日付';
    return '文字列';
  };

  // スキーマに基づいて動的タグ入力をレンダリングする関数
  const renderTagInput = (key: string, value: TagValue) => {
    const schemaDef = tagSchema?.[key];
    
    // スキーマが存在する場合は動的入力コンポーネントを使用
    if (schemaDef) {
      switch (schemaDef.type) {
        case 'String':
          return null; // Stringは従来の実装を使用
        
        case 'Number':
          return (
            <NumberInput
              value={value as number | undefined}
              onChange={(val) => setTags({ ...tags, [key]: val ?? 0 })}
              schema={schemaDef}
            />
          );
        
        case 'Boolean':
          return (
            <BooleanInput
              value={value as boolean | undefined}
              onChange={(val) => setTags({ ...tags, [key]: val ?? false })}
              schema={schemaDef}
            />
          );
        
        case 'Datetime':
          return (
            <DateInput
              value={value as string | undefined}
              onChange={(val) => setTags({ ...tags, [key]: val })}
              schema={schemaDef}
            />
          );
        
        case 'Select':
          return (
            <SelectInput
              value={value as string | undefined}
              onChange={(val) => setTags({ ...tags, [key]: val })}
              schema={schemaDef}
            />
          );
        
        case 'MultiSelect':
          return (
            <MultiSelectInput
              value={value as string[] | undefined}
              onChange={(vals) => setTags({ ...tags, [key]: vals ?? [] })}
              schema={schemaDef}
            />
          );
        
        case 'Currency':
          return (
            <CurrencyInput
              value={value as number | undefined}
              onChange={(val) => setTags({ ...tags, [key]: val ?? 0 })}
              schema={schemaDef}
            />
          );
        
        case 'Image':
          return (
            <ImageInput
              value={value as string | undefined}
              onChange={(val) => setTags({ ...tags, [key]: val })}
              schema={schemaDef}
            />
          );
        
        case 'Hyperlink':
          return (
            <HyperlinkInput
              value={value as HyperlinkValue | undefined}
              onChange={(val) => setTags({ ...tags, [key]: val })}
              schema={schemaDef}
            />
          );
        
        default:
          return null;
      }
    }
    
    return null; // スキーマがない場合は従来の実装を使用
  };

  return (
    <div className="template-editor">
      <div className="template-editor-header">
        <h2>{isEditing ? t.templateEditor.editTitle : t.templateEditor.createTitle}</h2>
        <button className="btn-close" onClick={onClose} disabled={isSaving}>
          ×
        </button>
      </div>

      <div className="template-editor-layout">
        <div className="template-editor-content">
          <div className="form-group">
            <label htmlFor="template-name">{t.templateEditor.templateName}</label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.templates.enterTemplateName}
            disabled={isEditing}
          />
          {isEditing && (
            <small className="form-hint">{t.templateEditor.cannotChangeName}</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="template-description">{t.templateEditor.templateDescription}</label>
          <textarea
            id="template-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.templateEditor.templateDescriptionPlaceholder}
            rows={3}
          />
        </div>

        <div className="tags-section">
          <h3>{t.templateEditor.tagsSection}</h3>

          <div className="current-tags">
            {Object.keys(tags).length === 0 ? (
              <p className="empty-message">{t.templateEditor.noTagsMessage}</p>
            ) : (
              <table className="tags-table">
                <thead>
                  <tr>
                    <th>{t.templateEditor.key}</th>
                    <th>{t.templateEditor.value}</th>
                    <th>{t.templateEditor.type}</th>
                    <th>{t.templateEditor.operation}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(tags).map(([key, value]) => {
                    const dynamicInput = renderTagInput(key, value);
                    const isDate =
                      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
                    return (
                      <tr key={key}>
                        <td className="tag-key">
                          {key}
                          {tagConfigs?.[key]?.alias && (
                            <small className="tag-alias">({tagConfigs[key].alias})</small>
                          )}
                        </td>
                        <td className="tag-value">
                          {dynamicInput || (
                            <input
                              type={isDate ? 'date' : 'text'}
                              value={getValueString(value)}
                              onChange={(e) => handleUpdateTag(key, e.target.value)}
                              placeholder={t.templateEditor.enterValue}
                            />
                          )}
                        </td>
                        <td className="tag-type">
                          {getTypeLabel(key, value)}
                          {tagConfigs?.[key]?.allowedValueType && (
                            <small className="tag-config-info">
                              {tagConfigs[key].allowedValueType?.type === 'List' && 
                                `選択肢: ${tagConfigs[key].allowedValueType.values.length}個`}
                              {tagConfigs[key].allowedValueType?.type === 'Pattern' && 
                                'パターン制約あり'}
                              {tagConfigs[key].allowedValueType?.type === 'Range' && 
                                `範囲: ${tagConfigs[key].allowedValueType.min}-${tagConfigs[key].allowedValueType.max}`}
                            </small>
                          )}
                        </td>
                        <td className="tag-actions">
                          <button
                            className="btn-danger-small"
                            onClick={() => handleRemoveTag(key)}
                          >
                            {t.templateEditor.delete}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="schema-add-form">
            <h3>{t.common.add}</h3>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className={`btn-secondary ${!useTagIndex ? 'active' : ''}`}
                onClick={() => setUseTagIndex(false)}
              >
                {t.templateEditor.addTagManually}
              </button>
              <button
                className={`btn-secondary ${useTagIndex ? 'active' : ''}`}
                onClick={() => setUseTagIndex(true)}
              >
                {t.templateEditor.addTagFromIndex}
              </button>
            </div>

            {!useTagIndex ? (
              <>
                <div className="form-group">
                  <label>{t.templateEditor.tagKey}</label>
                  <input
                    type="text"
                    value={newTagKey}
                    onChange={(e) => setNewTagKey(e.target.value)}
                    placeholder={t.tagSchemaManager.tagKeyPlaceholder}
                  />
                </div>
                <div className="form-group">
                  <label>{t.templateEditor.tagType}</label>
                  <select
                    value={newTagType}
                    onChange={(e) => setNewTagType(e.target.value as any)}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Datetime</option>
                    <option value="select">Select</option>
                    <option value="multiselect">MultiSelect</option>
                    <option value="currency">Currency</option>
                    <option value="image">Image</option>
                    <option value="hyperlink">Hyperlink</option>
                  </select>
                </div>
                <button className="btn-add" onClick={handleAddTag}>
                  {t.templateEditor.addButton}
                </button>
              </>
            ) : (
              <div className="add-tag-from-index">
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="tag-select"
                    style={{ flex: 1 }}
                  >
                    <option value="">{t.templateEditor.selectTag}...</option>
                    {getCategories().map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedCategory && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select
                      value={selectedValue}
                      onChange={(e) => setSelectedValue(e.target.value)}
                      className="tag-value-select"
                      style={{ flex: 1 }}
                    >
                      <option value={t.common.none || 'None'}>{t.common.none || 'None'}</option>
                      {getValuesForCategory().map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary" onClick={handleAddTagFromIndex}>
                      {t.templateEditor.addButton}
                    </button>
                  </div>
                )}
                <small className="form-hint">
                  {t.templateEditor.addTagFromIndex}
                </small>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? t.common.save : isEditing ? t.templates.editTemplate : t.templates.newTemplate}
          </button>
          <button className="btn-secondary" onClick={onClose} disabled={isSaving}>
            {t.common.cancel}
          </button>
        </div>
        </div>

        
      </div>
    </div>
  );
}
