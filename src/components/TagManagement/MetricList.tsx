/**
 * メトリックリストコンポーネント
 * 既存メトリックの一覧表示と管理
 */

import type { Metric } from '../../types/task';
import './MetricList.css';

interface MetricListProps {
  metrics: Metric[];
  onEdit: (metricId: string) => void;
  onDelete: (metricId: string) => void;
  onCreateNew: () => void;
  t: {
    metricManagement: {
      defaultMetric?: string;
      taskCount?: string;
      metricType?: string;
      countType?: string;
      sumType?: string;
      averageType?: string;
      edit?: string;
      delete?: string;
      addNew?: string;
      tag?: string;
    };
  };
}

export function MetricList({ metrics, onEdit, onDelete, onCreateNew, t }: MetricListProps) {
  const getCalculationTypeLabel = (type: string): string => {
    switch (type) {
      case 'count':
        return t.metricManagement.countType || 'タスク数をカウント';
      case 'sum':
        return t.metricManagement.sumType || 'タグの合計';
      case 'average':
        return t.metricManagement.averageType || 'タグの平均';
      default:
        return type;
    }
  };

  const getMetricDescription = (metric: Metric): string => {
    if (metric.calculationType === 'count') {
      return t.metricManagement.countType || 'タスク数をカウント';
    } else if (metric.sourceTag) {
      return `${getCalculationTypeLabel(metric.calculationType)}: '${metric.sourceTag}' ${t.metricManagement.tag || 'タグ'}`;
    }
    return getCalculationTypeLabel(metric.calculationType);
  };

  return (
    <div className="metric-list">
      {metrics.map((metric) => (
        <div key={metric.id} className={`metric-item ${metric.isDefault ? 'metric-item-default' : ''}`}>
          <div className="metric-item-content">
            <div className="metric-name">
              {metric.isDefault && (
                <span className="metric-badge">{t.metricManagement.defaultMetric || 'デフォルト'}</span>
              )}
              {metric.name}
            </div>
            <div className="metric-description">
              {t.metricManagement.metricType || 'メトリックタイプ'}: {getMetricDescription(metric)}
            </div>
          </div>
          {!metric.isDefault && (
            <div className="metric-item-actions">
              <button
                className="btn-edit"
                onClick={() => onEdit(metric.id)}
                title={t.metricManagement.edit || '編集'}
              >
                {t.metricManagement.edit || '編集'}
              </button>
              <button
                className="btn-delete"
                onClick={() => onDelete(metric.id)}
                title={t.metricManagement.delete || '削除'}
              >
                {t.metricManagement.delete || '削除'}
              </button>
            </div>
          )}
        </div>
      ))}
      <button className="btn-add-metric" onClick={onCreateNew}>
        ＋ {t.metricManagement.addNew || '新しいメトリックを追加'}
      </button>
    </div>
  );
}

