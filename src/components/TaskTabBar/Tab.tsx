/**
 * Tab.tsx
 * 
 * 個別のタブコンポーネント
 * - タスクのファイル名を表示
 * - 変更済みの場合にインジケータ（●）を表示
 * - クローズボタン（X）を提供
 */

import './Tab.css';

interface TabProps {
  taskId: string;
  isActive: boolean;
  isDirty: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

export function Tab({ taskId, isActive, isDirty, onClick, onClose }: TabProps) {
  return (
    <div
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="tab-label">
        {taskId}.md
        {isDirty && <span className="dirty-indicator">●</span>}
      </span>
      <button
        className="tab-close-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClose(e);
        }}
        title="閉じる"
      >
        ×
      </button>
    </div>
  );
}

