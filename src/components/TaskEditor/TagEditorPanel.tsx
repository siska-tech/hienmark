/**
 * TagEditorPanelコンポーネント
 * TaskEditor内でタグを視覚的に編集するパネル
 */

import { useState, useRef, useEffect } from 'react';
import React from 'react';
import type { FrontMatter, TagValue, TagConfigCollection, TagAttributeType, TagAttributeOptions } from '../../types/task';
import { useTagSchema } from '../../hooks/useTagSchema';
import * as tagSchemaService from '../../services/tagSchemaService';
// すべての動的入力コンポーネントをインポート（将来的な拡張に備えて）
import { BooleanInput, SelectInput, MultiSelectInput, NumberInput, DateInput, CurrencyInput, ImageInput, HyperlinkInput } from '../DynamicTagInputs';
import './TagEditorPanel.css';
import { useLanguage } from '../../contexts/LanguageContext';

interface TagEditorPanelProps {
  frontMatter: FrontMatter;
  tagConfigs: TagConfigCollection | null;
  onTagChange: (key: string, value: TagValue) => void;
  onTagRemove: (key: string) => void;
  onTagAdd: (key: string, value: TagValue) => void;
  onTagReorder?: (tagOrder: string[]) => void;
  onToggleFrontMatter?: () => void;
  [key: string]: any; // 将来の拡張に備えた柔軟な型定義
  showFrontMatter?: boolean;
  tagOrder?: string[]; // FrontMatterの順序を外部から受け取る
  onDragStateChange?: (isDragging: boolean) => void; // ドラッグ状態変更通知
  onDirtyChange?: (isDirty: boolean) => void; // 編集状態変更通知
  workspacePath?: string | null; // ワークスペースパス（タグスキーマロード用）
}


