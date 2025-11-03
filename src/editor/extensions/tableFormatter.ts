/**
 * テーブルフォーマッタ拡張 (TR-001)
 * 
 * MarkdownテーブルをTR-001に基づいてフォーマットする機能を提供します。
 * キーボードショートカット（Ctrl+Shift+T）でカーソル位置のテーブルをフォーマットします。
 */

import { EditorState } from '@codemirror/state';
import { keymap, Command, ViewPlugin, EditorView } from '@codemirror/view';
import { formatTable } from '../../utils/tableFormatter';

/**
 * カーソル位置の行を含むテーブルの範囲を検出する
 */
function findTableRange(doc: EditorState['doc'], lineNumber: number): { from: number; to: number } | null {
  const totalLines = doc.lines;
  
  if (lineNumber < 0 || lineNumber >= totalLines) {
    return null;
  }
  
  // テーブル行のパターン（| で始まり | で終わる行）
  const isTableRow = (lineText: string) => {
    const trimmed = lineText.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
  };
  
  // セパレーター行のパターン
  const isSeparatorRow = (lineText: string) => {
    const trimmed = lineText.trim();
    return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(trimmed);
  };
  
  // 現在の行を取得
  const currentLineObj = doc.line(lineNumber + 1);
  const currentLineText = currentLineObj.text;
  if (!isTableRow(currentLineText) && !isSeparatorRow(currentLineText)) {
    return null;
  }
  
  // 上方向に検索してテーブルの開始位置を見つける
  let startLine = lineNumber;
  for (let i = lineNumber - 1; i >= 0; i--) {
    const lineObj = doc.line(i + 1);
    const lineText = lineObj.text;
    if (lineText.trim() === '') {
      break; // 空行でテーブルが終わる
    }
    if (isTableRow(lineText) || isSeparatorRow(lineText)) {
      startLine = i;
    } else {
      break; // テーブル行でない行で終わる
    }
  }
  
  // 下方向に検索してテーブルの終了位置を見つける
  let endLine = lineNumber;
  for (let i = lineNumber + 1; i < totalLines; i++) {
    const lineObj = doc.line(i + 1);
    const lineText = lineObj.text;
    if (lineText.trim() === '') {
      break; // 空行でテーブルが終わる
    }
    if (isTableRow(lineText) || isSeparatorRow(lineText)) {
      endLine = i;
    } else {
      break; // テーブル行でない行で終わる
    }
  }
  
  // テーブルが少なくとも2行（ヘッダー+セパレーター、またはデータ行）あることを確認
  if (endLine - startLine < 1) {
    return null;
  }
  
  const startLineObj = doc.line(startLine + 1);
  const endLineObj = doc.line(endLine + 1);
  
  return {
    from: startLineObj.from,
    to: endLineObj.to,
  };
}

/**
 * テーブルフォーマットコマンド
 * カーソル位置を含むテーブルをTR-001に基づいてフォーマットします
 */
export const formatTableCommand: Command = (view) => {
  const { state } = view;
  const selection = state.selection.main;
  const lineNumber = state.doc.lineAt(selection.head).number - 1;
  
  const tableRange = findTableRange(state.doc, lineNumber);
  
  if (!tableRange) {
    // テーブルが見つからない場合は何もしない
    return false;
  }
  
  // テーブル範囲のテキストを取得
  const originalText = state.doc.sliceString(tableRange.from, tableRange.to);
  
  console.log('[TableFormatter] Original text:', originalText);
  console.log('[TableFormatter] Range:', tableRange);
  
  // フォーマット実行
  const formattedText = formatTable(originalText);
  
  console.log('[TableFormatter] Formatted text:', formattedText);
  
  // フォーマット結果が空文字列の場合は何もしない（エラー防止）
  if (!formattedText || formattedText.trim() === '') {
    console.warn('[TableFormatter] Formatted text is empty, skipping update');
    return false;
  }

  // フォーマット結果が元のテキストと異なる場合のみ更新
  if (formattedText !== originalText) {
    // 変更を適用
    const lengthDiff = formattedText.length - originalText.length;
    const newSelectionEnd = tableRange.from + formattedText.length;
    
    view.dispatch({
      changes: {
        from: tableRange.from,
        to: tableRange.to,
        insert: formattedText,
      },
      // カーソル位置を変更後のテーブルの終了位置に設定（テーブルが消えないように）
      selection: {
        anchor: Math.min(newSelectionEnd, selection.anchor <= tableRange.to ? selection.anchor + lengthDiff : selection.anchor),
        head: Math.min(newSelectionEnd, selection.head <= tableRange.to ? selection.head + lengthDiff : selection.head),
      },
    });
    return true;
  }
  
  return false;
};

