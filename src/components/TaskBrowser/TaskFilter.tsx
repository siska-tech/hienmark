/**
 * タスクフィルタコンポーネント
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Task, CustomFilter, CustomSort } from '../../types/task';
import { FilterSortService } from '../../services/filterSortService';
import './TaskFilter.css';

export type SortCriteria =
  | 'name-asc'
  | 'name-desc'
  | 'modified-asc'
  | 'modified-desc';

export interface TaskFilter {
  dateRange: { start: string; end: string } | null;
  tagConditions: Array<{ category: string; value: string }>;
}

interface TaskFilterProps {
  tasks: Task[];
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  sortCriteria: SortCriteria;
  onSortChange: (criteria: SortCriteria) => void;
  activeCustomFilter?: string | null;
  onCustomFilterChange?: (filterName: string | null) => void;
  activeCustomSort?: string | null;
  onCustomSortChange?: (sortName: string | null) => void;
  workspacePath?: string;
}

export function TaskFilterPanel({
  tasks,
  filter,
  onFilterChange,
  sortCriteria,
  onSortChange,
  activeCustomFilter,
  onCustomFilterChange,
  activeCustomSort,
  onCustomSortChange,
  workspacePath,
}: TaskFilterProps) {
  const { t } = useLanguage();
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [customSorts, setCustomSorts] = useState<CustomSort[]>([]);
  const [loadingCustoms, setLoadingCustoms] = useState(false);

  // カスタムフィルター/ソートを読み込む
  useEffect(() => {
    const loadCustoms = async () => {
      if (!workspacePath) return;
      
      setLoadingCustoms(true);
      try {
        const data = await FilterSortService.getFiltersAndSorts(workspacePath);
        setCustomFilters(data.filters);
        setCustomSorts(data.sorts);
      } catch (error) {
        console.error('Failed to load custom filters and sorts:', error);
      } finally {
        setLoadingCustoms(false);
      }
    };

    loadCustoms();
  }, [workspacePath]);

  const handleClearFilters = () => {
    onFilterChange({
      dateRange: null,
      tagConditions: [],
    });
    onCustomFilterChange?.(null);
    onCustomSortChange?.(null);
  };

  const hasActiveFilters = filter.tagConditions.length > 0 || activeCustomFilter || activeCustomSort;

  return (
    <div className="task-filter-panel">
      <div className="filter-header">
        <h3>{t.taskBrowser.filterSort}</h3>
        {hasActiveFilters && (
          <button className="btn-clear-filters" onClick={handleClearFilters}>
            {t.taskBrowser.clearAll}
          </button>
        )}
      </div>

      <div className="filter-section">
        <label className="filter-label">{t.taskBrowser.sortBy}:</label>
        <select
          className="sort-select"
          value={sortCriteria}
          onChange={(e) => onSortChange(e.target.value as SortCriteria)}
        >
          <option value="modified-desc">{t.taskBrowser.modifiedNew}</option>
          <option value="modified-asc">{t.taskBrowser.modifiedOld}</option>
          <option value="name-asc">{t.taskBrowser.nameAsc}</option>
          <option value="name-desc">{t.taskBrowser.nameDesc}</option>
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">{t.taskBrowser.customFilter}:</label>
        <select
          className="filter-select"
          value={activeCustomFilter || ''}
          onChange={(e) => onCustomFilterChange?.(e.target.value || null)}
          disabled={loadingCustoms}
        >
          <option value="">-- {t.taskBrowser.none} --</option>
          {customFilters.map((filter) => (
            <option key={filter.name} value={filter.name}>
              {filter.name} {filter.description ? `(${filter.description})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">{t.taskBrowser.customSort}:</label>
        <select
          className="filter-select"
          value={activeCustomSort || ''}
          onChange={(e) => onCustomSortChange?.(e.target.value || null)}
          disabled={loadingCustoms}
        >
          <option value="">-- {t.taskBrowser.none} --</option>
          {customSorts.map((sort) => (
            <option key={sort.name} value={sort.name}>
              {sort.name} {sort.description ? `(${sort.description})` : ''}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <div className="filter-summary">
          <span className="filter-summary-text">
            {getFilteredTasksCount(tasks, filter)} {t.taskBrowser.tasks}
          </span>
        </div>
      )}
    </div>
  );
}

function getFilteredTasksCount(tasks: Task[], _filter: TaskFilter): number {
  return tasks.length;
}

