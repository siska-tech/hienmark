/**
 * タスク一覧を表示するコンポーネント
 */

import { useState, useEffect } from 'react';
import type { Task, TagConfig, CustomFilter, CustomSort } from '../../types/task';
import { TaskFilterPanel, type TaskFilter, type SortCriteria } from './TaskFilter';
import { sortTasks, filterTasks } from './taskUtils';
import { evaluateFilterExpression } from './filterEvaluator';
import { FilterSortService } from '../../services/filterSortService';
import { WorkspaceConfigService } from '../../services/workspaceConfigService';
import { useLanguage } from '../../contexts/LanguageContext';
import { TaskItemMenu } from './TaskItemMenu';
import './TaskBrowser.css';
import { HoverCard } from '../ui/HoverCard';
import './TaskItemMenu.css';

type ViewMode = 'title-tags' | 'title-tags-preview' | 'compact';

interface TaskBrowserProps {
  tasks: Record<string, Task>;
  onTaskSelect: (taskId: string) => void;
  onTaskCreate: () => void;
  onTaskDelete: (taskId: string) => void;
  onTaskRename?: (oldTaskId: string, newTaskId: string) => Promise<void>;
  workspacePath?: string;
  tagConfigs?: Record<string, TagConfig>;
  selectedTaskId?: string;
}

