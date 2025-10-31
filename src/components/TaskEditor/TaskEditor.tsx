/**
 * TaskEditorコンポーネント（リファクタリング版）
 *
 * アーキテクチャ原則:
 * 1. Front Matterの唯一の真実の源: currentTask.frontMatter (Reactステート)
 * 2. CodeMirrorは本文のみを管理
 * 3. タグ編集はGUI (TagEditorPanel) が排他的に担当
 * 4. isDirtyはApp.tsxで一元管理（ローカルステート廃止）
 */

import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import type { Task, TagIndex, EditorState as TabEditorState } from '../../types/task';
import { MermaidPreview } from './MermaidPreview';
import { tagAutocomplete } from '../../editor/extensions/tagAutocomplete';
import { createCustomTheme } from '../../editor/extensions/customTheme';
import { Resizer } from '../Resizer';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTemplates } from '../../hooks/useTemplates';
import { TagEditorPanel } from './TagEditorPanel';
import { parseMarkdownContent, combineMarkdownContent } from '../../utils/frontmatterParser';
import './TaskEditor.css';

interface TaskEditorProps {
  task: Task;
  onSave: (task: Task) => void;
  onClose: () => void;
  tagIndex?: TagIndex | null;
  workspacePath?: string | null;
  workspace?: any;
  onDirtyChange?: (taskId: string, dirty: boolean) => void;
  activeTabId?: string;
  editorState?: TabEditorState;
  onUpdateEditorState?: (taskId: string, updates: Partial<TabEditorState>) => void;
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number;
  scrollSync?: boolean;
  wordWrap?: boolean;
  editorFontFamily?: string;
  editorFontSize?: number;
  onOpenTask?: (taskId: string) => void;
}

interface MermaidDiagram {
  id: string;
  content: string;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

// ソースマッピング（data-line-number）を挿入するプラグイン
function sourceMappingPlugin(mdInstance: MarkdownIt) {
  const rules = [
    'paragraph_open', 'heading_open', 'list_item_open',
    'blockquote_open', 'table_open', 'code_block', 'fence'
  ];

  rules.forEach(ruleName => {
    const rulesRenderer: any = mdInstance.renderer.rules as any;
    const originalRule = rulesRenderer[ruleName];
    rulesRenderer[ruleName] = (tokens: any, idx: number, options: any, env: any, self: any) => {
      const token = tokens[idx];
      if (token && token.map && token.map.length) {
        token.attrSet('data-line-number', String(token.map[0]));
      }
      if (originalRule) {
        return originalRule(tokens, idx, options, env, self);
      }
      return self.renderToken(tokens, idx, options);
    };
  });

  const originalFence = mdInstance.renderer.rules.fence;
  mdInstance.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.map && token.map.length) {
      token.attrSet('data-line-number', String(token.map[0]));
    }
    return originalFence ? originalFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };

  const originalCodeBlock = mdInstance.renderer.rules.code_block;
  mdInstance.renderer.rules.code_block = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.map && token.map.length) {
      token.attrSet('data-line-number', String(token.map[0]));
    }
    return originalCodeBlock ? originalCodeBlock(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };
}

md.use(sourceMappingPlugin);