export function TagEditorPanel({
  frontMatter,
  tagConfigs,
  onTagChange,
  onTagRemove,
  onTagAdd,
  onTagReorder,
  onToggleFrontMatter,
  showFrontMatter = false,
  tagOrder = [],
  onDragStateChange,
  onDirtyChange,
  workspacePath
}: TagEditorPanelProps) {
  const { t } = useLanguage();
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagAttributeType, setNewTagAttributeType] = useState<TagAttributeType | ''>('');
  const [addMode, setAddMode] = useState<'manual' | 'existing'>('manual');
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const draggedTagRef = useRef<string | null>(null);
  const eventListenersRef = useRef<{ mouseMove: ((e: MouseEvent) => void) | null; mouseUp: ((e: MouseEvent) => void) | null }>({ mouseMove: null, mouseUp: null });

  // カスタムタグの編集状態
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // タグスキーマを読み込む
  const { schema } = useTagSchema(workspacePath || null);

  // 既存のタグを取得
  const existingTags = Object.keys(frontMatter);
  
  // スキーマで定義されているがまだ追加されていないタグのリスト
  const availableTagsFromSchema = schema ? Object.keys(schema).filter(key => !existingTags.includes(key)) : [];

  // スキーマに基づいて動的タグ入力をレンダリングする関数
  const renderTagInput = (tagKey: string, _config: any, currentValue: any) => {
    const schemaDef = schema?.[tagKey];
    
    // スキーマが存在する場合は動的入力コンポーネントを使用
    if (schemaDef) {
      switch (schemaDef.type) {
        case 'String':
          // String型の場合は従来の実装を使用
          break;
        
        case 'Number':
          return (
            <NumberInput
              value={currentValue as number | undefined}
              onChange={(value) => onTagChange(tagKey, value)}
              schema={schemaDef}
            />
          );
        
        case 'Boolean':
          return (
            <BooleanInput
              value={currentValue as boolean | undefined}
              onChange={(value) => onTagChange(tagKey, value)}
              schema={schemaDef}
            />
          );
        
        case 'Datetime':
          return (
            <DateInput
              value={currentValue as string | undefined}
              onChange={(value) => onTagChange(tagKey, value)}
              schema={schemaDef}
            />
          );
        
        case 'Select':
          return (
            <SelectInput
              value={currentValue as string | undefined}
              onChange={(value) => onTagChange(tagKey, value)}
              schema={schemaDef}
            />
          );
        
        case 'MultiSelect':
          return (
            <MultiSelectInput
              value={currentValue as string[] | undefined}
              onChange={(value) => onTagChange(tagKey, value)}
              schema={schemaDef}
            />
          );
        
        case 'Currency':
          return (
            <CurrencyInput
              value={currentValue as number | undefined}
              onChange={(value) => onTagChange(tagKey, value)}
              schema={schemaDef}
            />
          );
        
        case 'Image':
          return (
            <ImageInput
              value={currentValue as string | undefined}
              onChange={(value) => onTagChange(tagKey, value)}
              schema={schemaDef}
              workspacePath={workspacePath}
            />
          );
        
        case 'Hyperlink':
          return (
            <HyperlinkInput
              value={currentValue as any | undefined}
              onChange={(value) => onTagChange(tagKey, value)}
              schema={schemaDef}
            />
          );
      }
    }
    
    // フォールバック: 従来の実装に戻る
    return null;
  };

  // 編集中の状態を親に通知（編集モードに入ったときのみ）
  useEffect(() => {
    if (editingTag !== null) {
      onDirtyChange?.(true);
    }
    // editingTagがnullになったときはonDirtyChangeを呼ばない
    // （保存時はonTagChangeがsetIsDirty(true)を呼ぶため）
  }, [editingTag, onDirtyChange]);

  // コンポーネントのアンマウント時にイベントリスナーをクリーンアップ
  useEffect(() => {
    return () => {
      if (eventListenersRef.current.mouseMove) {
        document.removeEventListener('mousemove', eventListenersRef.current.mouseMove);
      }
      if (eventListenersRef.current.mouseUp) {
        document.removeEventListener('mouseup', eventListenersRef.current.mouseUp);
      }
    };
  }, []);

  // 独自ドラッグ&ドロップのイベントハンドラー（マウスイベントベース）
  const handleMouseDown = (_e: React.MouseEvent, tagKey: string) => {
    // console.log('🚀 Mouse down start:', tagKey);
    
    // 既存のイベントリスナーをクリーンアップ
    if (eventListenersRef.current.mouseMove) {
      document.removeEventListener('mousemove', eventListenersRef.current.mouseMove);
    }
    if (eventListenersRef.current.mouseUp) {
      document.removeEventListener('mouseup', eventListenersRef.current.mouseUp);
    }
    
    setDraggedTag(tagKey);
    draggedTagRef.current = tagKey; // refにも保存
    onDragStateChange?.(true); // ドラッグ開始を通知
    
    // テキスト選択を無効化
    document.body.style.userSelect = "none";
    document.body.classList.add('dragging');
    
    // グローバルマウスイベントリスナーを追加
    const mouseMoveHandler = (e: MouseEvent) => {
      handleGlobalMouseMove(e);
    };
    
    const mouseUpHandler = (e: MouseEvent) => {
      // console.log('🖱️ Mouse up event fired:', e.clientY);
      
      // 重複実行を防ぐ
      if (!draggedTagRef.current) {
        // console.log('⚠️ Mouse up already processed, ignoring');
        return;
      }
      
      handleGlobalMouseUp(e);
      
      // イベントリスナーを削除（確実に削除）
      if (eventListenersRef.current.mouseMove) {
        document.removeEventListener('mousemove', eventListenersRef.current.mouseMove);
      }
      if (eventListenersRef.current.mouseUp) {
        document.removeEventListener('mouseup', eventListenersRef.current.mouseUp);
      }
      
      // refをクリア
      eventListenersRef.current.mouseMove = null;
      eventListenersRef.current.mouseUp = null;
      
      // console.log('✅ Event listeners cleaned up');
    };
    
    // refに保存
    eventListenersRef.current.mouseMove = mouseMoveHandler;
    eventListenersRef.current.mouseUp = mouseUpHandler;
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    
    // console.log('✅ Event listeners added');
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!draggedTagRef.current) return;
    
    // ログを減らしてパフォーマンスを改善（デバッグ時のみ）
    // console.log('🖱️ Mouse move:', e.clientY, 'dragged:', draggedTagRef.current);
    
    // マウス位置からドロップゾーンを検出
    const elements = document.querySelectorAll('.tag-field');
    let foundIndex: number | null = null;
    
    elements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      // console.log(`Element ${index}:`, rect.top, rect.bottom, 'mouse:', e.clientY);
      if (e.clientY > rect.top && e.clientY < rect.bottom) {
        foundIndex = index;
        // console.log('🎯 Found hover index:', index);
      }
    });
    
    setHoverIndex(foundIndex);
  };

  const handleGlobalMouseUp = (e: MouseEvent) => {
    // console.log('🖱️ Mouse up:', { draggedTag: draggedTagRef.current, hoverIndex, mouseY: e.clientY });
    
    if (draggedTagRef.current) {
      // マウスアップ時の位置から直接ドロップゾーンを検出
      const elements = document.querySelectorAll('.tag-field');
      let targetIndex: number | null = null;
      
      // より柔軟な検出：最も近い要素を選択
      let minDistance = Infinity;
      
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(e.clientY - centerY);
        
        // console.log(`Element ${index}:`, { top: rect.top, bottom: rect.bottom, centerY, distance });
        
        if (distance < minDistance) {
          minDistance = distance;
          targetIndex = index;
        }
      });
      
      // console.log('🎯 Closest target found:', targetIndex, 'distance:', minDistance);
      
      if (targetIndex !== null) {
        // タグの順序を変更
        const currentOrder = tagOrder || existingTags;
        const draggedIndex = currentOrder.indexOf(draggedTagRef.current);
        
        // console.log('🔄 Reorder check:', { currentOrder, draggedIndex, targetIndex });
        
        if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
          const newOrder = [...currentOrder];
          const [draggedItem] = newOrder.splice(draggedIndex, 1);
          newOrder.splice(targetIndex, 0, draggedItem);
          
          console.log('🔄 Reordering tags:', newOrder);
          if (onTagReorder) {
            onTagReorder(newOrder);
            console.log('✅ Tag reorder completed');
          }
        }
      }
    }
    
    // クリーンアップ
    setDraggedTag(null);
    draggedTagRef.current = null; // refもクリア
    setHoverIndex(null);
    onDragStateChange?.(false); // ドラッグ終了を通知
    
    // テキスト選択を復元
    document.body.style.userSelect = "";
    document.body.classList.remove('dragging');
  };

  // ドロップゾーンのレンダリング（独自実装用）
  const renderDropZone = (index: number) => {
    // console.log('Rendering drop zone:', index, 'dragged:', draggedTag);
    const isActive = draggedTag && hoverIndex === index;
    const isVisible = draggedTag && (hoverIndex === index || hoverIndex === null);
    
    return (
      <div
        key={`dropzone-${index}`}
        className={`drop-zone ${draggedTag ? 'active' : ''} ${isActive ? 'hover' : ''}`}
        style={{
          height: isActive ? '20px' : '1px',
          background: isActive ? 'rgba(14, 99, 156, 0.1)' : 'transparent',
          border: isActive ? '1px dashed #0e639c' : 'none',
          borderRadius: '4px',
          margin: draggedTag ? '4px 0' : '0.5px 0',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isVisible ? 1 : 0,
        }}
      >
        {isActive && (
          <span 
            className="drop-indicator" 
            style={{ 
              color: '#0e639c', 
              fontSize: '10px',
              fontWeight: '500',
              opacity: 1,
              transition: 'opacity 0.2s ease'
            }}
          >
            {t.taskEditor.dropHere}
          </span>
        )}
      </div>
    );
  };

  // タグ設定に基づいてタグをレンダリング
  const renderTagField = (tagKey: string, config: any) => {
    const currentValue = frontMatter[tagKey];
    const displayName = config.alias || tagKey;
    
    // スキーマがある場合は、スキーマベースの入力を優先的に使用
    const schemaDef = schema?.[tagKey];
    if (schemaDef) {
      const dynamicInput = renderTagInput(tagKey, config, currentValue);
      if (dynamicInput) {
        // スキーマベースの入力でラッパー
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">⋮⋮</div>
            <label className="tag-label">{displayName}</label>
            {dynamicInput}
            {currentValue && (
              <button className="tag-remove" onClick={() => onTagRemove(tagKey)} title={t.common.delete}>×</button>
            )}
            {config.description && <div className="tag-description">{config.description}</div>}
          </div>
        );
      }
    }

    // スキーマがない場合のみ、従来の設定ベースの処理
    switch (config.tagType) {
      case 'Select':
        // スキーマベースの動的入力を使用
        const selectDynamicInput = renderTagInput(tagKey, config, currentValue);
        if (selectDynamicInput) {
          return (
            <div
              key={tagKey}
              className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, tagKey)}
            >
              <div className="tag-drag-handle">⋮⋮</div>
              <label className="tag-label">{displayName}</label>
              {selectDynamicInput}
              {currentValue && (
                <button className="tag-remove" onClick={() => onTagRemove(tagKey)} title={t.common.delete}>×</button>
              )}
              {config.description && <div className="tag-description">{config.description}</div>}
            </div>
          );
        }
        // 従来の実装（フォールバック）
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">
              ⋮⋮
            </div>
            <label className="tag-label">{displayName}</label>
            <select
              value={currentValue as string || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onTagChange(tagKey, e.target.value);
                } else {
                  onTagRemove(tagKey);
                }
              }}
              className="tag-select"
            >
              <option value="">{t.taskEditor.selectValue}</option>
              {config.allowedValueType?.type === 'List' && config.allowedValueType.values.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {currentValue && (
              <button
                className="tag-remove"
                onClick={() => onTagRemove(tagKey)}
                title={t.common.delete}
              >
                ×
              </button>
            )}
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
          </div>
        );

      case 'MultiSelect':
        // スキーマベースの動的入力を使用
        const multiSelectDynamicInput = renderTagInput(tagKey, config, currentValue);
        if (multiSelectDynamicInput) {
          return (
            <div
              key={tagKey}
              className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, tagKey)}
            >
              <div className="tag-drag-handle">⋮⋮</div>
              <label className="tag-label">{displayName}</label>
              {multiSelectDynamicInput}
              {currentValue && (
                <button className="tag-remove" onClick={() => onTagRemove(tagKey)} title={t.common.delete}>×</button>
              )}
              {config.description && <div className="tag-description">{config.description}</div>}
            </div>
          );
        }
        
        // フォールバック: 従来の実装
        const currentValues = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">
              ⋮⋮
            </div>
            <label className="tag-label">{displayName}</label>
            <div className="tag-multiselect">
              {config.allowedValueType?.type === 'List' && config.allowedValueType.values.map((option: string) => (
                <label key={option} className="tag-checkbox">
                  <input
                    type="checkbox"
                    checked={currentValues.includes(option)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter(v => v !== option);

                      if (newValues.length > 0) {
                        onTagChange(tagKey, newValues);
                      } else {
                        onTagRemove(tagKey);
                      }
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
          </div>
        );

      case 'String': {
        const patternConfig = config.allowedValueType?.type === 'Pattern' ? config.allowedValueType : null;
        const validatePattern = (value: string): string | null => {
          if (patternConfig) {
            try {
              const regex = new RegExp(patternConfig.pattern);
              if (!regex.test(value)) {
                return `パターンに一致しません: ${patternConfig.pattern}`;
              }
            } catch (e) {
              return '無効な正規表現パターン';
            }
          }
          return null;
        };
        
        const currentStringValue = currentValue as string || '';
        const validationError = currentStringValue ? validatePattern(currentStringValue) : null;
        
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">
              ⋮⋮
            </div>
            <label className="tag-label">{displayName}</label>
            <input
              type="text"
              value={currentStringValue}
              onChange={(e) => {
                if (e.target.value) {
                  onTagChange(tagKey, e.target.value);
                } else {
                  onTagRemove(tagKey);
                }
              }}
              className="tag-input"
              placeholder="入力してください"
              style={{ borderColor: validationError ? '#f44336' : undefined }}
            />
            {validationError && (
              <div className="tag-error" style={{ color: '#f44336', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {validationError}
              </div>
            )}
            {currentValue && (
              <button
                className="tag-remove"
                onClick={() => onTagRemove(tagKey)}
                title="削除"
              >
                ×
              </button>
            )}
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
            {patternConfig && !validationError && (
              <div className="tag-hint">
                パターン: {patternConfig.pattern}
              </div>
            )}
          </div>
        );
      }

      case 'Date':
        // スキーマベースの動的入力を使用
        const dateDynamicInput = renderTagInput(tagKey, config, currentValue);
        if (dateDynamicInput) {
          return (
            <div
              key={tagKey}
              className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, tagKey)}
            >
              <div className="tag-drag-handle">⋮⋮</div>
              <label className="tag-label">{displayName}</label>
              {dateDynamicInput}
              {currentValue && (
                <button className="tag-remove" onClick={() => onTagRemove(tagKey)} title="削除">×</button>
              )}
              {config.description && <div className="tag-description">{config.description}</div>}
            </div>
          );
        }
        // フォールバック: 従来の実装
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">
              ⋮⋮
            </div>
            <label className="tag-label">{displayName}</label>
            <input
              type="date"
              value={currentValue as string || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onTagChange(tagKey, e.target.value);
                } else {
                  onTagRemove(tagKey);
                }
              }}
              className="tag-date"
            />
            {currentValue && (
              <button
                className="tag-remove"
                onClick={() => onTagRemove(tagKey)}
                title="削除"
              >
                ×
              </button>
            )}
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
          </div>
        );

      case 'Number': {
        // スキーマベースの動的入力を使用
        const dynamicInput = renderTagInput(tagKey, config, currentValue);
        if (dynamicInput) {
          return (
            <div
              key={tagKey}
              className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, tagKey)}
            >
              <div className="tag-drag-handle">⋮⋮</div>
              <label className="tag-label">{displayName}</label>
              {dynamicInput}
              {currentValue && (
                <button className="tag-remove" onClick={() => onTagRemove(tagKey)} title="削除">×</button>
              )}
              {config.description && <div className="tag-description">{config.description}</div>}
            </div>
          );
        }
        
        // フォールバック: 従来の実装
        const rangeConfig = config.allowedValueType?.type === 'Range' ? config.allowedValueType : null;
        const min = rangeConfig?.min;
        const max = rangeConfig?.max;
        
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">
              ⋮⋮
            </div>
            <label className="tag-label">{displayName}</label>
            <input
              type="number"
              value={currentValue as number || ''}
              min={min}
              max={max}
              onChange={(e) => {
                const numValue = parseFloat(e.target.value);
                if (!isNaN(numValue)) {
                  // 範囲チェック
                  if (min !== undefined && numValue < min) {
                    return; // 最小値未満は無視
                  }
                  if (max !== undefined && numValue > max) {
                    return; // 最大値超過は無視
                  }
                  onTagChange(tagKey, numValue);
                } else if (e.target.value === '') {
                  onTagRemove(tagKey);
                }
              }}
              className="tag-input"
              placeholder={min !== undefined && max !== undefined 
                ? `${min}〜${max}の数値を入力` 
                : '数値を入力'}
            />
            {currentValue && (
              <button
                className="tag-remove"
                onClick={() => onTagRemove(tagKey)}
                title="削除"
              >
                ×
              </button>
            )}
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
            {min !== undefined && max !== undefined && (
              <div className="tag-hint">
                範囲: {min} 〜 {max}
              </div>
            )}
          </div>
        );
      }

      case 'Boolean':
        // スキーマベースの動的入力を使用
        const booleanDynamicInput = renderTagInput(tagKey, config, currentValue);
        if (booleanDynamicInput) {
          return (
            <div
              key={tagKey}
              className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, tagKey)}
            >
              <div className="tag-drag-handle">⋮⋮</div>
              <label className="tag-label">{displayName}</label>
              {booleanDynamicInput}
              {config.description && <div className="tag-description">{config.description}</div>}
            </div>
          );
        }
        // 従来の実装（フォールバック）
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">
              ⋮⋮
            </div>
            <label className="tag-label">{displayName}</label>
            <div className="tag-boolean">
              <label className="tag-checkbox">
                <input
                  type="checkbox"
                  checked={currentValue as boolean || false}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onTagChange(tagKey, true);
                    } else {
                      onTagRemove(tagKey);
                    }
                  }}
                />
                <span>有効</span>
              </label>
            </div>
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
          </div>
        );

      case 'Currency':
        // スキーマベースの動的入力を使用
        const currencyDynamicInput = renderTagInput(tagKey, config, currentValue);
        if (currencyDynamicInput) {
          return (
            <div
              key={tagKey}
              className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, tagKey)}
            >
              <div className="tag-drag-handle">⋮⋮</div>
              <label className="tag-label">{displayName}</label>
              {currencyDynamicInput}
              {config.description && <div className="tag-description">{config.description}</div>}
            </div>
          );
        }
        // フォールバック: Number型として扱う
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">⋮⋮</div>
            <label className="tag-label">{displayName}</label>
            <input
              type="number"
              value={currentValue as number || ''}
              onChange={(e) => {
                const numValue = parseFloat(e.target.value);
                if (!isNaN(numValue)) {
                  onTagChange(tagKey, numValue);
                } else if (e.target.value === '') {
                  onTagRemove(tagKey);
                }
              }}
              className="tag-input"
              placeholder="金額を入力"
            />
            {currentValue && (
              <button
                className="tag-remove"
                onClick={() => onTagRemove(tagKey)}
                title="削除"
              >
                ×
              </button>
            )}
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
          </div>
        );

      case 'Image':
        // スキーマベースの動的入力を使用
        const imageDynamicInput = renderTagInput(tagKey, config, currentValue);
        if (imageDynamicInput) {
          return (
            <div
              key={tagKey}
              className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, tagKey)}
            >
              <div className="tag-drag-handle">⋮⋮</div>
              <label className="tag-label">{displayName}</label>
              {imageDynamicInput}
              {config.description && <div className="tag-description">{config.description}</div>}
            </div>
          );
        }
        // フォールバック: String型として扱う
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">⋮⋮</div>
            <label className="tag-label">{displayName}</label>
            <input
              type="text"
              value={currentValue as string || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onTagChange(tagKey, e.target.value);
                } else {
                  onTagRemove(tagKey);
                }
              }}
              className="tag-input"
              placeholder="画像パスを入力"
            />
            {currentValue && (
              <button
                className="tag-remove"
                onClick={() => onTagRemove(tagKey)}
                title="削除"
              >
                ×
              </button>
            )}
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
          </div>
        );

      case 'Hyperlink':
        // スキーマベースの動的入力を使用
        const hyperlinkDynamicInput = renderTagInput(tagKey, config, currentValue);
        if (hyperlinkDynamicInput) {
          return (
            <div
              key={tagKey}
              className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, tagKey)}
            >
              <div className="tag-drag-handle">⋮⋮</div>
              <label className="tag-label">{displayName}</label>
              {hyperlinkDynamicInput}
              {config.description && <div className="tag-description">{config.description}</div>}
            </div>
          );
        }
        // フォールバック: String型として扱う
        return (
          <div
            key={tagKey}
            className={`tag-field ${draggedTag === tagKey ? 'dragging' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, tagKey)}
          >
            <div className="tag-drag-handle">⋮⋮</div>
            <label className="tag-label">{displayName}</label>
            <input
              type="text"
              value={typeof currentValue === 'object' && currentValue !== null ? JSON.stringify(currentValue) : (currentValue as string || '')}
              onChange={(e) => {
                if (e.target.value) {
                  onTagChange(tagKey, e.target.value);
                } else {
                  onTagRemove(tagKey);
                }
              }}
              className="tag-input"
              placeholder="URLまたはハイパーリンクを入力"
            />
            {currentValue && (
              <button
                className="tag-remove"
                onClick={() => onTagRemove(tagKey)}
                title="削除"
              >
                ×
              </button>
            )}
            {config.description && (
              <div className="tag-description">{config.description}</div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // カスタムタグの編集開始
  const handleStartEditTag = (key: string) => {
    const value = frontMatter[key];
    const isArray = Array.isArray(value);

    // 配列の場合はカンマ区切りに変換
    const stringValue = isArray ? value.join(', ') : String(value);

    setEditingTag(key);
    setEditingValue(stringValue);
  };

  // カスタムタグの編集保存
  const handleSaveEditTag = () => {
    if (!editingTag) return;

    // カンマ区切りかどうかをチェック
    const trimmedValue = editingValue.trim();

    if (trimmedValue.includes(',')) {
      // 配列として保存
      const arrayValue = trimmedValue.split(',').map(v => v.trim()).filter(v => v !== '');
      onTagChange(editingTag, arrayValue);
    } else if (trimmedValue === '') {
      // 空の場合は削除
      onTagRemove(editingTag);
    } else {
      // 文字列として保存
      onTagChange(editingTag, trimmedValue);
    }

    setEditingTag(null);
    setEditingValue('');
  };

  // カスタムタグの編集キャンセル
  const handleCancelEditTag = () => {
    setEditingTag(null);
    setEditingValue('');
  };

  // カスタムタグのレンダリング
  const renderCustomTag = (key: string) => {
    const value = frontMatter[key];
    const isArray = Array.isArray(value);
    const isEditing = editingTag === key;
    
    // スキーマがある場合は動的入力を使用
    const schemaDef = schema?.[key];
    const dynamicInput = schemaDef ? renderTagInput(key, null, value) : null;
    
    // スキーマベースの入力を使用する場合は、通常のタグフィールドとして扱う
    if (dynamicInput && !isEditing) {
      return (
        <div
          key={key}
          className={`tag-field custom-tag ${draggedTag === key ? 'dragging' : ''}`}
          onMouseDown={(e) => handleMouseDown(e, key)}
        >
          <div className="tag-drag-handle">⋮⋮</div>
          <label className="tag-label">{key}</label>
          {dynamicInput}
          {value && (
            <button className="tag-remove" onClick={() => onTagRemove(key)} title="削除">×</button>
          )}
        </div>
      );
    }

    return (
      <div
        key={key}
        className={`tag-field custom-tag ${draggedTag === key ? 'dragging' : ''} ${isEditing ? 'editing' : ''}`}
        onMouseDown={(e) => {
          if (!isEditing) {
            handleMouseDown(e, key);
          }
        }}
      >
        <div className="tag-drag-handle">
          ⋮⋮
        </div>
        <label className="tag-label">{key}</label>

        {isEditing ? (
          // 編集モード
          <div className="tag-edit-container">
            <input
              type="text"
              className="tag-input"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEditTag();
                } else if (e.key === 'Escape') {
                  handleCancelEditTag();
                }
              }}
              placeholder={isArray ? "値1, 値2, 値3" : "値を入力"}
              autoFocus
            />
            <div className="tag-edit-actions">
              <button
                className="btn-save"
                onClick={handleSaveEditTag}
                title="保存"
              >
                ✓
              </button>
              <button
                className="btn-cancel"
                onClick={handleCancelEditTag}
                title="キャンセル"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          // 表示モード
          <>
            <div
              className="tag-value"
              onClick={() => handleStartEditTag(key)}
              style={{ cursor: 'pointer' }}
              title="クリックして編集"
            >
              {isArray ? (
                <span className="tag-array">
                  [{value.join(', ')}]
                </span>
              ) : (
                <span className="tag-single">{String(value)}</span>
              )}
            </div>
            <button
              className="tag-remove"
              onClick={() => onTagRemove(key)}
              title="削除"
            >
              ×
            </button>
          </>
        )}
      </div>
    );
  };

  // 新しいタグの追加
  const handleAddTag = () => {
    if (!newTagKey) return;
    
    // 既存タグから選択モードの場合
    if (addMode === 'existing') {
      const schemaDef = schema?.[newTagKey];
      if (schemaDef) {
        // スキーマに定義されているタグを追加（値はデフォルト値を使用）
        const defaultValue = (schemaDef.options as any)?.defaultValue;
        const value = defaultValue !== undefined ? defaultValue : '';
        onTagAdd(newTagKey, value as TagValue);
      }
    } else {
      // 手動入力モードの場合
      if (!newTagAttributeType) return;
      
      // Datetimeの場合は値の入力を任意にする
      const isValueOptional = newTagAttributeType === 'Datetime';
      if (!isValueOptional && !newTagValue) return;
      
      // 属性タイプに応じた値の変換
      let value: TagValue = newTagValue;
      
      if (newTagAttributeType === 'Boolean') {
        // Booleanはラジオボタンで選択された値を使用
        value = newTagValue === 'true';
      } else if (newTagAttributeType === 'Number') {
        const numValue = parseFloat(newTagValue);
        if (!isNaN(numValue)) {
          value = numValue;
        }
      } else if (newTagAttributeType === 'MultiSelect') {
        value = newTagValue.split(',').map(v => v.trim()).filter(v => v !== '');
      } else if (newTagAttributeType === 'Datetime') {
        // 空の場合はnullとする（空白のみも空とみなす）
        value = (newTagValue && newTagValue.trim()) ? newTagValue : null;
      }
      
      // タグを追加
      onTagAdd(newTagKey, value);
      
      // 手動入力モードの場合、タグスキーマにも属性タイプを追加
      if (workspacePath && !schema?.[newTagKey]) {
        // 現在のスキーマを取得
        const currentSchema = schema || {};
        
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
        
        // 新しい属性タイプに応じた属性オプションを作成
        const attributeOptions: TagAttributeOptions = {
          type: newTagAttributeType,
          options: defaultOptions[newTagAttributeType],
        };
        
        // 新しいスキーマを作成
        const newSchema = {
          ...currentSchema,
          [newTagKey]: attributeOptions
        };
        
        // スキーマを保存
        tagSchemaService.saveTagSchema(workspacePath, newSchema)
          .catch((error) => {
            console.error('Failed to save tag schema:', error);
          });
      }
    }
    
    // フォームをクリア
    setNewTagKey('');
    setNewTagValue('');
    setNewTagAttributeType('');
    setShowAddForm(false);
  };
  
  // 既存タグ選択時に自動的に属性タイプを設定
  const handleSelectExistingTag = (tagKey: string) => {
    setNewTagKey(tagKey);
    const schemaDef = schema?.[tagKey];
    if (schemaDef) {
      // 属性タイプをスキーマから取得
      // TagAttributeOptionsのtypeフィールドを使用
      const attrType = (schemaDef as any).type || 'String';
      setNewTagAttributeType(attrType as TagAttributeType);
    }
  };

  return (
    <div className="tag-editor-panel">
      <div className="tag-panel-header">
        <h3>{t.taskEditor.tags}</h3>
        <div className="tag-panel-actions">
          {onToggleFrontMatter && (
            <button
              className="btn-toggle-frontmatter"
              onClick={onToggleFrontMatter}
              title={showFrontMatter ? 'Front Matterを非表示' : 'Front Matterを表示'}
            >
              {showFrontMatter ? 'FM非表示' : 'FM表示'}
            </button>
          )}
          <button
            className="btn-add-tag"
            onClick={() => {
              if (showAddForm) {
                // フォームを閉じる時はリセット
                setNewTagKey('');
                setNewTagValue('');
                setNewTagAttributeType('');
                setAddMode('manual');
              }
              setShowAddForm(!showAddForm);
            }}
          >
            {showAddForm ? t.common.cancel : `+ ${t.taskEditor.addTag}`}
          </button>
        </div>
      </div>

      <div
        className="tag-panel-content"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* 最初のドロップゾーン */}
        {renderDropZone(0)}

        {/* タグ設定に基づくタグフィールド（順序に従って表示） */}
        {(tagOrder.length > 0 ? tagOrder : existingTags)
          .filter(tagKey => tagConfigs?.configs[tagKey])
          .map((tagKey, index) => (
            <React.Fragment key={tagKey}>
              {renderTagField(tagKey, tagConfigs!.configs[tagKey])}
              {renderDropZone(index + 1)}
            </React.Fragment>
          ))
        }

        {/* カスタムタグ（設定にないタグ、順序に従って表示） */}
        {(tagOrder.length > 0 ? tagOrder : existingTags)
          .filter(tagKey => !tagConfigs?.configs[tagKey])
          .map((tagKey, index) => (
            <React.Fragment key={tagKey}>
              {renderCustomTag(tagKey)}
              {renderDropZone((tagOrder.length > 0 ? tagOrder : existingTags).filter(key => tagConfigs?.configs[key]).length + index + 1)}
            </React.Fragment>
          ))
        }

        {/* 新しいタグ追加フォーム */}
        {showAddForm && (
          <div className="tag-add-form">
            <h3>{t.tagSchemaManager.addTag}</h3>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className={`btn-secondary ${addMode === 'manual' ? 'active' : ''}`}
                onClick={() => setAddMode('manual')}
                type="button"
              >
                {t.templateEditor.addTagManually}
              </button>
              <button 
                className={`btn-secondary ${addMode === 'existing' ? 'active' : ''}`}
                onClick={() => setAddMode('existing')}
                type="button"
              >
                {t.templateEditor.addTagFromIndex}
              </button>
            </div>
            
            {addMode === 'manual' ? (
              <div className="tag-field">
                <label className="tag-label">{t.tagSchemaManager.tagKey}</label>
                <input
                  type="text"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                  className="tag-input"
                  placeholder={t.tagSchemaManager.tagKeyPlaceholder}
                />
              </div>
            ) : (
              <div className="tag-field">
                <label className="tag-label">{t.tagSchemaManager.tagKey}</label>
                <select
                  value={newTagKey}
                  onChange={(e) => handleSelectExistingTag(e.target.value)}
                  className="tag-input"
                >
                  <option value="">{t.taskEditor.selectValue}</option>
                  {availableTagsFromSchema.map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
            )}
            {addMode === 'manual' && (
              <>
                <div className="tag-field">
                  <label className="tag-label">{t.tagSchemaManager.tagType}</label>
                  <select
                    value={newTagAttributeType}
                    onChange={(e) => setNewTagAttributeType(e.target.value as TagAttributeType)}
                    className="tag-input"
                  >
                    <option value="">{t.taskEditor.selectValue}</option>
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
                <div className="tag-field">
                  <label className="tag-label">{t.tags.value}</label>
              {!newTagAttributeType ? (
                <input
                  type="text"
                  value=""
                  disabled
                  className="tag-input"
                  placeholder={t.taskEditor.selectValue}
                  style={{ opacity: 0.5 }}
                />
              ) : newTagAttributeType === 'Boolean' ? (
                <div className="boolean-add-value">
                  <label>
                    <input
                      type="radio"
                      name="booleanValue"
                      value="true"
                      checked={newTagValue === 'true'}
                      onChange={(e) => setNewTagValue(e.target.value)}
                    />
                    <span>{t.common.yes}</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="booleanValue"
                      value="false"
                      checked={newTagValue === 'false'}
                      onChange={(e) => setNewTagValue(e.target.value)}
                    />
                    <span>{t.common.no}</span>
                  </label>
                </div>
              ) : newTagAttributeType === 'Number' ? (
                <input
                  type="number"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  className="tag-input"
                  placeholder="100"
                />
              ) : newTagAttributeType === 'Datetime' ? (
                <input
                  type="datetime-local"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  className="tag-input"
                />
              ) : (
                <input
                  type="text"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  className="tag-input"
                  placeholder={newTagAttributeType === 'MultiSelect' ? '例: bug, feature, ui' : '例: frontend'}
                />
              )}
              </div>
              </>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button 
                className="btn-save" 
                onClick={handleAddTag}
                  title={t.common.add}
                disabled={
                  !newTagKey || 
                  (addMode === 'manual' && (
                    !newTagAttributeType || 
                    (newTagAttributeType !== 'Datetime' && !newTagValue)
                  ))
                }
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
                  setShowAddForm(false);
                  setNewTagKey('');
                  setNewTagValue('');
                  setNewTagAttributeType('');
                  setAddMode('manual');
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
      </div>
    </div>
  );
}
