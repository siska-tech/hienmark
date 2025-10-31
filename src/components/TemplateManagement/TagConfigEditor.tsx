/**
 * タグ設定編集コンポーネント
 * タグのエイリアス、許容値、型定義を編集する
 */

import { useState } from 'react';
import type { TagConfig, AllowedValueType } from '../../types/task';
import './TagConfigEditor.css';

interface TagConfigEditorProps {
  tagKey: string;
  config?: TagConfig;
  onUpdate: (tagKey: string, config: TagConfig) => void;
  onClose: () => void;
  onTagKeyChange?: (newTagKey: string) => void;
}

export function TagConfigEditor({ tagKey, config, onUpdate, onClose, onTagKeyChange }: TagConfigEditorProps) {
  const isNewTag = tagKey === '__new__';
  const defaultConfig: TagConfig = {
    alias: '',
    tagType: 'String',
    allowedValueType: undefined,
    defaultValue: undefined,
    required: false,
    description: ''
  };
  
  const currentConfig = config || defaultConfig;
  
  const [alias, setAlias] = useState(currentConfig.alias || '');
  const [description, setDescription] = useState(currentConfig.description || '');
  const [required, setRequired] = useState(currentConfig.required);
  const [tagType, setTagType] = useState(currentConfig.tagType);
  const [newTagKey, setNewTagKey] = useState('');
  const [allowedValueType, setAllowedValueType] = useState<AllowedValueType>(
    currentConfig.allowedValueType || { type: 'DirectInput' }
  );
  const [isSaving, setIsSaving] = useState(false);

  // 許容値タイプの変更ハンドラー
  const handleAllowedValueTypeChange = (type: AllowedValueType['type']) => {
    switch (type) {
      case 'DirectInput':
        setAllowedValueType({ type: 'DirectInput' });
        break;
      case 'List':
        setAllowedValueType({ 
          type: 'List', 
          values: currentConfig.allowedValueType?.type === 'List' 
            ? currentConfig.allowedValueType.values 
            : [] 
        });
        break;
      case 'Pattern':
        setAllowedValueType({ 
          type: 'Pattern', 
          pattern: currentConfig.allowedValueType?.type === 'Pattern' 
            ? currentConfig.allowedValueType.pattern 
            : '' 
        });
        break;
      case 'Range':
        setAllowedValueType({ 
          type: 'Range', 
          min: currentConfig.allowedValueType?.type === 'Range' 
            ? currentConfig.allowedValueType.min 
            : 0,
          max: currentConfig.allowedValueType?.type === 'Range' 
            ? currentConfig.allowedValueType.max 
            : 100
        });
        break;
    }
  };

  // リスト値の追加
  const handleAddListValue = () => {
    if (allowedValueType.type === 'List') {
      setAllowedValueType({
        ...allowedValueType,
        values: [...allowedValueType.values, '']
      });
    }
  };

  // リスト値の更新
  const handleUpdateListValue = (index: number, value: string) => {
    if (allowedValueType.type === 'List') {
      const newValues = [...allowedValueType.values];
      newValues[index] = value;
      setAllowedValueType({
        ...allowedValueType,
        values: newValues
      });
    }
  };

  // リスト値の削除
  const handleRemoveListValue = (index: number) => {
    if (allowedValueType.type === 'List') {
      const newValues = allowedValueType.values.filter((_, i) => i !== index);
      setAllowedValueType({
        ...allowedValueType,
        values: newValues
      });
    }
  };

  // 保存処理
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const updatedConfig: TagConfig = {
        ...currentConfig,
        alias: alias.trim() || undefined,
        description: description.trim() || undefined,
        required,
        tagType,
        allowedValueType: allowedValueType.type === 'DirectInput' ? undefined : allowedValueType
      };
      
      const finalTagKey = isNewTag ? newTagKey.trim() : tagKey;
      if (!finalTagKey) {
        alert('タグキーを入力してください');
        return;
      }
      
      onUpdate(finalTagKey, updatedConfig);
      onClose();
    } catch (err) {
      alert(`保存に失敗しました: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="tag-config-panel">
      <div className="tag-config-header">
        <h3>タグ設定: {isNewTag ? '新規タグ' : tagKey}</h3>
        <button className="btn-close" onClick={onClose} disabled={isSaving}>
          ×
        </button>
      </div>

      <div className="tag-config-content">
        {/* 新規タグの場合はタグキーとタグ型を設定 */}
        {isNewTag && (
          <>
            <div className="form-group">
              <label htmlFor="tag-key">タグキー *</label>
              <input
                id="tag-key"
                type="text"
                value={newTagKey}
                onChange={(e) => {
                  setNewTagKey(e.target.value);
                  if (onTagKeyChange) {
                    onTagKeyChange(e.target.value);
                  }
                }}
                placeholder="例: status, priority, assignee"
              />
              <small className="form-hint">
                タグの識別子（英数字とアンダースコア）
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="tag-type">タグの型</label>
              <select
                id="tag-type"
                value={tagType}
                onChange={(e) => setTagType(e.target.value as any)}
              >
                <option value="String">文字列</option>
                <option value="Select">選択（単一）</option>
                <option value="MultiSelect">選択（複数）</option>
                <option value="Number">数値</option>
                <option value="Boolean">真偽値</option>
                <option value="Date">日付</option>
                <option value="Array">配列</option>
              </select>
            </div>
          </>
        )}

        {/* エイリアス設定 */}
        <div className="form-group">
          <label htmlFor="tag-alias">エイリアス（表示名）</label>
          <input
            id="tag-alias"
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="例: ステータス"
          />
          <small className="form-hint">
            空の場合はタグキーがそのまま表示されます
          </small>
        </div>

        {/* 説明設定 */}
        <div className="form-group">
          <label htmlFor="tag-description">説明</label>
          <textarea
            id="tag-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="タグの用途や説明を入力"
            rows={2}
          />
        </div>

        {/* 必須設定 */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            <span>必須タグ</span>
          </label>
        </div>

        {/* 許容値設定 */}
        <div className="form-group">
          <label>許容値の設定</label>
          <div className="allowed-value-type-selector">
            <label className="radio-label">
              <input
                type="radio"
                name="allowedValueType"
                value="DirectInput"
                checked={allowedValueType.type === 'DirectInput'}
                onChange={() => handleAllowedValueTypeChange('DirectInput')}
              />
              <span>直接入力（自由な値）</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="allowedValueType"
                value="List"
                checked={allowedValueType.type === 'List'}
                onChange={() => handleAllowedValueTypeChange('List')}
              />
              <span>リスト設定（選択肢の定義）</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="allowedValueType"
                value="Pattern"
                checked={allowedValueType.type === 'Pattern'}
                onChange={() => handleAllowedValueTypeChange('Pattern')}
              />
              <span>パターン設定（正規表現）</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="allowedValueType"
                value="Range"
                checked={allowedValueType.type === 'Range'}
                onChange={() => handleAllowedValueTypeChange('Range')}
              />
              <span>範囲設定（数値の範囲）</span>
            </label>
          </div>
        </div>

        {/* リスト設定の詳細 */}
        {allowedValueType.type === 'List' && (
          <div className="form-group">
            <label>選択肢のリスト</label>
            <div className="list-values">
              {allowedValueType.values.map((value, index) => (
                <div key={index} className="list-value-item">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleUpdateListValue(index, e.target.value)}
                    placeholder={`選択肢 ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-danger-small"
                    onClick={() => handleRemoveListValue(index)}
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddListValue}
              >
                + 選択肢を追加
              </button>
            </div>
          </div>
        )}

        {/* パターン設定の詳細 */}
        {allowedValueType.type === 'Pattern' && (
          <div className="form-group">
            <label htmlFor="pattern-input">正規表現パターン</label>
            <input
              id="pattern-input"
              type="text"
              value={allowedValueType.pattern}
              onChange={(e) => setAllowedValueType({
                ...allowedValueType,
                pattern: e.target.value
              })}
              placeholder="例: ^[a-zA-Z0-9]+$"
            />
            <small className="form-hint">
              正規表現で入力値を制限します
            </small>
          </div>
        )}

        {/* 範囲設定の詳細 */}
        {allowedValueType.type === 'Range' && (
          <div className="form-group">
            <label>数値の範囲</label>
            <div className="range-inputs">
              <div className="range-input-group">
                <label htmlFor="min-value">最小値</label>
                <input
                  id="min-value"
                  type="number"
                  value={allowedValueType.min}
                  onChange={(e) => setAllowedValueType({
                    ...allowedValueType,
                    min: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div className="range-input-group">
                <label htmlFor="max-value">最大値</label>
                <input
                  id="max-value"
                  type="number"
                  value={allowedValueType.max}
                  onChange={(e) => setAllowedValueType({
                    ...allowedValueType,
                    max: parseFloat(e.target.value) || 100
                  })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存'}
        </button>
        <button className="btn-secondary" onClick={onClose} disabled={isSaving}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
