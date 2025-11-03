import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { Task, TagIndex, EditorState as TabEditorState } from '../../types/task';
import { tagAutocomplete } from '../../editor/extensions/tagAutocomplete';
import { createCustomTheme } from '../../editor/extensions/customTheme';
import { tableFormatterExtension } from '../../editor/extensions/tableFormatter';
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
  placeholder: string; // HTML内のプレースホルダー
}

const md = new MarkdownIt({
  html: true, // HTMLブロックを許可（プレースホルダーdivタグが正しく処理されるように）
  linkify: true,
  typographer: true,
});

// Mermaidの初期化（セキュリティ設定）
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'antiscript', // XSS対策
  fontFamily: 'system-ui, sans-serif',
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

  // Tauri v2のファイルドロップイベント型定義（ネット上の事例に基づく形式）
  // 実際のペイロードは { paths: string[] } の形式

  // ファイルドロップハンドラー
  const handleFileDrop = useCallback(async (filePath: string) => {
    if (!viewRef.current || !workspacePath) {
      console.log('[D&D] No editor view or workspace path');
      return;
    }

    try {
      // ファイル拡張子で画像ファイルかチェック
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'];
      const lowerPath = filePath.toLowerCase();
      const isImage = imageExtensions.some(ext => lowerPath.endsWith(ext));
      
      if (!isImage) {
        console.log('[D&D] Not an image file:', filePath);
        return;
      }

      // ★デバッグ用ログを追加
      console.log(`[D&D] File drop detected. Calling Rust with: ${filePath}`);
      
      // Rust側のcopy_asset_to_workspaceコマンドを呼び出し
      const relativePath = await invoke<string>('copy_asset_to_workspace', {
        workspacePath: workspacePath,
        sourcePath: filePath,
        taskId: task.id,
      });
      
      console.log(`[D&D] Asset copied. Relative path: ${relativePath}`);

      // CodeMirrorにMarkdownを挿入
      const view = viewRef.current;
      const cursorPos = view.state.selection.main.head;
      const fileName = filePath.split(/[/\\]/).pop() || 'image';
      const markdownInsert = `![${fileName}](${relativePath})\n`;
      
      const transaction = view.state.update({
        changes: {
          from: cursorPos,
          insert: markdownInsert,
        },
        selection: { anchor: cursorPos + markdownInsert.length },
      });
      
      view.dispatch(transaction);
      onDirtyChange?.(task.id, true);
    } catch (error) {
      console.error('[D&D] Error processing file:', error);
      alert(`ファイルの挿入に失敗しました: ${error}`);
    }
  }, [workspacePath, task.id, onDirtyChange]);

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

  // Tauri v2のファイルドロップイベントリスナーを設定
  useEffect(() => {
    console.log('[D&D] Registering file drop listener...');
    
    // listen関数を使用（ネット上の事例に基づく形式）
    const promise = listen('tauri://drag-drop', (event) => {
      console.log('[D&D] Tauri event received:', event);
      console.log('[D&D] Event payload:', event.payload);
      
      // ペイロードからpathsを取得
      const paths = (event.payload as { paths: string[] }).paths;
      
      if (paths && paths.length > 0) {
        console.log('[D&D] Files dropped:', paths);
        // 複数のファイルがドロップされても、最初のファイルのみ処理
        handleFileDrop(paths[0]);
      }
    });
    
    // クリーンアップ関数
    return () => {
      console.log('[D&D] Cleaning up file drop listener...');
      // promiseが解決（リスナーが登録完了）したら、返ってきた 'unlisten' 関数を実行する
      promise.then((unlisten: UnlistenFn) => {
        console.log('[D&D] Listener unregistered.');
        unlisten();
      }).catch((error) => {
        console.error('[D&D] Error during cleanup:', error);
      });
    };
  }, [handleFileDrop]); // ★依存配列に handleFileDrop のみを指定（workspacePathとtask.idはhandleFileDropの依存配列に含まれているため不要）

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

  // エディタの拡張機能を作成
  function createEditorExtensions() {
    return [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      markdown(),
      createCustomTheme(),
      tagAutocomplete(() => tagIndex || null),
      tableFormatterExtension(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      // ワードラップ設定
      ...(wordWrap ? [EditorView.lineWrapping] as any : []),
      activeSectionPlugin,
      // D&DはTauri v2のtauri://file-dropイベントで処理するため、CodeMirror拡張は不要
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
    // Mermaidブロックを検出（Markdown仕様準拠：行頭のみ検出）
    // Markdownのフェンス付きコードブロック（```）は行頭にある場合のみ有効
    // 文中の```mermaidは単なる文字列として扱われるべき
    const mermaidRegex = /(^|\n)```mermaid\s*\n([\s\S]*?)\n```(?=\n|$)/gm;
    const diagrams: MermaidDiagram[] = [];

    // Mermaidブロックを検出してプレースホルダー（divタグ）に置き換え
    // 正規表現のlastIndex問題を回避するため、すべてのマッチを先に取得
    const matches: RegExpExecArray[] = [];
    let execMatch: RegExpExecArray | null;
    while ((execMatch = mermaidRegex.exec(bodyContent)) !== null) {
      matches.push(execMatch);
    }

    let contentWithPlaceholders = bodyContent;
    // 後ろから置き換えることで、インデックスのズレを防ぐ
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (!match.index && match.index !== 0) continue; // indexが存在しない場合はスキップ
      
      const placeholderId = `mermaid-placeholder-${i}`;
      // HTMLブロックとして確実に認識されるよう、前後に空行を追加
      const placeholder = `\n\n<div data-mermaid-placeholder="${placeholderId}"></div>\n\n`;
      const diagram: MermaidDiagram = {
        id: `mermaid-diagram-${i}`,
        content: match[2].trim(), // 前後の空白を削除（match[2]はコンテンツ部分）
        placeholder: placeholderId,
      };
      
      diagrams.unshift(diagram); // 先頭に追加（順序を保持）
      
      // Mermaidブロックをプレースホルダーに置き換え
      // マッチ全体（前後の改行含む）を置き換え
      const fullMatch = match[0];
      const matchIndex = match.index;
      contentWithPlaceholders = 
        contentWithPlaceholders.substring(0, matchIndex) +
        placeholder +
        contentWithPlaceholders.substring(matchIndex + fullMatch.length);
    }

    // プレースホルダーを含むMarkdownをレンダリング
    const rawHtml = md.render(contentWithPlaceholders);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'ul', 'ol', 'li',
        'strong', 'em', 'code', 'pre',
        'blockquote',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', // プレースホルダー用
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'data-line-number', 'data-mermaid-placeholder', 'id'],
    });

    // 画像パスをconvertFileSrcで変換（TauriのCSP対応）
    let processedHtml = sanitizedHtml;
    if (workspacePath) {
      // imgタグのsrc属性を取得して変換
      processedHtml = processedHtml.replace(/<img([^>]*?)src="([^"]+)"([^>]*?)>/gi, (match, before, srcPath, after) => {
        // 相対パスの場合、ワークスペースルートからの絶対パスに変換
        if (srcPath && !srcPath.startsWith('http://') && !srcPath.startsWith('https://') && !srcPath.startsWith('asset:')) {
          // パス区切り文字を統一（Windows対応）
          const normalizedWorkspacePath = workspacePath.replace(/\\/g, '/').replace(/\/$/, '');
          const normalizedSrcPath = srcPath.replace(/\\/g, '/');
          
          // 相対パス（例: .hienmark/assets/image.png）を絶対パスに変換
          let absolutePath: string;
          
          if (normalizedSrcPath.startsWith('./')) {
            // 相対パス（例: ./hienmark/assets/image.png）
            absolutePath = normalizedWorkspacePath + '/' + normalizedSrcPath.substring(2);
          } else if (normalizedSrcPath.startsWith('../')) {
            // 親ディレクトリ参照はワークスペースルートからの相対として処理
            absolutePath = normalizedWorkspacePath + '/' + normalizedSrcPath;
          } else if (normalizedSrcPath.startsWith('/')) {
            // ルートからの絶対パス（通常はワークスペースルートからの相対として扱う）
            absolutePath = normalizedWorkspacePath + normalizedSrcPath;
          } else {
            // ファイル名のみまたは相対パス（ワークスペースルートからの相対）
            absolutePath = normalizedWorkspacePath + '/' + normalizedSrcPath;
          }
          
          // convertFileSrcで変換
          const convertedSrc = convertFileSrc(absolutePath);
          console.log('[Image] Converting path:', { original: srcPath, absolute: absolutePath, converted: convertedSrc });
          return `<img${before}src="${convertedSrc}"${after}>`;
        }
        return match; // 変換不要な場合はそのまま
      });
    }

    // プレースホルダーをMermaidダイアグラムのコンテナに置き換え
    let finalHtml = processedHtml;
    diagrams.forEach((diagram) => {
      const containerHtml = `<div id="container-${diagram.id}" class="mermaid-container"></div>`;
      
      // より柔軟なパターンマッチング（属性の順序や空白を許容）
      // 例: <div data-mermaid-placeholder="..." ></div> または <div data-mermaid-placeholder="..."></div>
      const patterns = [
        // 基本的なパターン（閉じタグあり）
        new RegExp(`<div[^>]*data-mermaid-placeholder="${diagram.placeholder}"[^>]*>\\s*</div>`, 'gi'),
        // pタグで囲まれている場合
        new RegExp(`<p>\\s*<div[^>]*data-mermaid-placeholder="${diagram.placeholder}"[^>]*>\\s*</div>\\s*</p>`, 'gi'),
        // 自己閉じタグ形式
        new RegExp(`<div[^>]*data-mermaid-placeholder="${diagram.placeholder}"[^>]*\\s*/?>`, 'gi'),
      ];
      
      // 各パターンを順番に試す（一度マッチしたら次のパターンに進む）
      let replaced = false;
      for (const pattern of patterns) {
        // test()はlastIndexを更新するため、match()を使用
        const match = finalHtml.match(pattern);
        if (match) {
          finalHtml = finalHtml.replace(pattern, containerHtml);
          replaced = true;
          break;
        }
      }
      
      // どのパターンにもマッチしない場合、エスケープされた形式を検索
      if (!replaced) {
        // プレースホルダーIDで検索（エスケープされていない形式）
        const placeholderIdIndex = finalHtml.indexOf(diagram.placeholder);
        if (placeholderIdIndex >= 0) {
          // エスケープされたdivタグを含むpタグを見つける
          const pTagStart = finalHtml.lastIndexOf('<p', placeholderIdIndex);
          if (pTagStart >= 0) {
            const pTagEnd = finalHtml.indexOf('</p>', placeholderIdIndex);
            if (pTagEnd >= 0) {
              const pContent = finalHtml.substring(pTagStart, pTagEnd + 4);
              // エスケープされたプレースホルダーdivを含む場合のみ置き換え
              // プレースホルダーIDが含まれていればOK（エスケープされたdivも含む）
              if (pContent.includes('&lt;div') && pContent.includes(diagram.placeholder)) {
                // 置き換え（最初のマッチのみ）
                finalHtml = finalHtml.substring(0, pTagStart) + containerHtml + finalHtml.substring(pTagEnd + 4);
                replaced = true;
              }
            }
          }
        }
      }
      
      // それでも見つからない場合、エスケープされた形式を直接検索・置き換え
      if (!replaced) {
        // エスケープされたプレースホルダーを含むpタグ全体を置き換え
        // シンプルな文字列検索ベースのアプローチ
        const escapedDivStart = `&lt;div`;
        const placeholderIdStr = diagram.placeholder;
        const escapedDivEnd = `&gt;&lt;/div&gt;`;
        
        // エスケープされたdivタグの開始位置を探す
        let searchIndex = 0;
        while (true) {
          const divStartIndex = finalHtml.indexOf(escapedDivStart, searchIndex);
          if (divStartIndex < 0) break;
          
          // そのdivタグ内にプレースホルダーIDがあるか確認
          const divEndIndex = finalHtml.indexOf(escapedDivEnd, divStartIndex);
          if (divEndIndex >= 0) {
            const divContent = finalHtml.substring(divStartIndex, divEndIndex + escapedDivEnd.length);
            if (divContent.includes(placeholderIdStr) && divContent.includes('data-mermaid-placeholder')) {
              // このdivタグを含むpタグを見つける
              const pTagStart = finalHtml.lastIndexOf('<p', divStartIndex);
              if (pTagStart >= 0) {
                const pTagEnd = finalHtml.indexOf('</p>', divEndIndex);
                if (pTagEnd >= 0) {
                  // 置き換え
                  finalHtml = finalHtml.substring(0, pTagStart) + containerHtml + finalHtml.substring(pTagEnd + 4);
                  replaced = true;
                  break;
                }
              }
            }
          }
          searchIndex = divEndIndex >= 0 ? divEndIndex : divStartIndex + 1;
        }
      }
    });

    // 🔽 --- DEBUG START --- 🔽
    // DOMPurify通過後のHTMLをコンソールで確認
    console.log('[DEBUG Mermaid] Diagrams count:', diagrams.length);
    
    // プレースホルダーの実際の形式を確認（全体を検索）
    const allPlaceholderMatches = sanitizedHtml.match(/data-mermaid-placeholder[^>]*/g);
    console.log('[DEBUG Mermaid] All placeholder matches in sanitized:', allPlaceholderMatches);
    
    diagrams.forEach((diagram) => {
      const placeholderStr = `data-mermaid-placeholder="${diagram.placeholder}"`;
      const placeholderIndex = sanitizedHtml.indexOf(placeholderStr);
      if (placeholderIndex >= 0) {
        const contextStart = Math.max(0, placeholderIndex - 100);
        const contextEnd = Math.min(sanitizedHtml.length, placeholderIndex + 200);
        console.log(`[DEBUG Mermaid] Placeholder context for ${diagram.placeholder}:`, sanitizedHtml.substring(contextStart, contextEnd));
      } else {
        // プレースホルダーが見つからない場合、data-mermaid-placeholderを含む部分を探す
        const anyPlaceholderIndex = sanitizedHtml.indexOf('data-mermaid-placeholder');
        if (anyPlaceholderIndex >= 0) {
          const contextStart = Math.max(0, anyPlaceholderIndex - 100);
          const contextEnd = Math.min(sanitizedHtml.length, anyPlaceholderIndex + 200);
          console.log(`[DEBUG Mermaid] Found some placeholder at:`, sanitizedHtml.substring(contextStart, contextEnd));
        }
      }
    });
    
    console.log('[DEBUG Mermaid] Final HTML (head):', finalHtml.substring(0, 500));
    const allFinalPlaceholderMatches = finalHtml.match(/data-mermaid-placeholder[^>]*/g);
    console.log('[DEBUG Mermaid] All placeholder matches in final:', allFinalPlaceholderMatches);
    console.log('[DEBUG Mermaid] Contains placeholder?', finalHtml.includes('data-mermaid-placeholder'));
    diagrams.forEach((diagram) => {
      const hasPlaceholder = finalHtml.includes(`data-mermaid-placeholder="${diagram.placeholder}"`);
      const hasContainer = finalHtml.includes(`id="container-${diagram.id}"`);
      console.log(`[DEBUG Mermaid] Diagram ${diagram.id}: placeholder=${hasPlaceholder}, container=${hasContainer}`);
    });
    // 🔼 --- DEBUG END --- 🔼

    setPreviewContent(finalHtml);
    setMermaidDiagrams(diagrams);
  };

  // Mermaidダイアグラムをレンダリング（HTML内のコンテナに挿入）
  useEffect(() => {
    if (!previewRef.current || mermaidDiagrams.length === 0) return;

    // DOMが更新された後にレンダリングするため、少し遅延
    const timeoutId = setTimeout(() => {
      const renderMermaidDiagrams = async () => {
        for (const diagram of mermaidDiagrams) {
          const container = previewRef.current?.querySelector(`#container-${diagram.id}`);
          if (!container) {
            console.warn(`[Mermaid] Container not found for diagram ${diagram.id}`);
            continue;
          }

          // 既にSVGがレンダリングされている場合はスキップ（再レンダリング防止）
          if (container.querySelector('svg')) {
            console.log(`[Mermaid] Diagram ${diagram.id} already rendered, skipping`);
            continue;
          }

          try {
            const id = `mermaid-${diagram.id}-${Date.now()}`;
            console.log(`[Mermaid] Rendering diagram ${diagram.id} with content:`, diagram.content.substring(0, 50));
            const { svg } = await mermaid.render(id, diagram.content);
            if (container && container.parentNode) {
              container.innerHTML = svg;
              console.log(`[Mermaid] Successfully rendered diagram ${diagram.id}`);
            }
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (container && container.parentNode) {
              container.innerHTML = `
                <div style="color: #dc2626; padding: 1rem; background: #fef2f2; border-radius: 0.5rem; margin: 0; max-width: 100%; box-sizing: border-box;">
                  <div style="margin-bottom: 0.75rem;">
                    <strong>Mermaidダイアグラムのレンダリングエラー:</strong>
                  </div>
                  <div style="padding: 0.5rem; background: rgba(0, 0, 0, 0.1); border-radius: 0.25rem; font-family: 'Courier New', monospace; font-size: 0.875rem; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; overflow-x: auto; max-width: 100%;">
                    <code style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">${errorMessage}</code>
                  </div>
                </div>
              `;
            }
          }
        }
      };

      renderMermaidDiagrams();
    }, 100); // 少し長めの遅延でDOM更新を確実に待つ

    return () => clearTimeout(timeoutId);
  }, [previewContent, mermaidDiagrams]);

  // プレビュー内のリンククリックをインターセプトし、.mdリンクはエディタで開く
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      // Tauriアプリ内ではすべてのリンククリックをインターセプトしてデフォルト動作を防ぐ
      e.preventDefault();
      e.stopPropagation();

      let href = anchor.getAttribute('href') || '';
      if (!href) return;

      // URLエンコードされた文字をデコード
      try {
        href = decodeURIComponent(href);
      } catch {
        // デコードに失敗した場合は元のhrefを使用
      }

      // .mdファイルへのリンクかどうかをチェック
      let mdFileName: string | null = null;

      // パターン1: 完全なURL (http://localhost:5173/task-xxx.md または http://localhost:5173/requirements/task-xxx.md)
      const fullUrlMatch = href.match(/^https?:\/\/[^\/]+(.*)$/i);
      if (fullUrlMatch) {
        const path = fullUrlMatch[1];
        // パスの最後の部分から.mdファイル名を抽出
        const pathMatch = path.match(/([^\/?#]+\.md)(?:\/|$|\?|#)/i) || path.match(/([^\/?#]+\.md)$/i);
        if (pathMatch) {
          mdFileName = pathMatch[1];
        }
      }

      // パターン2: 相対パス (./task-xxx.md, ../requirements/task-xxx.md など)
      if (!mdFileName) {
        // パスの最後の部分（ファイル名）を抽出
        // 例: ../requirements/10-implementation-roadmap.md → 10-implementation-roadmap.md
        const pathParts = href.split(/[\/\\]/);
        for (let i = pathParts.length - 1; i >= 0; i--) {
          const part = pathParts[i];
          if (part && part.toLowerCase().endsWith('.md')) {
            mdFileName = part;
            break;
          }
        }

        // パターン3: 単純なファイル名 (task-xxx.md)
        if (!mdFileName) {
          const simpleMatch = href.match(/^([^\/?#]+\.md)(?:\/|$|\?|#)/i) || href.match(/^([^\/?#]+\.md)$/i);
          if (simpleMatch && !simpleMatch[1].includes('://')) {
            mdFileName = simpleMatch[1];
          }
        }
      }

      if (!mdFileName) {
        // .mdファイルへのリンクでない場合は何もしない（デフォルト動作は既に防いでいる）
        console.log('[Link] Ignored non-markdown link:', href);
        return;
      }

      // ファイル名からタスクIDを抽出（拡張子.md を除去）
      const taskId = mdFileName.replace(/\.md$/i, '');
      
      // タスクが存在するかチェック
      const exists = Boolean(workspace?.tasks && workspace.tasks[taskId]);
      if (!exists) {
        // 存在しないタスクへのリンクの場合
        console.log('[Link] Task not found:', taskId, 'from link:', href);
        return;
      }

      // タスクが存在するならアプリ内で開く
      console.log('[Link] Opening task:', taskId, 'from link:', href);
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
    // 注意: task propから最新の基本情報（特にfilePathとid）を取得し、
    // frontMatterとtagOrderは編集中の情報（currentTask）を使用
    const updatedTask: Task = {
      ...task,           // 最新のtaskから基本情報を取得（特にfilePathとid）
      content: bodyContent,  // 本文のみを保持（ファイル保存にはfullContentを使用）
      frontMatter,      // 編集中のFront Matter（currentTaskから取得済み）
      tagOrder,         // 編集中のタグ順序（currentTaskから取得済み）
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
