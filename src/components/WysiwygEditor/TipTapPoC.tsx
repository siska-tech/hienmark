/**
 * TipTap PoC: Markdown双方向変換の検証
 * 
 * 目的:
 * - TipTap 2.xでの基本的なMarkdown双方向変換の実装
 * - 日本語・全角文字混在時の動作確認
 * - 既存TaskEditorとの統合可能性の検証
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState, useEffect } from 'react';
import './TipTapPoC.css';

interface TipTapPoCProps {
  initialMarkdown?: string;
  onMarkdownChange?: (markdown: string) => void;
}

export function TipTapPoC({ initialMarkdown = '', onMarkdownChange }: TipTapPoCProps) {
  const [markdownOutput, setMarkdownOutput] = useState('');
  const [conversionStats, setConversionStats] = useState({
    time: 0,
    size: 0,
  });

  // TipTapエディタの初期化
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      // エディタ更新時にMarkdownに変換
      const startTime = performance.now();
      const md = convertToMarkdown(editor.getHTML());
      const endTime = performance.now();
      
      setMarkdownOutput(md);
      setConversionStats({
        time: endTime - startTime,
        size: md.length,
      });
      
      onMarkdownChange?.(md);
    },
  });

  // 初期Markdownの設定
  useEffect(() => {
    if (editor && initialMarkdown && editor.isEmpty) {
      editor.commands.setContent(initialMarkdown);
    }
  }, [editor, initialMarkdown]);

  // HTMLからMarkdownへの簡易変換
  // 注意: これは簡易的な実装です。実際のプロダクションでは
  // より堅牢な変換ライブラリ（例: turndown）を使用すべきです。
  const convertToMarkdown = (html: string): string => {
    if (!html || html === '') return '';
    
    let md = html
      // コードブロック（pre内のcode）
      .replace(/<pre><code([^>]*)>(.*?)<\/code><\/pre>/gs, (_, _attrs, code) => {
        return `\`\`\`\n${code}\n\`\`\`\n\n`;
      })
      // インラインコード
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      // 見出し
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
      .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
      .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n')
      // 強調
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      // 引用
      .replace(/<blockquote>(.*?)<\/blockquote>/gs, (_match, content) => {
        return '> ' + content.replace(/\n/g, '\n> ') + '\n\n';
      })
      // リスト（順序なし）
      .replace(/<ul>(.*?)<\/ul>/gs, (_match, content) => {
        return content + '\n';
      })
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      // リスト（順序付き） - 簡易実装
      .replace(/<ol>(.*?)<\/ol>/gs, (_match, content) => {
        let index = 1;
        return content.replace(/<li>(.*?)<\/li>/g, () => `${index++}. $1\n`) + '\n';
      })
      // 段落
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      // 水平線
      .replace(/<hr\/?>/g, '---\n\n')
      // 改行
      .replace(/<br\/?>/g, '\n')
      // その他のHTMLタグ除去
      .replace(/<[^>]*>/g, '')
      // HTMLエンティティデコード（簡易版）
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      // 連続する改行の整理
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return md;
  };

  // Markdownをエディタにロード
  const handleLoadMarkdown = () => {
    if (editor) {
      const testMarkdown = `# テスト文書

これは**太字**と*イタリック*のテストです。

## 日本語テスト

日本語、全角数字１２３、半角数字123が混在しています。

### リスト

- 項目1
- 項目2
  - サブ項目2.1
- 項目3

### コードブロック

\`\`\`javascript
const greeting = 'Hello, 世界！';
console.log(greeting);
\`\`\`

> これは引用ブロックです。

日本語とEnglishが混在する文書。`;
      
      editor.commands.setContent(testMarkdown);
    }
  };

  // 日本語混在テスト
  const handleJapaneseTest = () => {
    if (editor) {
      const japaneseTest = `# 日本語・英数字混在テスト

## 表形式データ

| 項目名 | Value | 値 |
|--------|-------|-----|
| 日本語項目 | 123 | 全角１２３ |
| English Item | 456 | 半角456 |

## コード例

\`\`\`typescript
interface User {
  name: string;
  age: number;
  メールアドレス: string;
}
\`\`\`

**太字**と*イタリック*、\`インラインコード\`のテスト。

> 引用: 「これは日本語の引用です。」

---`;
      
      editor.commands.setContent(japaneseTest);
    }
  };

  if (!editor) {
    return <div>初期化中...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* ツールバー */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: editor.isActive('bold') ? '#007bff' : '#fff',
            color: editor.isActive('bold') ? '#fff' : '#000',
            cursor: 'pointer',
          }}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: editor.isActive('italic') ? '#007bff' : '#fff',
            color: editor.isActive('italic') ? '#fff' : '#000',
            cursor: 'pointer',
          }}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: editor.isActive('heading', { level: 1 }) ? '#007bff' : '#fff',
            color: editor.isActive('heading', { level: 1 }) ? '#fff' : '#000',
            cursor: 'pointer',
          }}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: editor.isActive('heading', { level: 2 }) ? '#007bff' : '#fff',
            color: editor.isActive('heading', { level: 2 }) ? '#fff' : '#000',
            cursor: 'pointer',
          }}
        >
          H2
        </button>
        <div style={{ borderLeft: '1px solid #ccc', margin: '0 0.5rem' }} />
        <button
          onClick={handleLoadMarkdown}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #28a745',
            borderRadius: '4px',
            backgroundColor: '#28a745',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          テストMarkdown読み込み
        </button>
        <button
          onClick={handleJapaneseTest}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #17a2b8',
            borderRadius: '4px',
            backgroundColor: '#17a2b8',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          日本語混在テスト
        </button>
      </div>

      {/* エディタとMarkdown出力を分割 */}
      <div style={{ display: 'flex', gap: '1rem', height: '100%', overflow: 'hidden' }}>
        {/* エディタ部分 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #ccc', borderRadius: '4px' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
            WYSIWYG エディタ
          </div>
          <EditorContent
            editor={editor}
            style={{
              flex: 1,
              padding: '1rem',
              overflow: 'auto',
              minHeight: '300px',
            }}
          />
        </div>

        {/* Markdown出力部分 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #ccc', borderRadius: '4px' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Markdown 出力</span>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              サイズ: {conversionStats.size} bytes | 変換時間: {conversionStats.time.toFixed(2)}ms
            </span>
          </div>
          <pre
            style={{
              flex: 1,
              padding: '1rem',
              overflow: 'auto',
              margin: 0,
              backgroundColor: '#f8f9fa',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {markdownOutput || '(空)'}
          </pre>
        </div>
      </div>

      {/* 統計情報 */}
      <div style={{ padding: '0.5rem', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '0.875rem' }}>
        <strong>検証項目:</strong>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          <li>基本的なMarkdown構文（見出し、太字、イタリック、リスト）の変換</li>
          <li>日本語・全角文字混在時の変換精度</li>
          <li>双方向同期のパフォーマンス（変換時間）</li>
        </ul>
      </div>
    </div>
  );
}

