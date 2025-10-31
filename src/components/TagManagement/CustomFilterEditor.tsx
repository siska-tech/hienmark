/**
 * カスタムフィルターエディタ
 */

import { useState } from 'react';
import type { CustomFilter, FilterCondition } from '../../types/task';
import './CustomFilterEditor.css';

interface CustomFilterEditorProps {
  filter?: CustomFilter;
  onSave: (filter: CustomFilter) => void;
  onCancel: () => void;
  availableTags: string[];
}

export function CustomFilterEditor({
  filter,
  onSave,
  onCancel,
  availableTags,
}: CustomFilterEditorProps) {
  const [name, setName] = useState(filter?.name || '');
  const [description, setDescription] = useState(filter?.description || '');
  const [conditions, setConditions] = useState<FilterCondition[]>(
    filter?.expression.condition
      ? [filter.expression.condition]
      : [{ tagKey: '', operator: '==', value: '' }]
  );

  const operators = [
    { value: '==', label: 'Equals (==)' },
    { value: '!=', label: 'Not Equals (!=)' },
    { value: '>', label: 'Greater Than (>)' },
    { value: '<', label: 'Less Than (<)' },
    { value: '>=', label: 'Greater or Equal (>=)' },
    { value: '<=', label: 'Less or Equal (<=)' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'regex', label: 'Regex' },
  ];

  const handleAddCondition = () => {
    setConditions([...conditions, { tagKey: '', operator: '==', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof FilterCondition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('フィルター名を入力してください');
      return;
    }

    if (conditions.length === 0) {
      alert('少なくとも1つの条件が必要です');
      return;
    }

    const customFilter: CustomFilter = {
      name: name.trim(),
      description: description.trim() || undefined,
      expression: {
        condition: conditions.length === 1 ? conditions[0] : undefined,
        expressions: conditions.length > 1 ? conditions.map((c) => ({ condition: c })) : undefined,
        logicalOperator: conditions.length > 1 ? 'AND' : undefined,
      },
      createdAt: filter?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(customFilter);
  };

  return (
    <div className="custom-filter-editor">
      <div className="editor-header">
        <h3>{filter ? 'Edit Custom Filter' : 'Create Custom Filter'}</h3>
      </div>

      <div className="editor-content">
        <div className="field-group">
          <label>
            <span>Filter Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Priority Tasks"
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
              placeholder="Brief description of what this filter does"
            />
          </label>
        </div>

        <div className="conditions-section">
          <h4>Conditions</h4>
          {conditions.map((condition, index) => (
            <div key={index} className="condition-row">
              <select
                value={condition.tagKey}
                onChange={(e) => handleConditionChange(index, 'tagKey', e.target.value)}
                className="condition-tag-select"
              >
                <option value="">Select Tag...</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>

              <select
                value={condition.operator}
                onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                className="condition-operator"
              >
                {operators.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={String(condition.value)}
                onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                placeholder="Value"
                className="condition-value"
              />

              {conditions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(index)}
                  className="btn-remove-condition"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddCondition}
            className="btn-add-condition"
          >
            + Add Condition
          </button>
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

