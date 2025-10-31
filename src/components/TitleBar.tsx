import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './TitleBar.css';

interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title = 'HienMark' }) => {
  const handleMinimize = async () => {
    try {
        const appWindow = getCurrentWindow(); // 👈 まずウィンドウオブジェクトを取得
        await appWindow.minimize();           // 👈 そのオブジェクトのメソッドを呼び出す
    } catch (error) {
      console.error('Minimize error:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (error) {
      console.error('Maximize error:', error);
    }
  };

  const handleClose = async () => {
    try {
        const appWindow = getCurrentWindow();
        await appWindow.close();
    } catch (error) {
      console.error('Close error:', error);
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-title" data-tauri-drag-region>
        {title}
      </div>
      <div className="titlebar-buttons">
        <button className="titlebar-button" onClick={handleMinimize}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect width="10" height="1" x="1" y="5" fill="currentColor"/>
          </svg>
        </button>
        <button className="titlebar-button" onClick={handleMaximize}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect width="9" height="9" x="1.5" y="1.5" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
        <button className="titlebar-button titlebar-button-close" onClick={handleClose}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

