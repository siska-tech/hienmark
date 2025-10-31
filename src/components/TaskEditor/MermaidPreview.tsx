/**
 * Mermaidダイアグラムのプレビューコンポーネント
 */

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidPreviewProps {
  content: string;
}

// Mermaidの初期化（セキュリティ設定）
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'antiscript', // XSS対策
  fontFamily: 'system-ui, sans-serif',
});

export function MermaidPreview({ content }: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderDiagram = async () => {
      try {
        // ユニークなIDを生成
        const id = `mermaid-${Date.now()}-${idRef.current++}`;

        // Mermaidダイアグラムをレンダリング
        const { svg } = await mermaid.render(id, content);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        if (containerRef.current) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          containerRef.current.innerHTML = `
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
    };

    renderDiagram();
  }, [content]);

  return <div ref={containerRef} className="mermaid-preview" />;
}
