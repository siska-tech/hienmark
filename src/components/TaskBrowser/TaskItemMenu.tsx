/**
 * タスクアイテムの3点メニューコンポーネント
 * ReactDOM.createPortal を使用してメニューを body 直下にレンダリングし、
 * 仮想スクロールのクリッピング問題を解決
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './TaskItemMenu.css';

interface TaskItemMenuProps {
  onRename: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export function TaskItemMenu({ onRename, onDelete, onDuplicate }: TaskItemMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isOpen &&
        triggerRef.current &&
        menuRef.current &&
        !triggerRef.current.contains(target) &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setPosition(null);
      }
    };

    if (isOpen) {
      // 少し遅延させて現在のクリックイベントが完了してからリスナーを追加
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      // トリガーボタンの位置を取得してメニューの位置を計算
      const rect = triggerRef.current.getBoundingClientRect();
      // メニューをトリガーの右下に配置（右端からはみ出さないように調整）
      const menuWidth = 150; // メニューの最小幅に合わせて調整
      const menuTop = rect.bottom + 4;
      const menuLeft = Math.min(rect.right - menuWidth, rect.left);
      
      setPosition({ top: menuTop, left: menuLeft });
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setPosition(null);
    }
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    setPosition(null);
  };

  return (
    <>
      <button
        ref={triggerRef}
        className="task-item-menu-trigger"
        onClick={handleMenuClick}
        title="More options"
        aria-label="More options"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>
      {isOpen && position && createPortal(
        <div 
          ref={menuRef}
          className="task-item-menu-dropdown"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          <button
            className="task-item-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(onRename);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Rename</span>
          </button>
          {onDuplicate && (
            <button
              className="task-item-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(onDuplicate);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Duplicate</span>
            </button>
          )}
          <button
            className="task-item-menu-item task-item-menu-item-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(onDelete);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
