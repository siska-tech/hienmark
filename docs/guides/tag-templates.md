# タグテンプレート機能

## 概要

タグテンプレート機能は、よく使うタグの組み合わせをテンプレートとして保存し、新規タスク作成時や既存タスク編集時に簡単に適用できる機能です。

## UI操作方法

### テンプレートマネージャーを開く

1. ワークスペースを開いた状態で、ヘッダーの「**テンプレート**」ボタンをクリック
2. テンプレート管理画面が表示されます
3. 「タスク表示」ボタンで通常のタスク表示に戻れます

### テンプレートの作成

1. テンプレートマネージャーで「**新規作成**」ボタンをクリック
2. テンプレート編集画面が開きます
3. 以下の情報を入力:
   - **テンプレート名** (必須): 一意の識別名
   - **説明** (任意): テンプレートの用途や説明
   - **タグ**: キー、値、型を指定して「追加」ボタンで追加
     - サポートされる型: **文字列**、**数値**、**真偽値**、**配列**、**日付**
4. 「**作成**」ボタンで保存

### テンプレートの編集

1. テンプレート一覧から編集したいテンプレートをクリックして展開
2. 「**編集**」ボタンをクリック
3. タグを追加/削除/変更
4. 「**更新**」ボタンで保存

### デフォルトテンプレートの設定

1. テンプレート一覧から設定したいテンプレートを展開
2. 「**デフォルトに設定**」ボタンをクリック
3. デフォルトテンプレートには緑色のバッジが表示されます

### テンプレートの削除

1. テンプレート一覧から削除したいテンプレートを展開
2. 「**削除**」ボタンをクリック
3. 確認ダイアログで「OK」をクリック

## 機能一覧

### 1. テンプレート管理

#### テンプレートの作成
- テンプレート名、説明、タグの組み合わせを定義
- 複数のタグタイプをサポート（文字列、数値、真偽値、配列、日付）
- バリデーション機能で不正なテンプレートを防止

#### テンプレートの編集
- 既存テンプレートのタグを追加/削除/変更
- 説明の更新

#### テンプレートの削除
- 不要になったテンプレートを削除
- デフォルトテンプレート設定も自動的にクリア

#### テンプレート名の変更
- テンプレート名を変更
- デフォルト設定も自動的に更新

### 2. デフォルトテンプレート

- ワークスペースごとに1つのデフォルトテンプレートを設定可能
- 新規タスク作成時に自動的にデフォルトテンプレートが適用される（実装予定）

### 3. テンプレートの適用

#### 新規タスクへの適用
- テンプレート選択ダイアログから選択
- テンプレートのタグがフロントマターとして挿入される
- タスクの本文は保持される

#### 既存タスクへの適用
- **マージモード**: 既存のタグを保持し、テンプレートのタグを追加（既存タグが優先）
- **上書きモード**: すべてのタグをテンプレートで置き換え

### 4. テンプレートの作成元

#### 手動作成
- UIから直接タグを定義してテンプレートを作成

#### 既存タスクから作成（実装予定）
- 既存のタスクのフロントマターをテンプレート化
- テンプレート名と説明を指定

## データ構造

### TagTemplate

```typescript
interface TagTemplate {
  name: string;              // テンプレート名（一意）
  description?: string;      // 説明（オプション）
  tags: Record<string, TagValue>; // タグの組み合わせ
  createdAt: string;         // 作成日時
  updatedAt: string;         // 最終更新日時
}
```

### TemplateCollection

```typescript
interface TemplateCollection {
  templates: Record<string, TagTemplate>; // テンプレート名 → テンプレート
  defaultTemplate?: string;              // デフォルトテンプレート名
}
```

### 保存場所

テンプレートは `.hienmark.json` の `templates` フィールドに保存されます。

```json
{
  "strictTagMode": false,
  "allowedCategories": ["status", "priority", "tags"],
  "watchEnabled": true,
  "templates": {
    "templates": {
      "default": {
        "name": "default",
        "description": "デフォルトテンプレート",
        "tags": {
          "status": "pending",
          "priority": "medium"
        },
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-15T10:00:00Z"
      }
    },
    "defaultTemplate": "default"
  }
}
```

## Tauri コマンド

### テンプレート管理

- `list_templates(workspace_path)` - テンプレート一覧を取得
- `get_template(workspace_path, template_name)` - 特定のテンプレートを取得
- `get_default_template(workspace_path)` - デフォルトテンプレートを取得
- `create_template(workspace_path, name, description, tags)` - テンプレートを作成
- `update_template(workspace_path, name, description, tags)` - テンプレートを更新
- `delete_template(workspace_path, name)` - テンプレートを削除
- `rename_template(workspace_path, old_name, new_name)` - テンプレート名を変更
- `set_default_template(workspace_path, template_name)` - デフォルトテンプレートを設定

### テンプレート適用

