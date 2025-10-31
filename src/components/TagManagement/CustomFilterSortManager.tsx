/**
 * カスタムフィルター/ソート管理コンポーネント
 */

import { useState, useEffect } from 'react';
import type { CustomFilter, CustomSort, TagIndex } from '../../types/task';
import { FilterSortService } from '../../services/filterSortService';
import { CustomFilterEditor } from './CustomFilterEditor';
import { CustomSortEditor } from './CustomSortEditor';
import { useLanguage } from '../../contexts/LanguageContext';
import './CustomFilterSortManager.css';

interface CustomFilterSortManagerProps {
  workspacePath: string | null;
  tagIndex: TagIndex | null;
  onClose: () => void;
}

export function CustomFilterSortManager({ workspacePath, tagIndex, onClose }: CustomFilterSortManagerProps) {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<CustomFilter[]>([]);
  const [sorts, setSorts] = useState<CustomSort[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'filters' | 'sorts'>('filters');
  const [showFilterEditor, setShowFilterEditor] = useState(false);
  const [showSortEditor, setShowSortEditor] = useState(false);
  const [editingFilter, setEditingFilter] = useState<CustomFilter | undefined>(undefined);
  const [editingSort, setEditingSort] = useState<CustomSort | undefined>(undefined);

  const handleSaveFilter = async (filter: CustomFilter) => {
    if (!workspacePath) return;

    try {
      if (editingFilter) {
        await FilterSortService.updateCustomFilter(workspacePath, editingFilter.name, filter);
      } else {
        await FilterSortService.addCustomFilter(workspacePath, filter);
      }
      await loadFiltersAndSorts();
      setShowFilterEditor(false);
      setEditingFilter(undefined);
      alert(t.customFilterSort.filterSavedSuccess);
    } catch (error) {
      console.error('Failed to save filter:', error);
      alert(`${t.customFilterSort.filterSaveFailed}: ${error}`);
    }
  };

  const handleDeleteFilter = async (filterName: string) => {
    if (!workspacePath) return;
    if (!confirm(t.customFilterSort.filterDeleteConfirm.replace('{filterName}', filterName))) return;

    try {
      await FilterSortService.deleteCustomFilter(workspacePath, filterName);
      await loadFiltersAndSorts();
    } catch (error) {
      console.error('Failed to delete filter:', error);
      alert(`${t.customFilterSort.filterDeleteFailed}: ${error}`);
    }
  };

  const handleSaveSort = async (sort: CustomSort) => {
    if (!workspacePath) return;

    try {
      if (editingSort) {
        await FilterSortService.updateCustomSort(workspacePath, editingSort.name, sort);
      } else {
        await FilterSortService.addCustomSort(workspacePath, sort);
      }
      await loadFiltersAndSorts();
      setShowSortEditor(false);
      setEditingSort(undefined);
      alert(t.customFilterSort.sortSavedSuccess);
    } catch (error) {
      console.error('Failed to save sort:', error);
      alert(`${t.customFilterSort.sortSaveFailed}: ${error}`);
    }
  };

  const handleDeleteSort = async (sortName: string) => {
    if (!workspacePath) return;
    if (!confirm(t.customFilterSort.sortDeleteConfirm.replace('{sortName}', sortName))) return;

    try {
      await FilterSortService.deleteCustomSort(workspacePath, sortName);
      await loadFiltersAndSorts();
    } catch (error) {
      console.error('Failed to delete sort:', error);
      alert(`${t.customFilterSort.sortDeleteFailed}: ${error}`);
    }
  };

  const loadFiltersAndSorts = async () => {
    if (!workspacePath) return;

    setLoading(true);
    try {
      const data = await FilterSortService.getFiltersAndSorts(workspacePath);
      setFilters(data.filters);
      setSorts(data.sorts);
    } catch (error) {
      console.error('Failed to load filters and sorts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiltersAndSorts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacePath]);

  if (loading) {
    return (
      <div className="filter-sort-manager">
        <div className="filter-sort-header">
          <h2>{t.customFilterSort.title}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="filter-sort-content">
          <p>{t.customFilterSort.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="filter-sort-manager">
      <div className="filter-sort-header">
        <h2>{t.customFilterSort.title}</h2>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="filter-sort-tabs">
        <button
          className={`tab-button ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => !showFilterEditor && !showSortEditor && setActiveTab('filters')}
          disabled={showFilterEditor || showSortEditor}
        >
          {t.customFilterSort.filters}
        </button>
        <button
          className={`tab-button ${activeTab === 'sorts' ? 'active' : ''}`}
          onClick={() => !showFilterEditor && !showSortEditor && setActiveTab('sorts')}
          disabled={showFilterEditor || showSortEditor}
        >
          {t.customFilterSort.sorts}
        </button>
      </div>

      <div className="filter-sort-content">
        {showFilterEditor ? (
          <CustomFilterEditor
            filter={editingFilter}
            onSave={handleSaveFilter}
            onCancel={() => {
              setShowFilterEditor(false);
              setEditingFilter(undefined);
            }}
            availableTags={tagIndex ? Object.keys(tagIndex.categories) : []}
          />
        ) : showSortEditor ? (
          <CustomSortEditor
            sort={editingSort}
            onSave={handleSaveSort}
            onCancel={() => {
              setShowSortEditor(false);
              setEditingSort(undefined);
            }}
            availableTags={tagIndex ? Object.keys(tagIndex.categories) : []}
          />
        ) : (
          <>
            {activeTab === 'filters' ? (
              <div className="filters-section">
                <div className="section-header">
                  <h3>{t.customFilterSort.customFilters}</h3>
                  <button 
                    className="btn-create" 
                    onClick={() => setShowFilterEditor(true)}
                    title={t.customFilterSort.newFilter}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>

                {filters.length === 0 ? (
                  <p className="empty-message">{t.customFilterSort.noCustomFiltersDefined}</p>
                ) : (
                  <div className="items-list">
                    {filters.map((filter) => (
                      <div key={filter.name} className="filter-item">
                        <div className="filter-info">
                          <strong>{filter.name}</strong>
                          {filter.description && <span className="filter-desc">{filter.description}</span>}
                        </div>
                        <div className="filter-actions">
                          <button
                            className="btn-edit"
                            onClick={() => {
                              setEditingFilter(filter);
                              setShowFilterEditor(true);
                            }}
                          >
                            {t.common.edit}
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteFilter(filter.name)}
                          >
                            {t.common.delete}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="sorts-section">
                <div className="section-header">
                  <h3>{t.customFilterSort.customSorts}</h3>
                  <button 
                    className="btn-create" 
                    onClick={() => setShowSortEditor(true)}
                    title={t.customFilterSort.newSort}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>

                {sorts.length === 0 ? (
                  <p className="empty-message">{t.customFilterSort.noCustomSortsDefined}</p>
                ) : (
                  <div className="items-list">
                    {sorts.map((sort) => (
                      <div key={sort.name} className="sort-item">
                        <div className="sort-info">
                          <strong>{sort.name}</strong>
                          {sort.description && <span className="sort-desc">{sort.description}</span>}
                        </div>
                        <div className="sort-actions">
                          <button
                            className="btn-edit"
                            onClick={() => {
                              setEditingSort(sort);
                              setShowSortEditor(true);
                            }}
                          >
                            {t.common.edit}
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteSort(sort.name)}
                          >
                            {t.common.delete}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

