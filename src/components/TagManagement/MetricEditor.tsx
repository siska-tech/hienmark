/**
 * メトリック編集コンポーネント
 * メトリックの作成・編集フォーム
 */

import { useState, useEffect } from 'react';
import type { Metric, MetricCalculationType, TagSchema, FilterCondition, FilterExpression } from '../../types/task';
import './MetricEditor.css';

interface MetricEditorProps {
  metric?: Metric | null;
  tagSchema?: TagSchema | null;
  onSave: (metric: Metric) => void;
  onCancel: () => void;
  t: {
    metricManagement: {
      newMetricTitle?: string;
      editMetricTitle?: string;
      metricName?: string;
      metricNamePlaceholder?: string;
      calculationType?: string;
      calculationTypeCount?: string;
      calculationTypeSum?: string;
      calculationTypeAverage?: string;
      sourceTag?: string;
      sourceTagPlaceholder?: string;
      save?: string;
      cancel?: string;
      required?: string;
      noNumericTags?: string;
      applyFilter?: string;
      filterConditionsAllRequired?: string;
      selectTag?: string;
      value?: string;
      removeCondition?: string;
      addCondition?: string;
    };
  };
}

export function MetricEditor({ metric, tagSchema, onSave, onCancel, t }: MetricEditorProps) {
  const isNew = !metric;
  const [name, setName] = useState(metric?.name || '');
  const [calculationType, setCalculationType] = useState<MetricCalculationType>(
    metric?.calculationType || 'count'
  );
  const [sourceTag, setSourceTag] = useState(metric?.sourceTag || '');
  const [hasFilter, setHasFilter] = useState(!!metric?.filterExpression);
  const [conditions, setConditions] = useState<FilterCondition[]>(
    metric?.filterExpression?.condition
      ? [metric.filterExpression.condition]
      : metric?.filterExpression?.expressions
      ? metric.filterExpression.expressions.map((expr) => expr.condition!).filter(Boolean)
      : [{ tagKey: '', operator: '==', value: '' }]
  );

  // 利用可能なタグ（Number または Currency 型のみ） - 計算対象タグ用
  const availableTags = tagSchema
    ? Object.entries(tagSchema)
        .filter(([_, attr]) => {
          return attr.type === 'Number' || attr.type === 'Currency';
        })
        .map(([tagKey]) => tagKey)
    : [];

  // フィルタ用の利用可能なタグ（すべてのタグ）
  const availableFilterTags = tagSchema ? Object.keys(tagSchema) : [];

  const operators = [
    { value: '==', label: '等しい (==)' },
    { value: '!=', label: '等しくない (!=)' },
    { value: '>', label: 'より大きい (>)' },
    { value: '<', label: 'より小さい (<)' },
    { value: '>=', label: '以上 (>=)' },
    { value: '<=', label: '以下 (<=)' },
    { value: 'contains', label: '含む (contains)' },
    { value: 'starts_with', label: 'で始まる (starts_with)' },
    { value: 'ends_with', label: 'で終わる (ends_with)' },
    { value: 'regex', label: '正規表現 (regex)' },
  ];

  useEffect(() => {
    // 計算方法が変更されたら、sourceTag をリセット（Countの場合はsourceTagは不要だが、フィルタは使える）
    if (calculationType === 'count') {
      setSourceTag('');
    } else if ((calculationType === 'sum' || calculationType === 'average') && availableTags.length > 0 && !sourceTag) {
      // 利用可能な最初のタグを選択
      setSourceTag(availableTags[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationType, availableTags]);

  const handleAddCondition = () => {
    setConditions([...conditions, { tagKey: '', operator: '==', value: '' }]);
    setHasFilter(true);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
    if (newConditions.length === 0) {
      setHasFilter(false);
    }
  };

  const handleConditionChange = (index: number, field: keyof FilterCondition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert(`${t.metricManagement.metricName || 'メトリック名'}${t.metricManagement.required || 'は必須です'}`);
      return;
    }

    if ((calculationType === 'sum' || calculationType === 'average') && !sourceTag) {
      alert(`${t.metricManagement.sourceTag || '対象タグ'}${t.metricManagement.required || 'は必須です'}`);
      return;
    }

    // フィルタ条件の構築
    let filterExpression: FilterExpression | undefined = undefined;
    if (hasFilter && conditions.length > 0) {
      const validConditions = conditions.filter((c) => c.tagKey && c.value !== '');
      if (validConditions.length > 0) {
        filterExpression = {
          condition: validConditions.length === 1 ? validConditions[0] : undefined,
          expressions: validConditions.length > 1 ? validConditions.map((c) => ({ condition: c })) : undefined,
          logicalOperator: validConditions.length > 1 ? 'AND' : undefined,
        };
      }
    }

    const newMetric: Metric = {
      id: metric?.id || `metric_${Date.now()}`,
      name: name.trim(),
      calculationType,
      sourceTag: calculationType === 'count' ? undefined : sourceTag,
      filterExpression,
      isDefault: metric?.isDefault || false,
    };

    onSave(newMetric);
  };

  return (
    <div className="metric-editor">
      <h4>{isNew ? (t.metricManagement.newMetricTitle || '新しいメトリックを定義') : (t.metricManagement.editMetricTitle || 'メトリックを編集')}</h4>
      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="metricName">
            {t.metricManagement.metricName || 'メトリック名'} <span className="required">*</span>
          </label>
          <input
            id="metricName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.metricManagement.metricNamePlaceholder || '例: コスト合計'}
            className="input-text"
          />
        </div>

        <div className="field-group">
          <label htmlFor="calculationType">
            {t.metricManagement.calculationType || '計算方法'} <span className="required">*</span>
          </label>
          <select
            id="calculationType"
            value={calculationType}
            onChange={(e) => setCalculationType(e.target.value as MetricCalculationType)}
            className="select-field"
          >
            <option value="count">
              {t.metricManagement.calculationTypeCount || 'タスク数をカウント (Count)'}
            </option>
            <option value="sum">
              {t.metricManagement.calculationTypeSum || 'タグの合計 (Sum of Tag)'}
            </option>
            <option value="average">
              {t.metricManagement.calculationTypeAverage || 'タグの平均 (Average of Tag)'}
            </option>
          </select>
        </div>

        {(calculationType === 'sum' || calculationType === 'average') && (
          <div className="field-group">
            <label htmlFor="sourceTag">
              {t.metricManagement.sourceTag || '対象タグ'} <span className="required">*</span>
            </label>
            {availableTags.length > 0 ? (
              <select
                id="sourceTag"
                value={sourceTag}
                onChange={(e) => setSourceTag(e.target.value)}
                className="select-field"
              >
                <option value="">{t.metricManagement.sourceTagPlaceholder || 'タグを選択'}</option>
                {availableTags.map((tagKey) => (
                  <option key={tagKey} value={tagKey}>
                    {tagKey}
                  </option>
                ))}
              </select>
            ) : (
              <div className="field-hint">
                {t.metricManagement.noNumericTags}
              </div>
            )}
          </div>
        )}

        {/* フィルタ設定セクション */}
        <div className="field-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              id="useFilter"
              checked={hasFilter}
              onChange={(e) => {
                setHasFilter(e.target.checked);
                if (!e.target.checked) {
                  setConditions([{ tagKey: '', operator: '==', value: '' }]);
                }
              }}
            />
            <label htmlFor="useFilter" style={{ margin: 0, cursor: 'pointer' }}>
              {t.metricManagement.applyFilter}
            </label>
          </div>

          {hasFilter && (
            <div className="conditions-section">
              <h4>{t.metricManagement.filterConditionsAllRequired}</h4>
              {conditions.map((condition, index) => (
                <div key={index} className="condition-row">
                  <select
                    value={condition.tagKey}
                    onChange={(e) => handleConditionChange(index, 'tagKey', e.target.value)}
                    className="condition-tag-select"
                  >
                    <option value="">{t.metricManagement.selectTag}</option>
                    {availableFilterTags.map((tag) => (
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
                    placeholder={t.metricManagement.value}
                    className="condition-value"
                  />

                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(index)}
                      className="btn-remove-condition"
                      title={t.metricManagement.removeCondition}
                    >
                      {t.metricManagement.removeCondition}
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddCondition}
                className="btn-add-condition"
              >
                + {t.metricManagement.addCondition}
              </button>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn-save"
            title={t.metricManagement.save || '保存'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <button 
            type="button" 
            className="btn-cancel" 
            onClick={onCancel}
            title={t.metricManagement.cancel || 'キャンセル'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