- `apply_template_to_new_task(workspace_path, template_name, content)` - 新規タスクに適用
- `apply_template_to_existing_task(workspace_path, template_name, task_content, overwrite)` - 既存タスクに適用
- `create_template_from_task(workspace_path, task_content, template_name, description)` - タスクからテンプレートを作成
- `preview_template(workspace_path, template_name)` - テンプレートのプレビューを取得（YAML形式）

## UIコンポーネント

### TemplateManager
テンプレートの一覧表示と管理を行うメインコンポーネント。

**機能:**
- テンプレート一覧の表示
- テンプレートの展開/折りたたみ
- タグのプレビュー表示
- デフォルトテンプレートのバッジ表示
- 編集/削除/デフォルト設定ボタン

### TemplateEditor
テンプレートの作成・編集フォーム。

**機能:**
- テンプレート名、説明の入力
- タグの追加/削除/編集
- タグタイプの選択（文字列/数値/真偽値/配列）
- バリデーション

### TemplateSelector
タスク作成/編集時のテンプレート選択ダイアログ。

**機能:**
- テンプレートの一覧表示と選択
- タグのプレビュー
- マージモード/上書きモードの切り替え（既存タスクの場合）
- テンプレートの適用

## 使用例

### テンプレートの作成

```typescript
import { TemplateService } from './services/templateService';

const template = await TemplateService.createTemplate(
  workspacePath,
  'bug-report',
  'バグ報告用テンプレート',
  {
    status: 'pending',
    priority: 'high',
    type: 'bug',
    tags: ['bug', 'needs-investigation'],
    due_date: '2025-12-31'  // 日付型（YYYY-MM-DD形式）
  }
);
```

### テンプレートの適用（新規タスク）

```typescript
const content = await TemplateService.applyTemplateToNewTask(
  workspacePath,
  'bug-report',
  '# バグタイトル\n\n## 詳細'
);

// 結果:
// ---
// status: pending
// priority: high
// type: bug
// tags: [bug, needs-investigation]
// ---
//
// # バグタイトル
//
// ## 詳細
```

### テンプレートの適用（既存タスク、マージモード）

```typescript
const existingContent = `---
status: in_progress
assigned_to: user1
---

# タスク内容`;

const updatedContent = await TemplateService.applyTemplateToExistingTask(
  workspacePath,
  'bug-report',
  existingContent,
  false // マージモード
);

// 結果:
// ---
// status: in_progress    # 既存の値が保持される
// assigned_to: user1     # 既存のタグも保持される
// priority: high         # テンプレートから追加
// type: bug              # テンプレートから追加
// tags: [bug, needs-investigation] # テンプレートから追加
// ---
//
// # タスク内容
```

## React フック

### useTemplates

テンプレート管理を簡単にするためのカスタムフック。

```typescript
import { useTemplates } from './hooks/useTemplates';

function MyComponent() {
  const {
    templates,           // テンプレート一覧
    defaultTemplate,     // デフォルトテンプレート
    loading,             // ローディング状態
    error,               // エラー状態
    reload,              // リロード関数
    createTemplate,      // テンプレート作成
    updateTemplate,      // テンプレート更新
    deleteTemplate,      // テンプレート削除
    renameTemplate,      // テンプレート名変更
    setAsDefault,        // デフォルト設定
    applyToNewTask,      // 新規タスクに適用
    applyToExistingTask, // 既存タスクに適用
    createFromTask,      // タスクから作成
    previewTemplate,     // プレビュー取得
  } = useTemplates(workspacePath);

  // ...
}
```

## 実装ファイル

### Backend (Rust)
- `src-tauri/src/models/template.rs` - データモデル
- `src-tauri/src/service/template_service.rs` - ビジネスロジック
- `src-tauri/src/commands/template_commands.rs` - Tauriコマンド

### Frontend (TypeScript/React)
- `src/types/task.ts` - 型定義
- `src/services/templateService.ts` - APIサービス
- `src/hooks/useTemplates.ts` - Reactフック
- `src/components/TemplateManagement/TemplateManager.tsx` - 管理UI
- `src/components/TemplateManagement/TemplateEditor.tsx` - 編集UI
- `src/components/TemplateManagement/TemplateSelector.tsx` - 選択UI

## 今後の拡張予定

1. **デフォルトテンプレートの自動適用**
   - 新規タスク作成時に自動的にデフォルトテンプレートを適用

2. **テンプレートのインポート/エクスポート**
   - JSONファイルからテンプレートをインポート
   - テンプレートをJSONファイルにエクスポート

3. **テンプレートの共有**
   - 複数のワークスペース間でテンプレートを共有

4. **条件付きテンプレート**
   - ファイルパスやタスク名に基づいて適用するテンプレートを自動選択

5. **テンプレートの継承**
   - ベーステンプレートを継承して新しいテンプレートを作成

6. **タグ値のバリデーション**
   - タグごとに許可される値のリストを定義
   - 型制約の強化

## セキュリティ考慮事項

- テンプレート名のバリデーション（空文字、改行文字の禁止）
- タグキーのバリデーション（空文字、改行文字の禁止）
- JSONシリアライゼーション/デシリアライゼーションのエラーハンドリング
- ファイル書き込み時のエラーハンドリング
