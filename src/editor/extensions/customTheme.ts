import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * CodeMirror用のカスタムテーマ
 * アプリケーションのテーマに応じて動的に適用される
 */
/**
 * 現在のテーマがダークテーマかどうかを判定
 */
function isDarkTheme(): boolean {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'hienmark-dark';
}

export function createCustomTheme(): Extension {
  return EditorView.theme({
    '&': {
      color: 'var(--app-text-main)',
      backgroundColor: 'var(--app-content-bg)',
    },
    '.cm-content': {
      color: 'var(--app-text-main)',
      backgroundColor: 'var(--app-content-bg)',
    },
    '.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
      fontSize: '14px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--app-bg-secondary)',
      border: 'none',
    },
    '.cm-lineNumbers': {
      color: 'var(--app-text-secondary)',
    },
    '.cm-lineNumbers .cm-lineNumber': {
      color: 'var(--app-text-secondary)',
      minWidth: '3ch',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--app-cursor-color, var(--app-text-main)) !important',
      borderLeftWidth: '2px !important',
      borderLeftStyle: 'solid !important',
      backgroundColor: 'transparent !important',
      transition: 'border-left-color 0.2s ease',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'var(--app-accent)',
      opacity: 0.3,
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--app-bg-secondary)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--app-bg-secondary)',
      color: 'var(--app-text-main)',
    },
    // Markdown syntax
    '.cm-heading1': {
      color: 'var(--app-text-main)',
      fontWeight: 'bold',
    },
    '.cm-heading2': {
      color: 'var(--app-text-main)',
      fontWeight: 'bold',
    },
    '.cm-heading3': {
      color: 'var(--app-text-main)',
      fontWeight: 'bold',
    },
    '.cm-heading4': {
      color: 'var(--app-text-main)',
      fontWeight: 'bold',
    },
    '.cm-heading5': {
      color: 'var(--app-text-main)',
      fontWeight: 'bold',
    },
    '.cm-heading6': {
      color: 'var(--app-text-main)',
      fontWeight: 'bold',
    },
    '.cm-em': {
      fontStyle: 'italic',
      color: 'var(--app-text-main)',
    },
    '.cm-strong': {
      fontWeight: 'bold',
      color: 'var(--app-text-main)',
    },
    '.cm-code': {
      backgroundColor: 'var(--app-bg-secondary)',
      padding: '2px 4px',
      borderRadius: '3px',
      fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
      fontSize: '0.9em',
    },
    '.cm-blockquote': {
      borderLeft: '4px solid var(--app-accent)',
      paddingLeft: '1em',
      color: 'var(--app-text-secondary)',
      fontStyle: 'italic',
    },
    '.cm-list': {
      color: 'var(--app-text-main)',
    },
    '.cm-link': {
      color: 'var(--app-accent)',
      textDecoration: 'underline',
    },
    '.cm-image': {
      color: 'var(--app-accent)',
    },
    '.cm-hr': {
      borderTop: '1px solid var(--app-border)',
    },
    // Mermaid code blocks
    '.cm-codeBlock': {
      backgroundColor: 'var(--app-bg-tertiary)',
      border: '1px solid var(--app-border)',
      borderRadius: '4px',
      padding: '8px',
    },
    // Autocomplete
    '.cm-tooltip': {
      backgroundColor: 'var(--app-bg-secondary)',
      border: '1px solid var(--app-border)',
      borderRadius: '4px',
    },
    '.cm-tooltip .cm-tooltip-autocomplete': {
      backgroundColor: 'var(--app-bg-secondary)',
    },
    '.cm-completionLabel': {
      color: 'var(--app-text-main)',
    },
    '.cm-completionIcon': {
      display: 'none',
    },
    '.cm-autocomplete-selected': {
      backgroundColor: 'var(--app-bg-tertiary)',
    },
    // Scrollbar
    '.cm-scroller::-webkit-scrollbar': {
      width: '10px',
      height: '10px',
    },
    '.cm-scroller::-webkit-scrollbar-track': {
      backgroundColor: 'var(--app-bg-main)',
    },
    '.cm-scroller::-webkit-scrollbar-thumb': {
      backgroundColor: 'var(--app-border)',
      borderRadius: '5px',
    },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': {
      backgroundColor: 'var(--app-border-hover)',
    },
  }, { dark: isDarkTheme() });
}

