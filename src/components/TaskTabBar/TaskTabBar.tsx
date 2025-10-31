/**
 * TaskTabBar.tsx
 * 
 * タブバーコンポーネント
 * - 開いているタスクのタブを並べて表示
 * - アクティブなタブを強調表示
 * - タブの切り替えとクローズを処理
 */

import { Tab } from './Tab';
import './TaskTabBar.css';

interface TaskTabBarProps {
  openTabs: string[];
  activeTabId: string | null;
  tabStates: Map<string, { isDirty: boolean }>;
  onTabClick: (taskId: string) => void;
  onTabClose: (taskId: string) => void;
}

export function TaskTabBar({ 
  openTabs, 
  activeTabId, 
  tabStates,
  onTabClick, 
  onTabClose 
}: TaskTabBarProps) {
  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div className="task-tab-bar">
      {openTabs.map(taskId => (
        <Tab
          key={taskId}
          taskId={taskId}
          isActive={taskId === activeTabId}
          isDirty={tabStates.get(taskId)?.isDirty ?? false}
          onClick={() => onTabClick(taskId)}
          onClose={() => onTabClose(taskId)}
        />
      ))}
    </div>
  );
}