/**
 * ドキュメント内のすべてのテーブル範囲を見つける
 */
function findAllTables(doc: EditorState['doc']): Array<{ from: number; to: number }> {
  const totalLines = doc.lines;
  const tables: Array<{ from: number; to: number }> = [];
  const processedLines = new Set<number>();
  
  // テーブル行のパターン
  const isTableRow = (lineText: string) => {
    const trimmed = lineText.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
  };
  
  // セパレーター行のパターン
  const isSeparatorRow = (lineText: string) => {
    const trimmed = lineText.trim();
    return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(trimmed);
  };
  
  // 各行をチェック
  for (let i = 0; i < totalLines; i++) {
    // 既に処理済みの行はスキップ
    if (processedLines.has(i)) {
      continue;
    }
    
    const lineObj = doc.line(i + 1);
    const lineText = lineObj.text;
    
    // テーブル行またはセパレーター行でない場合はスキップ
    if (!isTableRow(lineText) && !isSeparatorRow(lineText)) {
      continue;
    }
    
    // この行から始まるテーブルの範囲を見つける
    let startLine = i;
    let endLine = i;
    
    // 上方向に検索（通常は不要だが、念のため）
    for (let j = i - 1; j >= 0; j--) {
      const prevLineObj = doc.line(j + 1);
      const prevLineText = prevLineObj.text;
      if (prevLineText.trim() === '') {
        break;
      }
      if (isTableRow(prevLineText) || isSeparatorRow(prevLineText)) {
        startLine = j;
      } else {
        break;
      }
    }
    
    // 下方向に検索
    for (let j = i + 1; j < totalLines; j++) {
      const nextLineObj = doc.line(j + 1);
      const nextLineText = nextLineObj.text;
      if (nextLineText.trim() === '') {
        break;
      }
      if (isTableRow(nextLineText) || isSeparatorRow(nextLineText)) {
        endLine = j;
      } else {
        break;
      }
    }
    
    // テーブルが少なくとも2行あることを確認
    if (endLine - startLine >= 1) {
      const startLineObj = doc.line(startLine + 1);
      const endLineObj = doc.line(endLine + 1);
      
      tables.push({
        from: startLineObj.from,
        to: endLineObj.to,
      });
      
      // 処理済みの行をマーク
      for (let j = startLine; j <= endLine; j++) {
        processedLines.add(j);
      }
    }
  }
  
  return tables;
}

/**
 * カーソル位置にテーブルがあるかをチェック
 */
function hasTableAtCursor(doc: EditorState['doc'], lineNumber: number): boolean {
  return findTableRange(doc, lineNumber) !== null;
}

/**
 * すべてのテーブルをフォーマットするコマンド
 */
export const formatAllTablesCommand: Command = (view) => {
  const { state } = view;
  const tables = findAllTables(state.doc);
  
  if (tables.length === 0) {
    // テーブルが見つからない場合は何もしない
    return false;
  }
  
  // テーブルを後ろから順に処理（前方から処理すると範囲がずれるため）
  let hasChanges = false;
  const changes: Array<{ from: number; to: number; insert: string }> = [];
  
  for (let i = tables.length - 1; i >= 0; i--) {
    const tableRange = tables[i];
    const originalText = state.doc.sliceString(tableRange.from, tableRange.to);
    const formattedText = formatTable(originalText);
    
    if (formattedText && formattedText.trim() !== '' && formattedText !== originalText) {
      changes.push({
        from: tableRange.from,
        to: tableRange.to,
        insert: formattedText,
      });
      hasChanges = true;
    }
  }
  
  if (hasChanges && changes.length > 0) {
    view.dispatch({
      changes: changes,
      // カーソル位置は維持
      selection: state.selection,
    });
    return true;
  }
  
  return false;
};

/**
 * コンテキストメニュープラグイン
 * 右クリック時にテーブルフォーマットオプションを表示
 */