export function TaskEditor({
  task,
  onSave,
  tagIndex,
  workspacePath,
  workspace,
  onDirtyChange,
  autoSaveEnabled = true,
  autoSaveInterval = 3000,
  scrollSync = true,
  wordWrap = false,
  onOpenTask,
}: TaskEditorProps) {
  const { t } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'visual'>('split');
  const [previewContent, setPreviewContent] = useState('');
  const [mermaidDiagrams, setMermaidDiagrams] = useState<MermaidDiagram[]>([]);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [editorWidth, setEditorWidth] = useState(50);
  const [tagPanelWidth, setTagPanelWidth] = useState(320);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [templateApplyMode, setTemplateApplyMode] = useState<'merge' | 'overwrite'>('overwrite');
  const [showTagPanel, setShowTagPanel] = useState(true);
  const [isDraggingTag, setIsDraggingTag] = useState(false);
  const [currentHeading, setCurrentHeading] = useState('');

  // 現在のタスク状態（Front Matterの真実の源）
  const [currentTask, setCurrentTask] = useState<Task>(() => ({
    ...task,
    frontMatter: task.frontMatter,
    tagOrder: task.tagOrder || [],
  }));

  const workspacePathString = typeof workspacePath === 'string'
    ? workspacePath
    : (workspacePath as any)?.toString() || null;

  const { templates, applyToExistingTask } = useTemplates(workspacePathString);

  // タスクが変更された時の処理（タスク切り替え時）
  useEffect(() => {
    // タスクが実際に切り替わった場合のみ状態を更新
    if (task.id !== currentTask.id) {
      setCurrentTask({
        ...task,
        frontMatter: task.frontMatter,
        tagOrder: task.tagOrder || [],
      });

      // 自動保存タイマーをクリア
      if (autoSaveTimerRef.current !== null) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      
      // 保存フラグもリセット
      isSavingRef.current = false;
    }
  }, [task.id]);

  // （統合済み）

  // CodeMirrorエディタの初期化（タスク切り替え時も再初期化）兼 スクロール同期のセットアップ
  useEffect(() => {
    if (!editorRef.current) return;

    // 既存のビューがあれば破棄
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    console.log('🎨 Initializing editor for task:', task.id);
    console.log('  task.content (first 200 chars):', task.content.substring(0, 200));
    console.log('  task.content starts with "---"?', task.content.startsWith('---'));

    const startState = EditorState.create({
      doc: task.content,
      extensions: createEditorExtensions(),
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;
    updatePreview(task.content);

    // --- スクロール同期のセットアップ（view が確実に存在するタイミング）---
    const cmScroller = viewRef.current?.scrollDOM;
    const previewPane = previewRef.current;

    let handleEditorScroll: any = null;
    let handlePreviewScroll: any = null;

    if (scrollSync && viewMode === 'split' && cmScroller && previewPane) {
      const getRelativeOffsetTop = (el: HTMLElement, container: HTMLElement) => {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        return container.scrollTop + (elRect.top - containerRect.top);
      };

      handleEditorScroll = () => {
        if (isSyncingRef.current) return;
        const v = viewRef.current;
        if (!v) return;
        const rect = v.scrollDOM.getBoundingClientRect();
        const pos = v.posAtCoords({ x: rect.left + 5, y: rect.top + 5 });
        if (pos == null) return;
        const currentLine = v.state.doc.lineAt(pos).number - 1;

        let bestMatch: Element | null = previewPane.querySelector(`[data-line-number="${currentLine}"]`);
        if (!bestMatch) {
          const allElements = previewPane.querySelectorAll<HTMLElement>('[data-line-number]');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            const line = parseInt(el.dataset.lineNumber || '0', 10);
            if (line <= currentLine) bestMatch = el; else break;
          }
        }
        if (bestMatch) {
          isSyncingRef.current = true;
          const targetY = getRelativeOffsetTop(bestMatch as HTMLElement, previewPane);
          previewPane.scrollTop = targetY - 10;
          setTimeout(() => { isSyncingRef.current = false; }, 50);
        }
      };

      handlePreviewScroll = () => {
        if (isSyncingRef.current) return;
        const v = viewRef.current;
        if (!v) return;
        const previewScrollTop = previewPane.scrollTop;
        const allElements = previewPane.querySelectorAll<HTMLElement>('[data-line-number]');
        let bestMatch: Element | null = null;
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          const elY = getRelativeOffsetTop(el, previewPane);
          if (elY >= previewScrollTop) { bestMatch = i > 0 ? allElements[i - 1] : allElements[0]; break; }
        }
        if (!bestMatch && allElements.length > 0) bestMatch = allElements[allElements.length - 1];
        if (bestMatch) {
          const line = parseInt((bestMatch as HTMLElement).dataset.lineNumber || '0', 10);
          if (!Number.isNaN(line)) {
            try {
              const linePos = v.state.doc.line(line + 1).from;
              const lineTop = v.lineBlockAt(linePos).top;
              isSyncingRef.current = true;
              cmScroller.scrollTop = lineTop;
              setTimeout(() => { isSyncingRef.current = false; }, 50);
            } catch {}
          }
        }
      };

      cmScroller.addEventListener('scroll', handleEditorScroll);
      previewPane.addEventListener('scroll', handlePreviewScroll);
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (autoSaveTimerRef.current !== null) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (cmScroller && handleEditorScroll) cmScroller.removeEventListener('scroll', handleEditorScroll);
      if (previewPane && handlePreviewScroll) previewPane.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [task.id, scrollSync, viewMode]);

  // アクティブなセクションを見つける拡張機能
  const activeSectionPlugin = ViewPlugin.fromClass(class {
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        const { state } = update.view;
        const cursorPos = state.selection.main.head;
        const doc = state.doc;
        
        // カーソル位置より前の最後の見出しを探す
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;
        let lastMatch: RegExpMatchArray | null = null;
        
        while ((match = headingRegex.exec(doc.toString())) !== null) {
          const headingEnd = match.index + match[0].length;
          if (headingEnd <= cursorPos) {
            lastMatch = match;
          } else {
            break;
          }
        }
        
        if (lastMatch) {
          const headingText = lastMatch[2];
          setCurrentHeading(headingText);
        } else {
          setCurrentHeading('');
        }
      }
    }
  });

  // エディタの拡張機能を作成
  function createEditorExtensions() {
    return [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      markdown(),
      createCustomTheme(),
      tagAutocomplete(() => tagIndex || null),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      // ワードラップ設定
      ...(wordWrap ? [EditorView.lineWrapping] as any : []),
      activeSectionPlugin,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          // 本文が変更された
          const bodyContent = update.state.doc.toString();
          updatePreview(bodyContent);

          // isDirtyを直接通知（タブ対応）
          onDirtyChange?.(task.id, true);

          // 自動保存タイマーをリセット
          if (autoSaveEnabled && autoSaveTimerRef.current !== null) {
            clearTimeout(autoSaveTimerRef.current);
          }
          if (autoSaveEnabled) {
            autoSaveTimerRef.current = window.setTimeout(() => {
              handleSave();
            }, autoSaveInterval);
          }
        }
      }),
    ];
  }

  // ワードラップ設定の変更時にエディタを再構成
  useEffect(() => {
    if (!viewRef.current) return;
    const currentDoc = viewRef.current.state.doc.toString();
    const newState = EditorState.create({
      doc: currentDoc,
      extensions: createEditorExtensions(),
    });
    viewRef.current.setState(newState);
  }, [wordWrap]);

  // プレビューを更新
  const updatePreview = (bodyContent: string) => {
    // Mermaidブロックを検出
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    const diagrams: MermaidDiagram[] = [];
    let diagramIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(bodyContent)) !== null) {
      diagrams.push({
        id: `mermaid-diagram-${diagramIndex++}`,
        content: match[1],
      });
    }

    // Mermaidブロックを除去してMarkdownを変換（行番号をずらさないよう改行数を維持）
    const contentWithoutMermaid = bodyContent.replace(/```mermaid\n([\s\S]*?)\n```/g, (full) => {
      const newlineCount = (full.match(/\n/g) || []).length;
      return '\n'.repeat(newlineCount);
    });
    const rawHtml = md.render(contentWithoutMermaid);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'ul', 'ol', 'li',
        'strong', 'em', 'code', 'pre',
        'blockquote',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'data-line-number'],
    });

    // 🔽 --- DEBUG START --- 🔽
    // DOMPurify通過後のHTMLをコンソールで確認
    console.log('[DEBUG ScrollSync-1] Sanitized HTML (head):', sanitizedHtml.substring(0, 500));
    console.log('[DEBUG ScrollSync-1] HTML includes data-line-number?', sanitizedHtml.includes('data-line-number'));
    // 🔼 --- DEBUG END --- 🔼

    setPreviewContent(sanitizedHtml);
    setMermaidDiagrams(diagrams);
  };

  // プレビュー内のリンククリックをインターセプトし、.mdリンクはエディタで開く
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      // パターン1: http://task-001.md/ のような自動リンク
      const httpMdMatch = href.match(/^https?:\/\/([^\/]+\.md)\/?$/i);
      // パターン2: 相対リンクっぽく .md を含む
      const mdPathMatch = href.match(/^([^:\s?#]+\.md)$/i);

      const candidate = (httpMdMatch?.[1] || mdPathMatch?.[1] || '').trim();
      if (!candidate) return;

      // ファイル名からタスクIDを推定（拡張子.md を除去）
      const taskId = candidate.replace(/\.md$/i, '');
      const exists = Boolean(workspace?.tasks && workspace.tasks[taskId]);
      if (!exists) return; // 存在しない場合は通常のリンク動作

      // タスクが存在するならアプリ内で開く
      e.preventDefault();
      onOpenTask?.(taskId);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [workspace?.tasks, onOpenTask, previewContent]);

  // タグ変更ハンドラー（GUIからの編集）
  const handleTagChange = (key: string, value: any) => {
    console.log('🏷️ Tag changed:', { key, value });

    setCurrentTask(prev => ({
      ...prev,
      frontMatter: { ...prev.frontMatter, [key]: value },
    }));

    // isDirtyを直接通知（タブ対応）
    onDirtyChange?.(task.id, true);

    // 自動保存タイマーをリセット（本文編集と同様に処理）
    if (autoSaveEnabled && autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (autoSaveEnabled) {
      autoSaveTimerRef.current = window.setTimeout(() => {
        handleSave();
      }, autoSaveInterval);
    }
  };

  const handleTagRemove = (key: string) => {
    console.log('🗑️ Tag removed:', { key });

    setCurrentTask(prev => {
      const newFrontMatter = { ...prev.frontMatter };
      delete newFrontMatter[key];
      return {
        ...prev,
        frontMatter: newFrontMatter,
        tagOrder: prev.tagOrder?.filter(k => k !== key),
      };
    });

    onDirtyChange?.(task.id, true);

    // 自動保存タイマーをリセット
    if (autoSaveEnabled && autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (autoSaveEnabled) {
      autoSaveTimerRef.current = window.setTimeout(() => {
        handleSave();
      }, autoSaveInterval);
    }
  };

  const handleTagAdd = (key: string, value: any) => {
    console.log('➕ Tag added:', { key, value });

    setCurrentTask(prev => ({
      ...prev,
      frontMatter: { ...prev.frontMatter, [key]: value },
      tagOrder: [...(prev.tagOrder || []), key],
    }));

    onDirtyChange?.(task.id, true);

    // 自動保存タイマーをリセット
    if (autoSaveEnabled && autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (autoSaveEnabled) {
      autoSaveTimerRef.current = window.setTimeout(() => {
        handleSave();
      }, autoSaveInterval);
    }
  };

  const handleTagReorder = (newTagOrder: string[]) => {
    console.log('🔄 Tags reordered:', { newTagOrder });

    setCurrentTask(prev => ({
      ...prev,
      tagOrder: newTagOrder,
    }));

    onDirtyChange?.(task.id, true);

    // 自動保存タイマーをリセット
    if (autoSaveEnabled && autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (autoSaveEnabled) {
      autoSaveTimerRef.current = window.setTimeout(() => {
        handleSave();
      }, autoSaveInterval);
    }
  };

  // 保存処理（単一ロジック）
  const handleSave = () => {
    if (!viewRef.current) return;
    
    // 既に保存処理中またはタイマーがキャンセルされている場合は何もしない
    if (isSavingRef.current) {
      console.log('⚠️ Save already in progress, skipping');
      return;
    }

    isSavingRef.current = true;

    // 1. Front Matterステートを取得
    const { frontMatter, tagOrder } = currentTask;

    // 2. エディタから本文を取得
    const bodyContent = viewRef.current.state.doc.toString();

    console.log('💾 Saving task:', task.id);
    console.log('  Body from editor (first 200):', bodyContent.substring(0, 200));
    console.log('  Body starts with "---"?', bodyContent.startsWith('---'));

    // 3. Front Matterと本文を結合してファイルに保存
    const fullContent = combineMarkdownContent(frontMatter, bodyContent, tagOrder);

    console.log('  Combined (first 200):', fullContent.substring(0, 200));
    console.log('  Saving to file...');

    // 4. タスクを保存（contentには本文のみを保持）
    const updatedTask: Task = {
      ...currentTask,
      content: bodyContent,  // 本文のみを保持（ファイル保存にはfullContentを使用）
      frontMatter,
      tagOrder,
    };

    // ファイルに保存するためにRust側でfullContentが使用されるので、
    // ここではワークスペース状態を更新するためのtaskを作成
    onSave(updatedTask);
    onDirtyChange?.(task.id, false);
    setLastSaved(new Date());

    // 自動保存タイマーをクリア
    if (autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    isSavingRef.current = false;
  };

  // テンプレート適用
  const handleApplyTemplate = async (templateName: string) => {
    if (!viewRef.current) return;

    try {
      // 現在のコンテンツ全体を取得
      const currentBody = viewRef.current.state.doc.toString();
      const currentFullContent = combineMarkdownContent(
        currentTask.frontMatter,
        currentBody,
        currentTask.tagOrder
      );

      const newContent = await applyToExistingTask(
        templateName,
        currentFullContent,
        templateApplyMode === 'overwrite'
      );

      // 新しいコンテンツをパース
      const parsed = parseMarkdownContent(newContent);

      // 状態を更新
      setCurrentTask(prev => ({
        ...prev,
        frontMatter: parsed.frontMatter,
        tagOrder: parsed.tagOrder.length > 0 ? parsed.tagOrder : prev.tagOrder,
      }));

      // エディタの本文を更新
      const newState = EditorState.create({
        doc: parsed.body,
        extensions: createEditorExtensions(),
      });
      viewRef.current.setState(newState);
      updatePreview(parsed.body);

      onDirtyChange?.(task.id, true);
      setShowTemplateMenu(false);
    } catch (err) {
      alert(`テンプレートの適用に失敗しました: ${err}`);
    }
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // テンプレートメニューのクリックアウトサイド
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (showTemplateMenu && !target.closest('.template-menu-container')) {
        setShowTemplateMenu(false);
      }
    };

    if (showTemplateMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTemplateMenu]);

  const handleEditorResize = (delta: number) => {
    if (!editorRef.current?.parentElement) return;
    const containerWidth = editorRef.current.parentElement.clientWidth;
    const deltaPercent = (delta / containerWidth) * 100;
    setEditorWidth(prev => Math.min(Math.max(prev + deltaPercent, 20), 80));
  };

  const handleTagPanelResize = (delta: number) => {
    setTagPanelWidth(prev => Math.max(280, Math.min(600, prev + delta)));
  };

  return (
    <div className="task-editor">
      <div className="task-editor-header">
        <div className="task-editor-title-container">
          <button
            className={`btn-tag-panel-toggle ${showTagPanel ? 'active' : ''}`}
            onClick={() => setShowTagPanel(!showTagPanel)}
            title={showTagPanel ? `${t.common.close} ${t.taskEditor.tags}` : `${t.taskEditor.tags}`}
          >
            {showTagPanel ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10 8l4-4v8l-4-4zm-8 0V6h2v2H2zm0-4V2h2v2H2zm0 8v-2h2v2H2zm0-6V4h2v2H2z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 8l-4 4V4l4 4zm8 0V6h-2v2h2zm0-4V2h-2v2h2zm0 8v-2h-2v2h2zm0-6V4h-2v2h2z"/>
              </svg>
            )}
          </button>
          <div className="task-editor-title">
            <h2>
              {task.id}.md
              {currentHeading && <span className="current-heading"> › {currentHeading}</span>}
            </h2>
          </div>
        </div>
        <div className="task-editor-actions">
          <div className="template-menu-container">
          <button
            className="btn-template"
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            disabled={templates.length === 0}
            title={`${t.templates.title}: ${templates.length}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 14V3"></path>
            </svg>
          </button>
            {showTemplateMenu && (
              <div className="template-dropdown">
                {templates.length === 0 ? (
                  <div className="template-empty">
                    テンプレートがありません
                  </div>
                ) : (
                  <>
                    <div className="template-mode-selector">
                      <label className="template-mode-label">
                        <input
                          type="radio"
                          name="templateMode"
                          value="overwrite"
                          checked={templateApplyMode === 'overwrite'}
                          onChange={(e) => setTemplateApplyMode(e.target.value as 'overwrite')}
                        />
                        <span>上書き</span>
                      </label>
                      <label className="template-mode-label">
                        <input
                          type="radio"
                          name="templateMode"
                          value="merge"
                          checked={templateApplyMode === 'merge'}
                          onChange={(e) => setTemplateApplyMode(e.target.value as 'merge')}
                        />
                        <span>マージ</span>
                      </label>
                    </div>
                    <div className="template-mode-description">
                      {templateApplyMode === 'overwrite'
                        ? '既存のタグをテンプレートのタグで置き換えます'
                        : '既存のタグを保持し、テンプレートのタグを追加します'
                      }
                    </div>
                    {templates.map((template) => (
                      <button
                        key={template.name}
                        className="template-item"
                        onClick={() => handleApplyTemplate(template.name)}
                      >
                        <div className="template-name">{template.name}</div>
                        {template.description && (
                          <div className="template-description">{template.description}</div>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            className="btn-view-mode"
            onClick={() => {
              if (viewMode === 'split') {
                setViewMode('editor');
              } else if (viewMode === 'editor') {
                setViewMode('visual');
              } else {
                setViewMode('split');
              }
            }}
            title={viewMode === 'split' ? t.taskEditor.edit : viewMode === 'editor' ? t.taskEditor.preview : `${t.taskEditor.edit} / ${t.taskEditor.preview}`}
          >
            {viewMode === 'split' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="12" y1="3" x2="12" y2="21"></line>
              </svg>
            ) : viewMode === 'editor' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
          <button
            className="btn-edit-save"
            onClick={handleSave}
            title={`${t.common.save} (Ctrl+S)`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <div className="task-editor-content">
        {showTagPanel && (
          <>
            <div style={{ width: `${tagPanelWidth}px`, flexShrink: 0 }}>
              <TagEditorPanel
                frontMatter={currentTask.frontMatter}
                tagConfigs={workspace?.config.tagConfigs || null}
                onTagChange={handleTagChange}
                onTagRemove={handleTagRemove}
                onTagAdd={handleTagAdd}
                onTagReorder={handleTagReorder}
                tagOrder={currentTask.tagOrder || Object.keys(currentTask.frontMatter)}
                onDragStateChange={setIsDraggingTag}
                workspacePath={workspacePath}
              />
            </div>
            <Resizer onResize={handleTagPanelResize} direction="horizontal" />
          </>
        )}

        <div
          ref={editorPaneRef}
          className={`editor-pane ${viewMode === 'split' ? 'split' : 'full'}`}
          style={{
            ...(viewMode === 'split' ? { width: `${editorWidth}%` } : {}),
            display: viewMode === 'visual' ? 'none' : 'block',
          }}
        >
          <div
            ref={editorRef}
            className="codemirror-container"
            style={{ pointerEvents: isDraggingTag ? 'none' : 'auto' }}
          />
        </div>

        {viewMode === 'split' && (
          <Resizer onResize={handleEditorResize} direction="horizontal" />
        )}

        <div
          className="preview-pane"
          style={{
            ...(viewMode === 'split' ? { width: `${100 - editorWidth}%` } : {}),
            display: viewMode === 'editor' ? 'none' : 'flex',
          }}
        >
          <div className="preview-content" ref={previewRef}>
            <div dangerouslySetInnerHTML={{ __html: previewContent }} />
            {mermaidDiagrams.map((diagram) => (
              <div key={diagram.id} id={`container-${diagram.id}`}>
                <MermaidPreview content={diagram.content} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="task-editor-footer">
        <span className="editor-hint">
          Ctrl+S: {t.common.save} | Esc: {t.common.close} | {autoSaveEnabled ? `${t.taskEditor.autoSave}: ${Math.round(autoSaveInterval / 1000)}${t.settings.seconds}` : `${t.taskEditor.autoSave}: ${t.common.no}`}
        </span>
        <span className="last-saved">
          {t.taskEditor.saved}: {lastSaved.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
