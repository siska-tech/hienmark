import { useState } from 'react';
import type { HyperlinkValue } from '../../types/task';

interface HyperlinkInputProps {
  value: HyperlinkValue | undefined;
  onChange: (value: HyperlinkValue) => void;
  schema?: {
    type: 'Hyperlink';
    options: {};
  };
}

export function HyperlinkInput({ value, onChange, schema: _schema }: HyperlinkInputProps) {
  const [url, setUrl] = useState(value?.url || '');
  const [text, setText] = useState(value?.text || '');

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    onChange({ url: newUrl, text });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);
    onChange({ url, text: newText });
  };

  return (
    <div className="dynamic-input hyperlink-input">
      <div className="hyperlink-field">
        <label>URL</label>
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://example.com"
        />
      </div>
      <div className="hyperlink-field">
        <label>表示テキスト</label>
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder="リンクのテキスト"
        />
      </div>
      {value && url && (
        <div className="hyperlink-preview">
          <a href={url} target="_blank" rel="noopener noreferrer">
            {text || url}
          </a>
        </div>
      )}
    </div>
  );
}