const contextMenuPlugin = ViewPlugin.fromClass(
  class {
    menu: HTMLElement | null = null;

    constructor(private view: EditorView) {
      // コンテキストメニューのスタイルを定義
      const style = document.createElement('style');
      style.textContent = `
        .cm-table-context-menu {
          position: fixed;
          background: var(--app-bg-secondary, #2d2d2d);
          border: 1px solid var(--app-border, #404040);
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          padding: 4px 0;
          min-width: 200px;
          z-index: 10000;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .cm-table-context-menu-item {
          padding: 8px 16px;
          cursor: pointer;
          color: var(--app-text-main, #e0e0e0);
          user-select: none;
        }
        .cm-table-context-menu-item:hover {
          background: var(--app-bg-tertiary, #3d3d3d);
        }
        .cm-table-context-menu-item:active {
          background: var(--app-accent, #007acc);
        }
        .cm-table-context-menu-separator {
          height: 1px;
          background: var(--app-border, #404040);
          margin: 4px 0;
        }
      `;
      if (!document.head.querySelector('style[data-table-context-menu]')) {
        style.setAttribute('data-table-context-menu', 'true');
        document.head.appendChild(style);
      }
    }

    handleContextMenu(event: MouseEvent) {
      const { state } = this.view;
      const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
      
      if (pos === null) {
        this.hideMenu();
        return;
      }

      // ドキュメント内にテーブルがあるかチェック（カーソル位置に関わらず）
      const allTables = findAllTables(state.doc);
      const lineNumber = state.doc.lineAt(pos).number - 1;
      const hasTable = hasTableAtCursor(state.doc, lineNumber);

      // テーブルが1つもない場合はメニューを表示しない
      if (allTables.length === 0) {
        this.hideMenu();
        return;
      }

      // デフォルトのコンテキストメニューを抑制
      event.preventDefault();
      event.stopPropagation();

      // メニューを表示（カーソル位置にテーブルがある場合のみ「テーブルをフォーマット」を有効にする）
      this.showMenu(event.clientX, event.clientY, hasTable);
    }

    showMenu(x: number, y: number, hasTableAtCursor: boolean = true) {
      this.hideMenu();

      const menu = document.createElement('div');
      menu.className = 'cm-table-context-menu';

      // 「テーブルをフォーマット」はカーソル位置にテーブルがある場合のみ表示
      if (hasTableAtCursor) {
        const formatItem = document.createElement('div');
        formatItem.className = 'cm-table-context-menu-item';
        formatItem.textContent = 'テーブルをフォーマット (Format Table)';
        formatItem.onclick = () => {
          formatTableCommand(this.view);
          this.hideMenu();
        };
        menu.appendChild(formatItem);
      }

      // 「すべてのテーブルをフォーマット」は常に表示（テーブルがある場合のみ有効）
      const formatAllItem = document.createElement('div');
      formatAllItem.className = 'cm-table-context-menu-item';
      formatAllItem.textContent = 'すべてのテーブルをフォーマット (Format All Tables)';
      formatAllItem.onclick = () => {
        formatAllTablesCommand(this.view);
        this.hideMenu();
      };
      menu.appendChild(formatAllItem);

      document.body.appendChild(menu);

      // メニューの位置を調整（画面外に出ないように）
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let finalX = x;
      let finalY = y;

      if (x + rect.width > viewportWidth) {
        finalX = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        finalY = viewportHeight - rect.height - 10;
      }

      menu.style.left = `${finalX}px`;
      menu.style.top = `${finalY}px`;

      this.menu = menu;

      // メニュー外をクリックしたら閉じる
      const handleClickOutside = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          this.hideMenu();
          document.removeEventListener('click', handleClickOutside);
          document.removeEventListener('contextmenu', handleClickOutside);
        }
      };

      // 少し遅延してからイベントリスナーを追加（現在のcontextmenuイベントを無視するため）
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
        document.addEventListener('contextmenu', handleClickOutside, true);
      }, 0);
    }

    hideMenu() {
      if (this.menu) {
        this.menu.remove();
        this.menu = null;
      }
    }

    destroy() {
      this.hideMenu();
    }
  },
  {
    eventHandlers: {
      contextmenu(event) {
        this.handleContextMenu(event);
      },
    },
  }
);

/**
 * テーブルフォーマッタ拡張
 * Ctrl+Shift+T でカーソル位置のテーブルをフォーマットします
 * Ctrl+Shift+Alt+T (Mac: Cmd+Shift+Alt+T) ですべてのテーブルをフォーマットします
 * 右クリックメニューからもフォーマットできます
 */
export function tableFormatterExtension() {
  return [
    keymap.of([
      {
        key: 'Ctrl-Shift-t',
        mac: 'Cmd-Shift-t',
        run: formatTableCommand,
      },
      {
        key: 'Ctrl-Shift-Alt-t',
        mac: 'Cmd-Shift-Alt-t',
        run: formatAllTablesCommand,
      },
    ]),
    contextMenuPlugin,
  ];
}

