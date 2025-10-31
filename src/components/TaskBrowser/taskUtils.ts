/**
 * タスクのソート・フィルタユーティリティ
 */

import type { Task, TagConfig } from '../../types/task';
import type { TaskFilter, SortCriteria } from './TaskFilter';

/**
 * タスクをソート
 */
export function sortTasks(tasks: Task[], criteria: SortCriteria, _tagConfigs: Record<string, TagConfig>): Task[] {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    switch (criteria) {
      case 'name-asc':
        return a.id.localeCompare(b.id);
      
      case 'name-desc':
        return b.id.localeCompare(a.id);
      
      case 'modified-asc':
        return new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
      
      case 'modified-desc':
        return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
      
      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * タスクをフィルタリング
 */
export function filterTasks(tasks: Task[], filter: TaskFilter, _tagConfigs: Record<string, TagConfig>): Task[] {
  return tasks.filter((task) => {
    // タグ条件によるフィルタ
    if (filter.tagConditions.length > 0) {
      for (const condition of filter.tagConditions) {
        const tagValue = task.frontMatter[condition.category];
        if (tagValue === undefined) return false;
        
        const tagStr = String(tagValue);
        if (!tagStr.includes(condition.value)) {
          return false;
        }
      }
    }

    return true;
  });
}


