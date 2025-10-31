/**
 * カスタムソートエディタ
 */

import { useState, useRef, useEffect } from 'react';
import type { CustomSort, SortKey } from '../../types/task';
import './CustomSortEditor.css';

interface CustomSortEditorProps {
  sort?: CustomSort;
  onSave: (sort: CustomSort) => void;
  onCancel: () => void;
  availableTags: string[];
}

export function CustomSortEditor({
  sort,
  onSave,
  onCancel,
  availableTags,
}: CustomSortEditorProps) {
  const [name, setName] = useState(sort?.name || '');
  const [description, setDescription] = useState(sort?.description || '');
  const [sortKeys, setSortKeys] = useState<SortKey[]>(
    sort?.sortKeys || [{ tagKey: '', order: 'asc', customOrder: [] }]
  );
  const [handleMissing, setHandleMissing] = useState<'first' | 'last'>(sort?.handleMissing || 'last');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const eventListenersRef = useRef<{ mouseMove: ((e: MouseEvent) => void) | null; mouseUp: ((e: MouseEvent) => void) | null }>({ mouseMove: null, mouseUp: null });

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

  const handleAddSortKey = () => {
    setSortKeys([...sortKeys, { tagKey: '', order: 'asc', customOrder: [] }]);
  };

  const handleRemoveSortKey = (index: number) => {
    setSortKeys(sortKeys.filter((_, i) => i !== index));
  };

  const handleSortKeyChange = (index: number, field: keyof SortKey, value: any) => {
    const newSortKeys = [...sortKeys];
    if (field === 'customOrder') {
      newSortKeys[index] = { ...newSortKeys[index], [field]: value };
    } else {
      newSortKeys[index] = { ...newSortKeys[index], [field]: value };
    }
    setSortKeys(newSortKeys);
  };

  const handleAddCustomOrder = (index: number) => {
    const value = prompt('Enter sort order value (e.g., "high", "medium", "low"):');
    if (!value?.trim()) return;
    
    const newSortKeys = [...sortKeys];
    const current = newSortKeys[index];
    const customOrder = current.customOrder || [];
    
    if (!customOrder.includes(value.trim())) {
      customOrder.push(value.trim());
      newSortKeys[index] = { ...current, customOrder };
      setSortKeys(newSortKeys);
    }
  };

  const handleMouseDown = (_e: React.MouseEvent, sortKeyIndex: number, orderIndex: number) => {
    setDraggedIndex(orderIndex);
    draggedIndexRef.current = orderIndex;
    
    document.body.style.userSelect = "none";
    document.body.classList.add('dragging');
    
    const mouseMoveHandler = (e: MouseEvent) => {
      if (draggedIndexRef.current === null) return;
      
      const elements = document.querySelectorAll(`[data-sort-key="${sortKeyIndex}"] .custom-order-item`);
      let foundIndex: number | null = null;
      
      elements.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        if (e.clientY > rect.top && e.clientY < rect.bottom) {
          foundIndex = idx;
        }
      });
      
      setHoverIndex(foundIndex);
    };
    
    const mouseUpHandler = (e: MouseEvent) => {
      if (draggedIndexRef.current === null) return;
      
      const elements = document.querySelectorAll(`[data-sort-key="${sortKeyIndex}"] .custom-order-item`);
      let targetIndex: number | null = null;
      let minDistance = Infinity;
      
      elements.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(e.clientY - centerY);
        
        if (distance < minDistance) {
          minDistance = distance;
          targetIndex = idx;
        }
      });
      
      if (targetIndex !== null && targetIndex !== draggedIndexRef.current) {
        const newSortKeys = [...sortKeys];
        const customOrder = [...(newSortKeys[sortKeyIndex].customOrder || [])];
        const [moved] = customOrder.splice(draggedIndexRef.current, 1);
        customOrder.splice(targetIndex, 0, moved);
        newSortKeys[sortKeyIndex] = { ...newSortKeys[sortKeyIndex], customOrder };
        setSortKeys(newSortKeys);
      }
      
      setDraggedIndex(null);
      draggedIndexRef.current = null;
      setHoverIndex(null);
      
      document.body.style.userSelect = "";
      document.body.classList.remove('dragging');
      
      if (eventListenersRef.current.mouseMove) {
        document.removeEventListener('mousemove', eventListenersRef.current.mouseMove);
      }
      if (eventListenersRef.current.mouseUp) {
        document.removeEventListener('mouseup', eventListenersRef.current.mouseUp);
      }
      
      eventListenersRef.current.mouseMove = null;
      eventListenersRef.current.mouseUp = null;
    };
    
    eventListenersRef.current.mouseMove = mouseMoveHandler;
    eventListenersRef.current.mouseUp = mouseUpHandler;
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  };

  const handleRemoveCustomOrder = (index: number, orderIndex: number) => {
    const newSortKeys = [...sortKeys];
    const customOrder = [...(newSortKeys[index].customOrder || [])];
    customOrder.splice(orderIndex, 1);
    newSortKeys[index] = { ...newSortKeys[index], customOrder };
    setSortKeys(newSortKeys);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('ソート名を入力してください');
      return;
    }

    if (sortKeys.length === 0) {
      alert('少なくとも1つのソートキーが必要です');
      return;
    }

    // 空のsortKeyをチェック
    if (sortKeys.some((key) => !key.tagKey.trim())) {
      alert('すべてのソートキーにタグを選択してください');
      return;
    }

    const customSort: CustomSort = {
      name: name.trim(),
      description: description.trim() || undefined,
      sortKeys,
      handleMissing,
      createdAt: sort?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(customSort);
  };

  return (
    <div className="custom-sort-editor">
      <div className="editor-header">
        <h3>{sort ? 'Edit Custom Sort' : 'Create Custom Sort'}</h3>
      </div>

      <div className="editor-content">
        <div className="field-group">
          <label>
            <span>Sort Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Priority then Due Date"
            />
          </label>
        </div>

        <div className="field-group">
          <label>
            <span>Description (Optional)</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this sort does"
            />
          </label>
        </div>

        <div className="sort-keys-section">
          <h4>Sort Keys</h4>
          {sortKeys.map((sortKey, index) => (
            <div key={index} className="sort-key-row">
              <select
                value={sortKey.tagKey}
                onChange={(e) => handleSortKeyChange(index, 'tagKey', e.target.value)}
                className="sort-key-tag-select"
              >
                <option value="">Select Tag...</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>

              <select
                value={sortKey.order}
                onChange={(e) => handleSortKeyChange(index, 'order', e.target.value)}
                className="sort-key-order"
              >
                <option value="asc">Ascending (A-Z, 0-9)</option>
                <option value="desc">Descending (Z-A, 9-0)</option>
              </select>

              <button
                type="button"
                onClick={() => handleAddCustomOrder(index)}
                className="btn-add-order"
              >
                + Add Custom Order
              </button>

              {sortKey.customOrder && sortKey.customOrder.length > 0 && (
                <div className="custom-order-list" data-sort-key={index}>
                  <div className="custom-order-header">
                    <span>Custom Order (drag to reorder):</span>
                  </div>
                  {sortKey.customOrder.map((order, orderIndex) => (
                    <div 
                      key={orderIndex} 
                      className={`custom-order-item ${draggedIndex === orderIndex ? 'dragging' : ''} ${hoverIndex === orderIndex && draggedIndex !== orderIndex ? 'drag-over' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, index, orderIndex)}
                    >
                      <span className="order-index">{orderIndex + 1}</span>
                      <span className="order-value">{order}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomOrder(index, orderIndex);
                        }}
                        className="btn-remove-order"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <p className="custom-order-hint">
                    Order: First → Last (drag to reorder)
                  </p>
                </div>
              )}

              {sortKeys.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSortKey(index)}
                  className="btn-remove-sort-key"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddSortKey}
            className="btn-add-sort-key"
          >
            + Add Sort Key
          </button>
        </div>

        <div className="field-group">
          <label>
            <span>Handle Missing Values</span>
            <select
              value={handleMissing}
              onChange={(e) => setHandleMissing(e.target.value as 'first' | 'last')}
            >
              <option value="last">Show Last (default)</option>
              <option value="first">Show First</option>
            </select>
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="btn-save" onClick={handleSave}>
            ✓
          </button>
          <button type="button" className="btn-cancel" onClick={onCancel}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

