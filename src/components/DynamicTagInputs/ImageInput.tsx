import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

interface ImageInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  schema?: {
    type: 'Image';
    options: {};
  };
  workspacePath?: string | null;
}

export function ImageInput({ value, onChange, schema: _schema, workspacePath }: ImageInputProps) {
  const [loading, setLoading] = useState(false);

  const handleSelectImage = async () => {
    if (!workspacePath) {
      console.error('Workspace path is required for image selection');
      return;
    }

    setLoading(true);
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: '画像ファイル',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
        }]
      });

      if (selected && typeof selected === 'string') {
        // ワークスペースルートからの相対パスに変換
        const workspaceRoot = workspacePath.endsWith('/') || workspacePath.endsWith('\\') 
          ? workspacePath 
          : workspacePath + '/';
        
        const relativePath = selected.replace(workspaceRoot, '').replace(/\\/g, '/');
        onChange(relativePath);
      }
    } catch (err) {
      console.error('Failed to select image:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dynamic-input image-input">
      {value ? (
        <div className="image-preview-container">
          <div className="image-preview">
            <img src={value} alt="Preview" onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ccc"/><text x="50" y="50" fill="%23999">No Image</text></svg>';
            }} />
          </div>
          <button
            type="button"
            className="btn-change-image"
            onClick={handleSelectImage}
            disabled={loading}
          >
            {loading ? '読み込み中...' : '画像を変更'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-select-image"
          onClick={handleSelectImage}
          disabled={loading}
        >
          {loading ? '読み込み中...' : '+ 画像を選択'}
        </button>
      )}
    </div>
  );
}