export function TaskBrowser({
  tasks,
  onTaskSelect,
  onTaskCreate,
  onTaskDelete,
  onTaskRename,
  workspacePath,
  tagConfigs = {},
  selectedTaskId,
}: TaskBrowserProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('title-tags-preview');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('modified-desc');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({
    dateRange: null,
    tagConditions: [],
  });
  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [activeCustomFilter, setActiveCustomFilter] = useState<string | null>(null);
  const [activeCustomSort, setActiveCustomSort] = useState<string | null>(null);
  const [customFilterDef, setCustomFilterDef] = useState<CustomFilter | null>(null);
  const [customSortDef, setCustomSortDef] = useState<CustomSort | null>(null);

  // デフォルトソートを読み込む
  useEffect(() => {
    const loadDefaultSort = async () => {
      if (!workspacePath) return;
      
      try {
        const config = await WorkspaceConfigService.getConfig(workspacePath);
        if (config.defaultSortOrder) {
          // カスタムソートかどうかをチェック
          if (config.defaultSortOrder.startsWith('custom:')) {
            const sortName = config.defaultSortOrder.replace('custom:', '');
            setActiveCustomSort(sortName);
          } else {
            setSortCriteria(config.defaultSortOrder as SortCriteria);
          }
        }
      } catch (error) {
        console.error('Failed to load default sort:', error);
      }
    };

    loadDefaultSort();
  }, [workspacePath]);

  // カスタムフィルター/ソート定義を読み込む
  useEffect(() => {
    const loadCustomDefinitions = async () => {
      if (!workspacePath) return;
      
      try {
        const data = await FilterSortService.getFiltersAndSorts(workspacePath);
        
        if (activeCustomFilter) {
          const filter = data.filters.find((f) => f.name === activeCustomFilter);
          setCustomFilterDef(filter || null);
        } else {
          setCustomFilterDef(null);
        }
        
        if (activeCustomSort) {
          const sort = data.sorts.find((s) => s.name === activeCustomSort);
          setCustomSortDef(sort || null);
        } else {
          setCustomSortDef(null);
        }
      } catch (error) {
        console.error('Failed to load custom definitions:', error);
      }
    };

    loadCustomDefinitions();
  }, [workspacePath, activeCustomFilter, activeCustomSort]);

  // カスタムフィルターを適用
  const applyCustomFilter = (tasks: Task[], filterDef: CustomFilter, tagConfigs: Record<string, TagConfig>): Task[] => {
    // フィルター定義が不正な場合は全タスクを返す
    if (!filterDef || !filterDef.expression) {
      console.warn('Invalid filter definition:', filterDef);
      return tasks;
    }

    try {
      return evaluateFilterExpression(tasks, filterDef.expression, tagConfigs);
    } catch (error) {
      console.error('Error applying custom filter:', error);
      return tasks; // エラー時は全タスクを返す
    }
  };

  // 日付値を解析
  const parseDateValue = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime()) ? date : null;
    }
    return null;
  };

  // カスタムソートを適用
  const applyCustomSort = (tasks: Task[], sortDef: CustomSort): Task[] => {
    if (!sortDef || !sortDef.sortKeys || sortDef.sortKeys.length === 0) {
      return tasks;
    }

    try {
      const sorted = [...tasks];

      sorted.sort((a, b) => {
        for (const sortKey of sortDef.sortKeys) {
          const { tagKey, order } = sortKey;
          const aValue = a.frontMatter[tagKey];
          const bValue = b.frontMatter[tagKey];

          // 値の比較
          let comparison = 0;

          // 値が存在しない場合の処理
          if (aValue === undefined && bValue === undefined) {
            comparison = 0;
          } else if (aValue === undefined) {
            comparison = 1; // undefined は後ろに
          } else if (bValue === undefined) {
            comparison = -1; // undefined は後ろに
          } else {
            // カスタム順序が定義されている場合
            if (sortKey.customOrder && sortKey.customOrder.length > 0) {
              const indexA = sortKey.customOrder.indexOf(String(aValue));
              const indexB = sortKey.customOrder.indexOf(String(bValue));

              // 両方がカスタム順序に存在する場合
              if (indexA !== -1 && indexB !== -1) {
                comparison = indexA - indexB;
              } else if (indexA !== -1) {
                // aのみ存在 → aを前に
                comparison = -1;
              } else if (indexB !== -1) {
                // bのみ存在 → bを前に
                comparison = 1;
              } else {
                // 両方とも存在しない → 辞書順
                comparison = String(aValue).localeCompare(String(bValue));
              }
            } else {
              // カスタム順序がない場合は、タグ設定を取得
              const tagConfig = tagConfigs[tagKey];

              if (tagConfig?.tagType === 'Number') {
                // 数値型の場合
                const numA = typeof aValue === 'number' ? aValue : parseFloat(String(aValue));
                const numB = typeof bValue === 'number' ? bValue : parseFloat(String(bValue));
                comparison = numA - numB;
              } else if (tagConfig?.tagType === 'Date') {
                // 日付型の場合
                const dateA = parseDateValue(aValue);
                const dateB = parseDateValue(bValue);
                if (dateA && dateB) {
                  comparison = dateA.getTime() - dateB.getTime();
                } else if (dateA) {
                  comparison = -1;
                } else if (dateB) {
                  comparison = 1;
                }
              } else {
                // 文字列型の場合
                comparison = String(aValue).localeCompare(String(bValue));
              }
            }
          }

          // ソート順を適用
          if (comparison !== 0) {
            return order === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });

      return sorted;
    } catch (error) {
      console.error('Error applying custom sort:', error);
      return tasks;
    }
  };

  // タスクリストを配列に変換
  const taskList = Object.values(tasks);

  // ソート（カスタムソートが有効な場合）
  let sortedTasks = taskList;
  if (customSortDef) {
    // カスタムソートを適用
    sortedTasks = applyCustomSort(taskList, customSortDef);
  } else {
    // 標準ソートを適用
    sortedTasks = sortTasks(taskList, sortCriteria, tagConfigs);
  }

  // フィルタ（カスタムフィルターが有効な場合）
  let filteredTasks = sortedTasks;
  if (customFilterDef) {
    // カスタムフィルターを適用
    filteredTasks = applyCustomFilter(sortedTasks, customFilterDef, tagConfigs);
  } else {
    // 標準フィルターを適用
    filteredTasks = filterTasks(sortedTasks, taskFilter, tagConfigs);
  }

  // 検索フィルタリング
  const searchFilteredTasks = filteredTasks.filter((task) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.id.toLowerCase().includes(query) ||
      task.content.toLowerCase().includes(query) ||
      Object.values(task.frontMatter).some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  });

  // 削除確認（3点メニューから呼び出される）
  const handleDeleteClick = (taskId: string) => {
    setDeleteConfirmId(taskId);
  };

  // 削除実行
  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onTaskDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // 削除キャンセル
  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // リネーム開始（3点メニューまたはダブルクリックから呼び出される）
  const handleStartRename = (taskId: string) => {
    setRenamingTaskId(taskId);
    setRenameInput(taskId);
  };

  // リネーム保存
  const handleSaveRename = async (oldTaskId: string, e: React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const newTaskId = renameInput.trim();
    
    if (!newTaskId || newTaskId === oldTaskId) {
      setRenamingTaskId(null);
      return;
    }

    // ファイル名として有効かチェック
    if (!/^[a-zA-Z0-9_-]+$/.test(newTaskId)) {
      alert('Task ID can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    // 重複チェック
    if (tasks[newTaskId]) {
      alert(`Task ID "${newTaskId}" already exists`);
      return;
    }

    try {
      if (!onTaskRename) {
        alert('Task rename is not available');
        return;
      }
      
      await onTaskRename(oldTaskId, newTaskId);
      setRenamingTaskId(null);
    } catch (error) {
      console.error('Failed to rename task:', error);
      alert(`Failed to rename task: ${error}`);
    }
  };

  // リネームキャンセル
  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingTaskId(null);
    setRenameInput('');
  };

  return (
    <div className="task-browser">
      <div className="task-browser-header">
        <h2>{t.taskBrowser.title}</h2>
        <div className="header-actions">
          <div className="view-mode-group" title={t.taskBrowser.viewMode}>
            <button
              className={`view-mode-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              aria-label={t.taskBrowser.viewModeCompact}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7"></line>
                <line x1="4" y1="12" x2="16" y2="12"></line>
                <line x1="4" y1="17" x2="20" y2="17"></line>
              </svg>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'title-tags' ? 'active' : ''}`}
              onClick={() => setViewMode('title-tags')}
              aria-label={t.taskBrowser.viewModeTitleTags}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7"></line>
                <rect x="4" y="11" width="5" height="3" rx="1"></rect>
                <rect x="10" y="11" width="5" height="3" rx="1"></rect>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </svg>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'title-tags-preview' ? 'active' : ''}`}
              onClick={() => setViewMode('title-tags-preview')}
              aria-label={t.taskBrowser.viewModeTitleTagsPreview}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <rect x="4" y="9" width="5" height="3" rx="1"></rect>
                <line x1="4" y1="14" x2="18" y2="14"></line>
                <line x1="4" y1="17" x2="16" y2="17"></line>
              </svg>
            </button>
          </div>
          <button className="btn-create" onClick={onTaskCreate} title={t.taskBrowser.newTask}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {showFilterPanel && (
        <TaskFilterPanel
          tasks={taskList}
          filter={taskFilter}
          onFilterChange={setTaskFilter}
          sortCriteria={sortCriteria}
          onSortChange={setSortCriteria}
          activeCustomFilter={activeCustomFilter}
          onCustomFilterChange={setActiveCustomFilter}
          activeCustomSort={activeCustomSort}
          onCustomSortChange={setActiveCustomSort}
          workspacePath={workspacePath}
        />
      )}

      <div className="task-browser-search">
        <div className="search-container">
          <input
            type="text"
            placeholder={t.taskBrowser.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button
            className={`btn-filter-inline ${showFilterPanel ? 'active' : ''}`}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            title={t.taskBrowser.filterPanel}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <div className="task-browser-list">
        {searchFilteredTasks.length === 0 ? (
          <div className="task-browser-empty">
            <p>{t.taskBrowser.noTasks}</p>
            {searchQuery && <p className="hint">Try different search terms</p>}
          </div>
        ) : (
          <>
            {/* VirtualListの代わりに .map() を使用 */}
            {searchFilteredTasks.map((task) => {
              if (!task) return null;
              
              const isSelected = selectedTaskId === task.id;
              const isRenaming = renamingTaskId === task.id;
              
              // renderTaskItem の中身をここに展開
              return (
                <div key={task.id} className="virtual-row"> {/* style={style} を削除し、key={task.id} を追加 */}
                  <div
                    className={`task-item ${isSelected ? 'selected' : ''} ${viewMode === 'compact' ? 'compact' : ''}`}
                    onClick={() => onTaskSelect(task.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onTaskRename && renamingTaskId !== task.id) {
                        handleStartRename(task.id);
                      }
                    }}
                  >
                    <div className="task-item-header">
                      {isRenaming ? (
                        <form
                          onSubmit={(e) => handleSaveRename(task.id, e)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onBlur={(e) => {
                              const mouseEvent = e as unknown as React.MouseEvent;
                              mouseEvent.stopPropagation();
                              handleCancelRename(mouseEvent);
                            }}
                            autoFocus
                            className="rename-input"
                          />
                          <div className="rename-actions">
                            <button
                              type="submit"
                              className="btn-confirm-rename"
                              onClick={(e) => e.stopPropagation()}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="btn-cancel-rename"
                              onClick={(e) => handleCancelRename(e)}
                            >
                              ×
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <h3 className="task-item-title">
                            <span className="task-item-icon">📝</span>
                            <span className="task-item-title-text">{task.id}</span>
                          </h3>
                          <div className="task-item-actions">
                            <span className="task-item-date">
                              {new Date(task.modifiedAt).toLocaleDateString()}
                            </span>
                            <TaskItemMenu
                              onRename={() => handleStartRename(task.id)}
                              onDelete={() => handleDeleteClick(task.id)}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Front Matterのタグを表示 */}
                    {(viewMode === 'title-tags' || viewMode === 'title-tags-preview') && 
                      Object.keys(task.frontMatter).length > 0 && (
                      <div className="task-item-tags">
                        {Object.entries(task.frontMatter)
                          .slice(0, 3)
                          .map(([key, value]) => {
                            const tagValue = String(value);
                            
                            // ★★★ 修正点 ★★★
                            // isPriority と isDate の判定を削除し、className をシンプルにします
                            // const isPriority = key.toLowerCase().includes('priority');
                            // const isDate = key.toLowerCase().includes('date') || key.toLowerCase().includes('due');
                            
                            return (
                              <span 
                                key={key} 
                                // className={`task-tag ${isPriority ? 'tag-priority' : ''} ${isDate ? 'tag-date' : ''}`}
                                className={`task-tag`} // <-- 強調表示クラスを削除
                                data-key={key}
                                data-value={tagValue}
                              >
                                <span className="task-tag-key">{key}:</span>
                                <span className="task-tag-value">{tagValue}</span>
                              </span>
                            );
                          })}
                        {Object.keys(task.frontMatter).length > 3 && (() => {
                          const allEntries = Object.entries(task.frontMatter);
                          const hidden = allEntries.slice(3);
                          return (
                            <HoverCard
                              content={
                                <div>
                                  <h4 className="hovercard-title">{task.id}</h4>
                                  <div className="hovercard-tags">
                                    {hidden.map(([k, v]) => (
                                      <span key={k} className="tag-chip">{k}: {String(v)}</span>
                                    ))}
                                  </div>
                                </div>
                              }
                            >
                              <span className="task-tag-more">+{hidden.length} more</span>
                            </HoverCard>
                          );
                        })()}
                      </div>
                    )}

                    {/* コンテンツのプレビュー */}
                    {viewMode === 'title-tags-preview' && (
                      <p className="task-item-preview">
                        {task.content.substring(0, 100)}
                        {task.content.length > 100 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="task-browser-footer">
        <span className="task-count">
          {searchFilteredTasks.length} {t.taskBrowser.tasks}
        </span>
      </div>

      {/* 削除確認ダイアログ */}
      {deleteConfirmId && (
        <div className="delete-confirm-overlay" onClick={handleCancelDelete}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{t.common.delete}</h3>
            <p>
              {t.taskBrowser.deleteConfirm}
            </p>
            <p>
              <strong>{deleteConfirmId}</strong>
            </p>
            <p className="delete-warning">This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button className="btn-cancel-delete" onClick={handleCancelDelete}>
                {t.common.cancel}
              </button>
              <button className="btn-confirm-delete" onClick={handleConfirmDelete}>
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
