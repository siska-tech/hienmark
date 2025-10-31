# Phase 3: タグシステム実装 - 開発記録

**期間:** 2025-10-25  
**ステータス:** ✅ 完了

## 概要

Phase 2で構築したコア機能を基に、タグベースの分析・管理システムを実装しました。Front Matterのタグを自動集約し、インテリジェントな補完機能、タグ管理UI、リネーム・削除機能、ワークスペース設定システムを構築しました。

## マイルストーン

### 3.1 タグ解析・集約機能 ✅

**実施内容:**

**Rustバックエンド実装:**
- `TagIndex`および`TagCategory`モデル (`src-tauri/src/models/tag.rs`)
  - タグのカテゴリ（キー）と値の管理
  - 使用回数のカウント
  - タスクIDリストの保持
  - `index_task()` - タスクのタグをインデックスに追加
  - `remove_task()` - タスクをインデックスから削除

- `WorkspaceService`の拡張 (`src-tauri/src/service/workspace_service.rs`)
  - ワークスペース読み込み時に自動的にタグインデックス生成
  - 全タスクのFront Matterをスキャンして集約

- Tauriコマンド追加 (`src-tauri/src/commands/workspace_commands.rs`)
  - `get_tag_index` - タグインデックス取得コマンド

**フロントエンド実装:**
- `TagService` APIクライアント (`src/services/tagService.ts`)
  - `getTagIndex()` - バックエンドからタグインデックス取得

- `useTags` Reactフック (`src/hooks/useTags.ts`)
  - タグインデックスの状態管理
  - ワークスペース変更時の自動再読み込み
  - ローディング・エラー状態管理

**技術的詳細:**
- タグはFront Matter内のYAMLキー・バリューペアとして管理
- カテゴリ（例: `status`, `priority`）と値（例: `pending`, `high`）の形式
- 各タグの使用回数とタスクIDのリストを保持
- ワークスペース全体のタグを高速に検索可能

**成果:**
- ✅ 自動タグ集約システム
- ✅ タグ使用統計の取得
- ✅ リアルタイムタグインデックス更新

### 3.2 タグ選択UI (CodeMirrorオートコンプリート) ✅

**実施内容:**

**依存関係インストール:**
```bash
npm install @codemirror/autocomplete
```

**CodeMirror拡張実装:**
- `tagAutocomplete` 拡張 (`src/editor/extensions/tagAutocomplete.ts`)
  - Front Matter領域の自動検出（`---` ... `---` 間）
  - タグキー（カテゴリ名）の補完
    - 既存カテゴリを提案
    - 使用タスク数を表示
    - 選択時に自動的に`: `を追加
  - タグ値の補完
    - 指定カテゴリの既存値を提案
    - 使用回数を表示
    - 部分一致で絞り込み
  - `getTagIndex()` 関数を受け取り、動的に補完候補を生成

**TaskEditor統合:**
- `TaskEditor`コンポーネントに統合 (`src/components/TaskEditor/TaskEditor.tsx`)
  - `tagIndex` propを追加
  - CodeMirrorのextensionsに`tagAutocomplete`を追加
  - エディタ再初期化時にタグインデックスを反映（`task.id, tagIndex`依存）

**App.tsx統合:**
- `useTags`フックを使用してタグインデックスを取得
- `TaskEditor`に`tagIndex`を渡す

**ユーザー体験:**
- Front Matter内で入力を開始すると自動的に補完候補を表示
- 既存のタグキーを提案（使用タスク数を表示）
- 既存のタグ値を提案（使用回数を表示）
- 補完候補は部分一致で絞り込み可能
- キーボード操作で選択可能

**成果:**
- ✅ Front Matter内でのインテリジェントな補完
- ✅ タグキーと値の両方をサポート
- ✅ 使用統計情報の表示
- ✅ スムーズなユーザー体験

### 3.3 タグ管理機能 ✅

**実施内容:**

**TagManagerコンポーネント実装** (`src/components/TagManagement/`):
- `TagManager.tsx` - タグ管理UIコンポーネント
  - タグカテゴリの一覧表示
  - カテゴリの展開/折りたたみ
  - タグ値の一覧と使用回数表示
  - タグ編集UI（リネーム機能の準備）
  - タグ削除UI（削除機能の準備）
  - タグ統計情報の表示
    - カテゴリ数
    - 最終更新日時
    - 各カテゴリの値の種類数
    - 各カテゴリの使用タスク数
    - 各値の使用回数

- `TagManager.css` - スタイリング
  - ダークテーマ対応
  - 展開/折りたたみアニメーション
  - ホバーエフェクト
  - 編集・削除ボタンのスタイル

**アプリケーション統合:**
- `App.tsx`にタグ管理モード切り替え機能追加
  - ヘッダーに「タグ管理」ボタン追加
  - タスク表示とタグ管理画面の切り替え
  - `showTagManager`状態管理

- `App.css`更新
  - タグ管理ボタンのスタイル
  - `workspace-info`レイアウト調整

**UI機能:**
- カテゴリリストの表示
  - カテゴリ名
  - 値の種類数 / 使用タスク数
  - 展開/折りたたみアイコン
- 値リストの表示（カテゴリ展開時）
  - 値名
  - 使用回数
  - 編集ボタン
  - 削除ボタン
- 編集モード
  - インライン編集フィールド
  - 保存/キャンセルボタン
- 削除確認
  - `confirm()`ダイアログによる確認

**今後の実装（バックエンド）:**
- `rename_tag` Tauriコマンド - タグのリネーム（全タスク一括更新）
- `delete_tag` Tauriコマンド - タグの削除（全タスクから削除）

**成果:**
- ✅ タグ一覧表示UI
- ✅ タグ統計情報の可視化
- ✅ 編集・削除UIの準備
- ✅ ダークテーマ対応

### 3.4 タグ操作機能（リネーム・削除） ✅

#### 3.4.1 タグリネーム機能 ✅

**実施内容:**

**Rustバックエンド実装:**
- `TagService` サービス実装 (`src-tauri/src/service/tag_service.rs`)
  - `rename_tag()` - タグ値の一括リネーム
    - 全タスクから該当タグを検索
    - Front Matterを更新
    - ファイルに保存
    - タグインデックスを再構築
  - 型を維持したリネーム
    - String → String
    - Number → Number（変換可能な場合）
    - Bool → Bool（変換可能な場合）
    - Array → String（フォールバック）

- Tauriコマンド実装 (`src-tauri/src/commands/tag_commands.rs`)
  - `rename_tag` - リネームコマンド
  - 引数: workspace_path, category, old_value, new_value
  - 戻り値: 更新されたタスク数

**フロントエンド実装:**
- `TagService` API拡張 (`src/services/tagService.ts`)
  - `renameTag()` メソッド追加

- `TagManager` コンポーネント更新
  - インライン編集UI
    - 編集ボタンクリックで編集モードに切り替え
    - テキストフィールドで値を編集
    - Enter キーで保存
    - Escape キーでキャンセル
  - バリデーション
    - 空文字チェック
    - 変更なしチェック
  - 処理中表示
    - ボタン無効化
    - 「処理中...」メッセージ
  - 成功時の処理
    - 更新タスク数を表示
    - タグインデックス自動再読み込み

**成果:**
- ✅ タグ値の一括リネーム
- ✅ 全タスクへの自動反映
- ✅ ユーザーフレンドリーなUI
- ✅ リアルタイム更新

#### 3.4.2 タグ削除機能 ✅

**実施内容:**

**Rustバックエンド実装:**
- `TagService::delete_tag()` メソッド
  - 特定の値を削除（value指定時）
  - カテゴリごと削除（value未指定時）
  - 該当タスクのFront Matterを更新
  - ファイルに保存
  - タグインデックス再構築

- Tauriコマンド
  - `delete_tag` コマンド
  - 引数: workspace_path, category, value (Optional)
  - 戻り値: 更新されたタスク数

**フロントエンド実装:**
- `TagService::deleteTag()` メソッド追加

- `TagManager` コンポーネント更新
  - 値の削除ボタン
    - 確認ダイアログ表示
    - 「この操作は元に戻せません」警告
  - カテゴリの削除ボタン（×ボタン）
    - カテゴリヘッダーに配置
    - ホバー時に赤色表示
    - 全タスクから該当カテゴリを削除

**CSS更新:**
- `.category-header-row` - ヘッダー行レイアウト
- `.btn-delete-category` - カテゴリ削除ボタンスタイル
- ホバーエフェクト
- 無効化状態のスタイル

**成果:**
- ✅ タグ値の個別削除
- ✅ カテゴリの一括削除
- ✅ 安全性を考慮した確認ダイアログ
- ✅ 視覚的フィードバック

### 3.5 タグモード管理（固定/任意） ✅

#### 3.5.1 ワークスペース設定システム ✅

**実施内容:**

**Rustバックエンド実装:**
- `WorkspaceConfig` モデル（既存、拡張利用）
  - `strict_tag_mode: bool` - 固定モードフラグ
  - `allowed_categories: Vec<String>` - 許可カテゴリリスト
  - デフォルト値: 任意モード、["status", "priority", "tags"]

- 設定永続化
  - `.hienmark.json` ファイルに保存
  - ワークスペースルートディレクトリに配置
  - JSON形式（pretty print）

- Tauriコマンド実装 (`src-tauri/src/commands/workspace_commands.rs`)
  - `get_workspace_config` - 設定取得
    - ファイルが存在すれば読み込み
    - 存在しなければデフォルト設定を返す
  - `update_workspace_config` - 設定更新
    - JSON形式で保存
    - serde_jsonによるシリアライズ

**フロントエンド実装:**
- `WorkspaceConfigService` 実装 (`src/services/workspaceConfigService.ts`)
  - `getConfig()` - 設定取得
  - `updateConfig()` - 設定更新

**成果:**
- ✅ ワークスペースごとの設定管理
- ✅ 設定の永続化
- ✅ デフォルト設定のサポート

#### 3.5.2 タグ設定UI ✅

**実施内容:**

**TagSettingsコンポーネント実装** (`src/components/TagManagement/TagSettings.tsx`):
- タグ入力モード切り替え
  - トグルスイッチUI
  - 現在のモード表示（固定/任意）
  - モード説明文
  - 視覚的フィードバック

- 許可カテゴリ管理（固定モード時のみ表示）
  - カテゴリリスト表示
    - カテゴリ名
    - 削除ボタン
  - カテゴリ追加
    - テキスト入力フィールド
    - Enterキーでクイック追加
    - 重複チェック
    - 空文字チェック

- 設定保存/キャンセル
  - 保存ボタン
    - 処理中表示
    - 成功メッセージ
  - キャンセルボタン
    - 変更を破棄して閉じる

**スタイリング** (`src/components/TagManagement/TagSettings.css`):
- ダークテーマ対応
- トグルスイッチアニメーション
- カード型レイアウト
- レスポンシブデザイン

**App.tsx統合:**
- 「タグ設定」ボタン追加
- タグ管理/タグ設定/タスク表示の切り替え
- 相互排他的な表示制御

**App.css更新:**
- `.workspace-actions` - ボタングループレイアウト
- `.btn-tag-settings` - タグ設定ボタンスタイル
- ホバーエフェクト

**成果:**
- ✅ 固定モード/任意モードの切り替えUI
- ✅ 許可カテゴリの管理UI
- ✅ 設定の永続化
- ✅ 直感的なユーザー体験

### 3.6 UX改善とアプリアイコン設定 ✅

#### 3.6.1 レスポンシブレイアウト対応 ✅

**背景:**
ウィンドウを最大化した際にサイドバーとエディタの幅が固定されているため、画面スペースを有効活用できない問題があった。

**実施内容:**

**CSSレイアウト改善** (`src/App.css`):
- サイドバーを固定幅から可変幅に変更
  - 変更前: `width: 320px`（固定）
  - 変更後: `width: 25%`（可変）
  - 制約: `min-width: 280px` / `max-width: 500px`

- エディタ領域の最適化
  - `flex: 1` - 残りスペースを自動的に使用
  - `min-width: 0` - Flexboxオーバーフロー対策

**レスポンシブデザインの特徴:**
- 小さいウィンドウ（< 1120px幅）: サイドバー最小幅280px
- 通常ウィンドウ（1120px〜2000px）: サイドバー25%幅
- 大きいウィンドウ（> 2000px）: サイドバー最大幅500px

**成果:**
- ✅ ウィンドウサイズに応じた柔軟なレイアウト
- ✅ 画面スペースの有効活用
- ✅ 小さい画面でも使いやすい最小幅保証
- ✅ 大きい画面でもバランスの取れた最大幅制限

#### 3.6.2 Workspace自動読み込み機能 ✅

**背景:**
アプリケーション起動のたびに毎回Workspaceを選択する必要があり、ユーザー体験が煩わしい問題があった。

**実施内容:**

**依存関係追加:**
```toml
# src-tauri/Cargo.toml
tauri-plugin-store = "2"
```

**Tauri Store Plugin統合:**
- プラグイン登録 (`src-tauri/src/lib.rs`)
  ```rust
  .plugin(tauri_plugin_store::Builder::new().build())
  ```

- パーミッション追加 (`src-tauri/capabilities/default.json`)
  ```json
  "store:allow-get",
  "store:allow-set",
  "store:allow-delete",
  "store:allow-save",
  "store:default"
  ```

**StorageService実装** (`src/services/storageService.ts`):
- `saveLastWorkspace(path)` - 最後に開いたワークスペースパスを保存
- `getLastWorkspace()` - 保存されたワークスペースパスを取得
- 永続化先: `settings.json` (Tauri Store)
- プラットフォーム別ストレージパス:
  - Windows: `%APPDATA%\com.tauri.dev\settings.json`
  - macOS: `~/Library/Application Support/com.tauri.dev/settings.json`
  - Linux: `~/.config/com.tauri.dev/settings.json`

**useWorkspaceフック拡張** (`src/hooks/useWorkspace.ts`):
- `loadWorkspaceFromPath()` ヘルパー関数追加
  - ワークスペース読み込み
  - 成功時に自動的にパスを保存

- `useEffect` による自動読み込み
  ```typescript
  useEffect(() => {
    const loadLastWorkspace = async () => {
      const lastPath = await StorageService.getLastWorkspace();
      if (lastPath) {
        console.log('Auto-loading last workspace:', lastPath);
        await loadWorkspaceFromPath(lastPath);
      }
    };
    loadLastWorkspace();
  }, [loadWorkspaceFromPath]);
  ```

**ユーザー体験:**
1. 初回起動: Workspaceを選択（従来通り）
2. 2回目以降: 自動的に前回のWorkspaceを読み込み
3. ワークスペース変更時: 新しいパスが自動保存

**成果:**
- ✅ 起動時の自動Workspace読み込み
- ✅ クロスプラットフォーム対応のストレージ
- ✅ ユーザーアクション不要の自動保存
- ✅ スムーズな起動体験

#### 3.6.3 アプリケーションアイコン設定 ✅

**実施内容:**

**アイコンファイル生成:**
```bash
npm run tauri icon HienMark.png
```

**生成されたアイコン** (`src-tauri/icons/`):
- **Windows用:**
  - `icon.ico` - アプリケーションアイコン
  - `Square*.png` - Windows Store用各種サイズ

- **macOS用:**
  - `icon.icns` - アプリケーションバンドルアイコン

- **マルチプラットフォーム用:**
  - `32x32.png`, `64x64.png` - 小サイズアイコン
  - `128x128.png`, `128x128@2x.png` - 標準サイズアイコン
  - `icon.png` - 汎用アイコン

- **モバイル用（将来対応）:**
  - `android/` - Android各解像度アイコン
  - `ios/` - iOS各サイズアイコン

**デザイン:**
- モチーフ: ツバメ（Swallow） + チェックマーク
- カラー: ネイビーブルー + ライトブルー
- スタイル: モダン、ミニマル
- 背景: 円形グラデーション

**tauri.conf.json設定:**
既存の設定がそのまま使用可能（変更不要）:
```json
"bundle": {
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ]
}
```

**成果:**
- ✅ 全プラットフォーム対応のアイコンセット
- ✅ Tauri自動生成による最適化
- ✅ ブランディング強化
- ✅ プロフェッショナルな外観

### 3.7 UIリサイザー機能とレイアウト改善 ✅

#### 3.7.1 リサイザーコンポーネント実装 ✅

**背景:**
1920pxのモニターでも、固定幅のレイアウトでは画面スペースを有効活用できない問題があった。ユーザーが自由にパネル幅を調整できる機能が必要。

**実施内容:**

**共通Resizerコンポーネント作成** (`src/components/Resizer/`):
- `Resizer.tsx` - ドラッグ可能なリサイザーコンポーネント
  - マウスドラッグによる幅調整
  - 水平方向・垂直方向の両方に対応
  - `onResize` コールバックで親コンポーネントに変更を通知

- `Resizer.css` - リサイザーのスタイリング
  - 4pxの細いバー
  - ホバー時の視覚的フィードバック（色変更）
  - 適切なカーソル表示（`col-resize` / `row-resize`）
  - アクティブ時のダークグレー表示

**技術的実装:**
```typescript
interface ResizerProps {
  onResize: (delta: number) => void;
  direction?: 'horizontal' | 'vertical';
}
```

- `useRef`でドラッグ状態と開始位置を管理
- グローバルな`mousemove`/`mouseup`イベントリスナーでスムーズなドラッグ体験
- `useEffect`で適切なクリーンアップ処理

**成果:**
- ✅ 再利用可能なリサイザーコンポーネント
- ✅ スムーズなドラッグ体験
- ✅ 視覚的フィードバック

#### 3.7.2 サイドバーリサイザー統合 ✅

**実施内容:**

**App.tsx更新:**
- `sidebarWidth` 状態管理（デフォルト320px）
- `handleSidebarResize` ハンドラー実装
  - 最小幅: 280px
  - 最大幅: 600px
  - ドラッグ量をピクセル単位で計算

**レイアウト変更:**
```tsx
<aside className="workspace-sidebar" style={{ width: `${sidebarWidth}px` }}>
  <TaskBrowser ... />
</aside>

<Resizer onResize={handleSidebarResize} direction="horizontal" />

<section className="workspace-content">
  <TaskEditor ... />
</section>
```

**App.css更新:**
- サイドバーの固定幅指定を削除
- `flex-shrink: 0`でリサイズ時の縮小を防止
- インラインスタイルで動的に幅を制御

**成果:**
- ✅ サイドバー幅のドラッグ調整
- ✅ 280px〜600pxの範囲で調整可能
- ✅ 設定が保持される（セッション中）

#### 3.7.3 エディタ/プレビューリサイザー統合 ✅

**実施内容:**

**TaskEditor.tsx更新:**
- `editorWidth` 状態管理（デフォルト50%）
- `handleEditorResize` ハンドラー実装
  - パーセンテージベースの計算
  - 最小幅: 20%
  - 最大幅: 80%

**レイアウト変更:**
```tsx
<div className="editor-pane split" style={{ width: `${editorWidth}%` }}>
  <div ref={editorRef} className="codemirror-container" />
</div>

<Resizer onResize={handleEditorResize} direction="horizontal" />

<div className="preview-pane" style={{ width: `${100 - editorWidth}%` }}>
  <div className="preview-content">...</div>
</div>
```

**TaskEditor.css更新:**
- エディタとプレビューの固定幅（50%）を削除
- `flex-shrink: 0`を追加
- インラインスタイルで動的に幅を制御

**成果:**
- ✅ エディタ/プレビュー比率のドラッグ調整
- ✅ 20%〜80%の範囲で調整可能
- ✅ プレビュー非表示時は自動的に100%表示

#### 3.7.4 パディング最適化 ✅

**背景:**
エディタとプレビュー画面の外側に不要な余白があり、画面スペースが無駄になっていた。

**実施内容:**

**App.css更新:**
```css
.task-editor {
  padding: 0;        /* 2remから削除 */
  height: 100%;      /* 画面いっぱいに表示 */
}
```

**TaskEditor.css更新:**
```css
.preview-content {
  flex: 1;
  padding: 1rem;     /* 読みやすさのため最小限の余白 */
  color: #1f2937;
}
```

**成果:**
- ✅ エディタ画面が画面いっぱいに表示
- ✅ プレビュー内容には適度な余白（1rem）を維持
- ✅ 最大限の作業スペース確保

#### 3.7.5 Mermaidプレビュー修正 ✅

**背景:**
Mermaid記法を入れてもプレビュー画面にダイアグラムが表示されない問題が発生。

**問題の原因:**
JavaScriptの正規表現オブジェクトをグローバルフラグ（`/g`）付きで複数回使用すると、`lastIndex`プロパティが更新されてしまい、2回目の`replace()`が正しく動作しない。

**実施内容:**

**TaskEditor.tsx修正** (`src/components/TaskEditor/TaskEditor.tsx:145-148`):
```typescript
// 修正前（バグ）
const contentWithoutMermaid = contentWithoutFrontMatter.replace(
  mermaidRegex,  // ← 既に使用済みの正規表現オブジェクト
  ''
);

// 修正後（正常動作）
const contentWithoutMermaid = contentWithoutFrontMatter.replace(
  /```mermaid\n[\s\S]*?\n```/g,  // ← 新しい正規表現オブジェクト
  ''
);
```

**技術的詳細:**
1. Mermaidブロックの検出: 1つ目の正規表現で`exec()`を繰り返し呼び出し
2. Mermaidブロックの除去: 新しい正規表現オブジェクトで`replace()`実行
3. これにより`lastIndex`の状態が干渉しなくなる

**成果:**
- ✅ Mermaidダイアグラムが正常にプレビュー表示
- ✅ 複数のMermaidブロックにも対応
- ✅ エラーハンドリングによるフレンドリーなエラー表示

**対応ダイアグラム:**
- フローチャート (`graph TD`, `graph LR`)
- シーケンス図 (`sequenceDiagram`)
- ガントチャート (`gantt`)
- クラス図 (`classDiagram`)
- ER図 (`erDiagram`)
- パイチャート (`pie`)
- その他全てのMermaidダイアグラムタイプ

## ビルド結果

**フロントエンド:**
```bash
✅ npm run build 成功 (6.00秒)
✅ TypeScriptコンパイル成功
✅ 全リサイザー機能統合完了
```

**Rustバックエンド:**
```bash
✅ 変更なし（フロントエンドのみの更新）
```

## 成果サマリー

**実装された全機能:**

1. **タグ解析・集約** (3.1) ✅
   - 自動タグインデックス生成
   - リアルタイム更新

2. **タグ選択UI** (3.2) ✅
   - CodeMirrorオートコンプリート
   - Front Matter内での補完

3. **タグ管理画面** (3.3) ✅
   - タグ一覧表示
   - カテゴリ別統計

4. **タグ操作** (3.4) ✅
   - タグのリネーム（一括更新）
   - タグの削除（値/カテゴリ）

5. **タグモード管理** (3.5) ✅
   - 固定モード/任意モード
   - 許可カテゴリ管理

6. **UX改善** (3.6) ✅
   - レスポンシブレイアウト
   - 自動ワークスペース読み込み
   - アプリケーションアイコン

7. **UIリサイザー** (3.7) ✅
   - サイドバー幅調整
   - エディタ/プレビュー比率調整
   - Mermaidプレビュー修正

8. **タグテンプレート機能** (3.8) ✅
   - 既存タスクへのテンプレート適用
   - 新規タスク作成時のテンプレート選択
   - テンプレート適用モード選択

9. **タグ設定システム** (3.9) ✅
   - タグ設定システムの構築
   - テンプレート編集画面での許容値設定
   - テンプレート連動型UI
   - 右ペインデザインの統一と改善

**新規作成ファイル（Phase 3全体）:**
```
src-tauri/src/service/tag_service.rs          # タグ操作サービス
src-tauri/src/commands/tag_commands.rs         # タグ操作コマンド
src-tauri/src/models/tag_config.rs            # タグ設定モデル
src/services/tagService.ts                     # タグAPIクライアント
src/services/workspaceConfigService.ts         # 設定APIクライアント
src/services/storageService.ts                 # ローカルストレージサービス
src/hooks/useTags.ts                           # タグ管理フック
src/editor/extensions/tagAutocomplete.ts      # タグ補完拡張
src/components/TagManagement/TagManager.tsx    # タグ管理UI
src/components/TagManagement/TagManager.css   # タグ管理スタイル
src/components/TagManagement/TagSettings.tsx  # タグ設定UI
src/components/TagManagement/TagSettings.css   # タグ設定スタイル
src/components/TemplateManagement/TagConfigEditor.tsx  # タグ設定編集UI
src/components/TemplateManagement/TagConfigEditor.css  # タグ設定編集スタイル
src/components/TemplateSelector.tsx           # テンプレート選択モーダル
src/components/TemplateSelector.css           # テンプレート選択スタイル
src/components/Resizer/Resizer.tsx            # リサイザーコンポーネント
src/components/Resizer/Resizer.css            # リサイザースタイル
src/components/Resizer/index.ts               # エクスポート
src/utils/tagValidation.ts                    # バリデーション機能
src-tauri/icons/*                             # アプリケーションアイコン一式
```

**更新ファイル（Phase 3全体）:**
```
src-tauri/src/models/tag.rs                    # TagIndex, TagCategory
src-tauri/src/models/workspace.rs              # WorkspaceConfig拡張
src-tauri/src/models/mod.rs                    # モジュール登録
src-tauri/src/service/mod.rs                   # サービス登録
src-tauri/src/commands/mod.rs                  # コマンド登録
src-tauri/src/commands/workspace_commands.rs   # 設定コマンド追加
src-tauri/src/lib.rs                           # 全コマンド登録
src-tauri/src/parser/frontmatter.rs           # YAML形式統一
src-tauri/src/models/task.rs                  # TagValueのSerialize実装
src/components/TaskEditor/TaskEditor.tsx       # タグ補完統合、Mermaid修正、テンプレート適用
src/components/TaskEditor/TaskEditor.css       # テンプレートUIスタイル
src/components/TaskEditor/TagEditorPanel.tsx   # テンプレート連動型UI
src/components/TaskEditor/TagEditorPanel.css   # タグ編集スタイル
src/components/TemplateManagement/TemplateEditor.tsx   # 設定編集統合
src/components/TemplateManagement/TemplateEditor.css   # UI改善
src/App.tsx                                    # タグ管理/設定統合、テンプレート選択
src/App.css                                    # UIスタイル更新、レスポンシブ
src/hooks/useWorkspace.ts                     # 自動読み込み機能、設定更新機能
src/services/workspaceService.ts               # 設定API
src/types/task.ts                              # TypeScript型定義
src-tauri/Cargo.toml                           # Store plugin依存関係
src-tauri/capabilities/default.json            # Storeパーミッション
```

**ユーザー体験の向上:**

1. **柔軟なレイアウト**
   - サイドバー: 280px〜600pxで自由に調整
   - エディタ/プレビュー: 20/80〜80/20の比率で調整
   - ドラッグ操作で直感的に幅を変更

2. **画面スペースの最大活用**
   - 外側の余白を削除
   - 1920pxモニターでも快適に作業可能
   - 最大限のエディタ/プレビュー領域

3. **視覚的フィードバック**
   - リサイザーのホバー時に色が変化
   - 適切なカーソル表示
   - スムーズなドラッグ体験

4. **Mermaidサポート**
   - タスク内に視覚的なダイアグラムを追加可能
   - 依存関係や進捗の可視化
   - リアルタイムプレビュー

**画面サイズ別の動作例（1920px画面）:**

| 設定 | サイドバー | エディタ | プレビュー |
|------|-----------|---------|-----------|
| デフォルト | 320px | 800px (50%) | 800px (50%) |
| サイドバー最小 | 280px | 820px (50%) | 820px (50%) |
| サイドバー最大 | 600px | 660px (50%) | 660px (50%) |
| エディタ重視 | 320px | 1280px (80%) | 320px (20%) |
| プレビュー重視 | 320px | 320px (20%) | 1280px (80%) |

これらの実装により、HienMarkは完全なタグベース管理システムを備えたタスク管理エディタとなり、高解像度モニターでも快適に使用でき、ユーザーの好みに合わせたレイアウトカスタマイズが可能になりました。

### 3.8 タグテンプレート機能 ✅

#### 3.8.1 タスクエディターでのテンプレート挿入機能 ✅

**背景:**
作成したタグテンプレートを既存のタスクに適用したり、新規タスク作成時に設定できる機能が必要だった。

**実施内容:**

**TaskEditor.tsx拡張:**
- `useTemplates`フックの統合
- テンプレート適用機能（`handleApplyTemplate`）
  - 現在のエディター内容を取得
  - `applyToExistingTask`でテンプレートを適用
  - エディターの内容を更新
  - プレビューを再生成
- テンプレート選択UI
  - ヘッダーに「テンプレート適用」ボタンを追加
  - ドロップダウンメニューでテンプレート一覧表示
  - テンプレート名と説明を表示
  - クリックアウトサイドとEscキーでメニューを閉じる

**TaskEditor.css更新:**
- `.btn-template` - テンプレートボタンのスタイル
- `.template-menu-container` - ドロップダウンコンテナ
- `.template-dropdown` - ドロップダウンメニュー
- `.template-item` - テンプレート項目のスタイル
- `.template-name`, `.template-description` - テキストスタイル
- `.template-empty` - 空状態の表示

**技術的実装:**
```typescript
const handleApplyTemplate = async (templateName: string) => {
  const currentContent = viewRef.current.state.doc.toString();
  const newContent = await applyToExistingTask(templateName, currentContent, false);
  
  const newState = EditorState.create({
    doc: newContent,
    extensions: viewRef.current.state.facet(EditorState.extensions),
  });
  
  viewRef.current.setState(newState);
  updatePreview(newContent);
  setIsDirty(true);
  setShowTemplateMenu(false);
};
```

**成果:**
- ✅ 既存タスクへのテンプレート適用
- ✅ ドロップダウンメニューでの直感的な選択
- ✅ リアルタイムでのエディター内容更新
- ✅ キーボードショートカット対応

#### 3.8.2 新規タスク作成時のテンプレート設定機能 ✅

**実施内容:**

**TemplateSelectorコンポーネント作成** (`src/components/TemplateSelector.tsx`):
- テンプレート選択モーダルUI
- ラジオボタンでテンプレート選択
  - 空のタスクオプション
  - 各テンプレートオプション
  - デフォルトテンプレートの表示
- テンプレート情報の表示
  - テンプレート名
  - 説明文
  - タグ数
- キーボードショートカット
  - Enter: 選択確定
  - Esc: キャンセル

**TemplateSelector.css作成:**
- モーダルオーバーレイのスタイル
- カード型レイアウト
- ラジオボタンのカスタムスタイル
- ホバーエフェクト
- ダークテーマ対応

**App.tsx統合:**
- `useTemplates`フックの追加
- テンプレート選択状態管理
  - `showTemplateSelector` - モーダル表示状態
  - `pendingTaskId` - 作成待ちのタスクID
- 新規タスク作成フローの改善
  - テンプレートが利用可能な場合のみモーダル表示
  - テンプレートがない場合は空のタスクで作成
- テンプレート選択ハンドラー
  - `handleTemplateSelect` - テンプレート適用処理
  - `handleTemplateSelectorCancel` - キャンセル処理

**技術的実装:**
```typescript
const handleTaskCreate = async () => {
  const taskId = prompt('Enter task ID (filename):');
  if (!taskId) return;

  if (templates.length > 0) {
    setPendingTaskId(taskId);
    setShowTemplateSelector(true);
  } else {
    const initialContent = '# New Task\n\nStart writing...';
    const newTask = await createTask(taskId, initialContent);
    if (newTask) {
      setSelectedTaskId(taskId);
    }
  }
};
```

**成果:**
- ✅ 新規タスク作成時のテンプレート選択
- ✅ 美しいモーダルUI
- ✅ デフォルトテンプレートの自動選択
- ✅ キーボードナビゲーション対応

#### 3.8.3 ユーザー体験の向上 ✅

**実装された機能:**

1. **既存タスクへのテンプレート適用**
   - タスクエディターの「テンプレート適用」ボタン
   - ドロップダウンメニューでテンプレート選択
   - リアルタイムでの内容更新

2. **新規タスク作成時のテンプレート設定**
   - テンプレート選択モーダル
   - 空のタスクまたはテンプレート選択
   - デフォルトテンプレートの表示

3. **直感的なUI**
   - クリックアウトサイドでメニューを閉じる
   - Escキーでキャンセル
   - Enterキーで選択確定
   - ホバーエフェクトと視覚的フィードバック

**新規作成ファイル:**
```
src/components/TemplateSelector.tsx      # テンプレート選択モーダル
src/components/TemplateSelector.css      # モーダルスタイル
```

**更新ファイル:**
```
src/components/TaskEditor/TaskEditor.tsx    # テンプレート適用機能
src/components/TaskEditor/TaskEditor.css    # テンプレートUIスタイル
src/App.tsx                                  # テンプレート選択統合
```

**成果:**
- ✅ タグテンプレートの効率的な適用
- ✅ 新規タスク作成時のテンプレート設定
- ✅ 直感的なユーザーインターフェース
- ✅ キーボードショートカット対応

## 3.5 テンプレート適用機能の改善 ✅

**実施日:** 2025-10-25  
**ステータス:** ✅ 完了

### 問題と解決

**問題1: テンプレート適用ボタンのグレーアウト**
- テンプレートが存在する場合でもボタンがグレーアウトして見える
- `workspacePath`がPathBufオブジェクトの場合に文字列変換が必要

**問題2: YAML配列形式の不統一**
- 新規作成時: `status:\n- open\n- inprogress` (リスト形式)
- 既存タスク適用時: `status: [open, inprogress]` (配列形式)

**問題3: テンプレート適用モードの違い**
- 新規作成時: `applyTemplateToNewTask` (上書きモード)
- 既存タスク適用時: `applyTemplateToExistingTask` (マージモード、既存タグ優先)

### 実装した修正

**1. テンプレート適用ボタンの改善**
```typescript
// workspacePathの型変換
const workspacePathString = typeof workspacePath === 'string' 
  ? workspacePath 
  : (workspacePath as any)?.toString() || null;

// UI改善
<button
  className="btn-template"
  disabled={templates.length === 0}
  title={`テンプレート数: ${templates.length}${templates.length === 0 ? ' (テンプレートがありません)' : ''}`}
>
  テンプレート適用 {templates.length > 0 && `(${templates.length})`}
</button>
```

**2. 適用モード選択機能**
```typescript
const [templateApplyMode, setTemplateApplyMode] = useState<'merge' | 'overwrite'>('overwrite');

// テンプレートドロップダウンメニューに適用モード選択を追加
<div className="template-mode-selector">
  <label className="template-mode-label">
    <input type="radio" name="templateMode" value="overwrite" checked={templateApplyMode === 'overwrite'} />
    <span>上書き</span>
  </label>
  <label className="template-mode-label">
    <input type="radio" name="templateMode" value="merge" checked={templateApplyMode === 'merge'} />
    <span>マージ</span>
  </label>
</div>
```

**3. YAML形式の統一**
```rust
// FrontMatterParser::serialize の改善
TagValue::Array(arr) => {
    if arr.is_empty() {
        yaml_lines.push(format!("{}: []", key));
    } else {
        yaml_lines.push(format!("{}:", key));
        for item in arr {
            yaml_lines.push(format!("- {}", item));
        }
    }
}
```

**4. テンプレート項目のUI改善**
```css
.template-name {
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
  line-height: 1.2;
  color: #ffffff; /* 明示的な白色 */
}

.template-item:hover .template-name {
  color: #ffffff;
}

.template-item:hover .template-description {
  color: #cccccc;
}
```

### 技術的詳細

**修正ファイル:**
```
src/components/TaskEditor/TaskEditor.tsx    # テンプレート適用機能の改善
src/components/TaskEditor/TaskEditor.css    # UI改善
src-tauri/src/parser/frontmatter.rs        # YAML形式統一
src-tauri/src/models/task.rs               # TagValueのSerialize実装
```

**動作の統一:**
- **上書きモード**: 既存のタグをテンプレートのタグで完全に置き換え
- **マージモード**: 既存のタグを保持し、テンプレートのタグを追加
- **YAML形式**: すべてリスト形式（`- item`）で統一

**成果:**
- ✅ テンプレート適用ボタンの視覚的改善
- ✅ 適用モードの選択機能
- ✅ YAML配列形式の統一
- ✅ 新規作成時と既存タスク適用時の動作統一
- ✅ ユーザビリティの向上

### 3.9 タグ設定システムとテンプレート連動機能 ✅

#### 3.9.1 タグ設定システムの構築 ✅

**背景:**
タグのエイリアス（表示名）と許容値の設定機能を実装し、タグ編集画面をテンプレート連動型にする必要があった。

**実施内容:**

**Rustバックエンド実装:**
- `TagConfig` モデル (`src-tauri/src/models/tag_config.rs`)
  - `AllowedValueType` enum: DirectInput, List, Pattern, Range
  - `TagConfig` struct: エイリアス、タグ型、許容値、デフォルト値、必須フラグ、説明
  - `TagConfigCollection` struct: タグ設定のコレクション管理
  - デフォルト設定の自動作成（status, priority, tags, assignee, due_date）

- `WorkspaceConfig` 拡張 (`src-tauri/src/models/workspace.rs`)
  - `tag_configs: TagConfigCollection` フィールド追加
  - デフォルト設定の初期化

**フロントエンド実装:**
- TypeScript型定義更新 (`src/types/task.ts`)
  - `AllowedValueType` 型定義
  - `TagConfig` インターフェース
  - `TagConfigCollection` インターフェース

- `TagEditorPanel` コンポーネント更新 (`src/components/TaskEditor/TagEditorPanel.tsx`)
  - テンプレート連動型UI生成
  - タグ設定に基づく動的UI生成
  - エイリアス表示機能
  - 説明文表示機能

**技術的詳細:**
```rust
// 許容値の設定方法
pub enum AllowedValueType {
    DirectInput,                    // 直接入力（自由な値）
    List(Vec<String>),             // リスト設定（選択肢の定義）
    Pattern(String),               // パターン設定（正規表現による制約）
    Range { min: f64, max: f64 },  // 範囲設定（数値の範囲制約）
}

// タグの設定情報
pub struct TagConfig {
    pub alias: Option<String>,           // エイリアス（表示名）
    pub tag_type: TagType,               // タグの型
    pub allowed_value_type: Option<AllowedValueType>, // 許容値の設定
    pub default_value: Option<TagValue>, // デフォルト値
    pub required: bool,                  // 必須かどうか
    pub description: Option<String>,     // 説明文
}
```

**成果:**
- ✅ タグ設定システムの構築
- ✅ エイリアス機能の実装
- ✅ 許容値設定の種類定義
- ✅ デフォルト設定の自動作成

#### 3.9.2 タグテンプレート編集画面での許容値設定機能 ✅

**実施内容:**

**TagConfigEditorコンポーネント作成** (`src/components/TemplateManagement/TagConfigEditor.tsx`):
- タグ設定編集モーダルUI
- エイリアス設定機能
- 説明設定機能
- 必須フラグ設定
- 許容値タイプ選択（ラジオボタン）
  - 直接入力
  - リスト設定（選択肢の定義）
  - パターン設定（正規表現）
  - 範囲設定（数値の範囲）
- 動的UI生成
  - リスト設定: 選択肢の追加・削除・編集
  - パターン設定: 正規表現入力
  - 範囲設定: 最小値・最大値入力

**TemplateEditor統合** (`src/components/TemplateManagement/TemplateEditor.tsx`):
- 既存タグの「設定」ボタン追加
- 新規タグ追加フォームの「設定」ボタン追加
- タグ設定の保存・読み込み機能
- ワークスペース設定の更新機能

**ワークスペース設定の永続化:**
- `useWorkspace` フック拡張 (`src/hooks/useWorkspace.ts`)
  - `updateWorkspaceConfig` 関数追加
- `workspaceService` 拡張 (`src/services/workspaceService.ts`)
  - `updateWorkspaceConfig` API追加

**バリデーション機能** (`src/utils/tagValidation.ts`):
- `validateTagValue` - 単一タグ値の検証
- `validateTagValues` - 複数タグ値の一括検証
- `hasValidationErrors` - エラーの有無をチェック
- `getValidationErrors` - エラーメッセージを取得

**UIの特徴:**
```
┌─────────────────────────────────────────────────────────┐
│ タグ設定: status                                    [×] │
├─────────────────────────────────────────────────────────┤
│ エイリアス（表示名）                                    │
│ [ステータス]                                           │
│                                                         │
│ 説明                                                    │
│ [タスクの現在の状態]                                    │
│                                                         │
│ ☑ 必須タグ                                             │
│                                                         │
│ 許容値の設定                                            │
│ ○ 直接入力（自由な値）                                 │
│ ● リスト設定（選択肢の定義）                           │
│ ○ パターン設定（正規表現）                             │
│ ○ 範囲設定（数値の範囲）                               │
│                                                         │
│ 選択肢のリスト                                          │
│ [open] [削除]                                          │
│ [inprogress] [削除]                                     │
│ [delay] [削除]                                         │
│ [pending] [削除]                                       │
│ [close] [削除]                                         │
│ [+ 選択肢を追加]                                       │
│                                                         │
│                    [保存] [キャンセル]                   │
└─────────────────────────────────────────────────────────┘
```

**成果:**
- ✅ タグ設定編集モーダルUI
- ✅ 4つの許容値設定方法
- ✅ 動的UI生成
- ✅ ワークスペース設定の永続化
- ✅ バリデーション機能

#### 3.9.3 テンプレート編集画面でのタグ設定表示機能 ✅

**実施内容:**

**テンプレート編集画面の拡張** (`src/components/TemplateManagement/TemplateEditor.tsx`):
- タグ一覧テーブルの拡張
  - エイリアス表示: `status (ステータス)`
  - 設定情報表示: `選択肢: 5個`, `パターン制約あり`, `範囲: 1-10`
- 視覚的改善
  - エイリアスをグレー色で表示
  - 設定情報を青色で表示
  - イタリック体で設定情報を表示

**CSS更新** (`src/components/TemplateManagement/TemplateEditor.css`):
- `.tag-alias` - エイリアス表示のスタイル
- `.tag-config-info` - 設定情報表示のスタイル
- `.btn-secondary-small` - 設定ボタンのスタイル

**ユーザー体験の向上:**
1. **直感的な操作**: 各タグの「設定」ボタンで簡単に設定編集
2. **新規タグ作成**: テンプレート編集画面から直接新規タグ設定を作成
3. **設定情報の可視化**: タグの設定内容が一目で分かる
4. **リアルタイム保存**: 設定変更が即座にワークスペースに保存
5. **エラーハンドリング**: 適切なエラーメッセージと成功通知

**成果:**
- ✅ タグ設定情報の可視化
- ✅ エイリアス表示機能
- ✅ 設定情報の色分け表示
- ✅ 直感的な設定編集アクセス

#### 3.9.4 統合されたタグ編集システム ✅

**実装された機能:**

1. **タグ設定システム**
   - エイリアス機能（`status` → `ステータス`）
   - 4つの許容値設定方法
   - デフォルト値設定
   - 必須フラグ設定
   - 説明文設定

2. **テンプレート連動型UI**
   - タグ設定に基づく動的UI生成
   - Select型 → ドロップダウン
   - MultiSelect型 → チェックボックス
   - String型 → テキスト入力
   - Date型 → 日付選択
   - Number型 → 数値入力
   - Boolean型 → チェックボックス

3. **テンプレート編集画面での設定管理**
   - 既存タグの設定編集
   - 新規タグの設定作成
   - 設定情報の可視化
   - ワークスペース設定の永続化

4. **バリデーション機能**
   - 許容値に基づく値の検証
   - エラーメッセージの表示
   - 不正な値の入力を防止

**新規作成ファイル:**
```
src-tauri/src/models/tag_config.rs                    # タグ設定モデル
src/components/TemplateManagement/TagConfigEditor.tsx  # タグ設定編集UI
src/components/TemplateManagement/TagConfigEditor.css  # タグ設定編集スタイル
src/utils/tagValidation.ts                             # バリデーション機能
```

**更新ファイル:**
```
src-tauri/src/models/workspace.rs                     # WorkspaceConfig拡張
src-tauri/src/models/mod.rs                           # モジュール登録
src/types/task.ts                                     # TypeScript型定義
src/components/TaskEditor/TagEditorPanel.tsx          # テンプレート連動型UI
src/components/TaskEditor/TaskEditor.tsx               # タグ設定統合
src/components/TemplateManagement/TemplateEditor.tsx   # 設定編集統合
src/components/TemplateManagement/TemplateEditor.css   # UI改善
src/hooks/useWorkspace.ts                             # 設定更新機能
src/services/workspaceService.ts                      # 設定API
```

**成果:**
- ✅ 完全に統合されたタグ設定システム
- ✅ テンプレート連動型のタグ編集UI
- ✅ 直感的な設定管理インターフェース
- ✅ 強力なバリデーション機能
- ✅ ワークスペース設定の永続化

#### 3.9.5 右ペインデザインの統一と改善 ✅

**背景:**
タグ設定編集画面が右ペインとして表示されるようになったが、背景色が黒で文字が見づらく、デザインの統一感が欠けていた。

**実施内容:**

**TagConfigEditor.css の全面改修:**
- **背景色の統一**
  - 右ペイン: 黒背景（`#252526`）→ 白背景（`var(--bg-primary, #ffffff)`）
  - ヘッダー: ダークグレー（`#2d2d30`）→ ライトグレー（`var(--bg-secondary, #f8f9fa)`）
  - フッター: ダークグレー（`#2d2d30`）→ ライトグレー（`var(--bg-secondary, #f8f9fa)`）

- **文字色の改善**
  - メイン文字: 白（`#cccccc`）→ ダークグレー（`var(--text-primary, #333333)`）
  - ラベル: 白（`#cccccc`）→ ダークグレー（`var(--text-primary, #333333)`）
  - ヒント文字: グレー（`#858585`）→ セカンダリグレー（`var(--text-secondary, #6c757d)`）

- **フォーム要素の統一**
  - 入力フィールド: ダーク背景（`#3c3c3c`）→ 白背景（`var(--bg-primary, #ffffff)`）
  - ボーダー: ダークグレー（`#5a5a5a`）→ ライトグレー（`var(--border-color, #e0e0e0)`）
  - フォーカス色: 固定色（`#0e639c`）→ CSS変数（`var(--primary-color, #0e639c)`）

- **ボタンの統一**
  - セカンダリボタン: ダークグレー（`#3c3c3c`）→ ライトグレー（`var(--bg-tertiary, #e9ecef)`）
  - プライマリボタン: CSS変数を使用（`var(--primary-color, #0e639c)`）
  - 危険ボタン: CSS変数を使用（`var(--danger-color, #dc3545)`）

- **スクロールバーの統一**
  - トラック: ダークグレー（`#2d2d30`）→ ライトグレー（`var(--bg-secondary, #f8f9fa)`）
  - サム: ダークグレー（`#5a5a5a`）→ ライトグレー（`var(--border-color, #e0e0e0)`）

**技術的詳細:**
```css
/* 修正前（ダークテーマ） */
.tag-config-panel {
  background: #252526;
  border-left: 1px solid #3c3c3c;
}

.tag-config-header {
  background: #2d2d30;
  border-bottom: 1px solid #3c3c3c;
}

/* 修正後（ライトテーマ統一） */
.tag-config-panel {
  background: var(--bg-primary, #ffffff);
  border-left: 1px solid var(--border-color, #e0e0e0);
}

.tag-config-header {
  background: var(--bg-secondary, #f8f9fa);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}
```

**改善されたデザイン:**
```
┌─────────────────────────────────────────────────────────┐
│ テンプレート編集                                    [×] │
├──────────────────────────────┬──────────────────────────┤
│ テンプレート設定            │ タグ設定: status     [×] │
│                              │                          │
│ テンプレート名               │ タグキー *               │
│ [default]                    │ [status]                 │
│                              │                          │
│ 説明                         │ エイリアス               │
│ [デフォルトテンプレート]     │ [ステータス]             │
│                              │                          │
│ タグ設定                     │ ☑ 必須タグ              │
│ ┌───────────────────────┐   │                          │
│ │ status (ステータス)     │   │ 許容値の設定            │
│ │ 選択肢: 5個   [設定][削除]│   │ ● リスト設定           │
│ └───────────────────────┘   │                          │
│                              │ 選択肢のリスト          │
│ + タグ追加                   │ [open] [削除]            │
│                              │ [inprogress] [削除]      │
│ [更新] [キャンセル]          │ [+ 選択肢を追加]        │
│                              │                          │
│                              │ [保存] [キャンセル]      │
└──────────────────────────────┴──────────────────────────┘
```

**成果:**
- ✅ 視認性の向上: 黒背景から白背景に変更し、文字がはっきり見えるように
- ✅ 統一感: テンプレート編集画面と同じライトテーマを使用
- ✅ CSS変数: テーマの一貫性を保つため、CSS変数を使用
- ✅ アクセシビリティ: コントラスト比が改善され、読みやすさが向上
- ✅ ブランディング: アプリケーション全体のデザインと統一

### 3.10 UI改善とアイコン化 ✅

#### 3.10.1 エディタ画面のFront Matter非表示機能 ✅

**背景:**
タグ編集パネルがあるため、デフォルトではFront Matterヘッダを非表示にし、必要に応じて表示できる機能が必要だった。

**実施内容:**

**TaskEditor.tsx拡張:**
- `showFrontMatter`状態管理（デフォルト: false）
- `toggleFrontMatterDisplay`関数実装
  - Front Matterの表示/非表示を動的に切り替え
  - CodeMirrorエディタの内容をリアルタイムで更新
  - プレビューも連動して更新
- エディタ初期化時の変更
  - デフォルトで本文のみを表示（Front Matter非表示）
  - `task.content`のみを初期コンテンツとして設定

**TagEditorPanel.tsx拡張:**
- 新しいprops追加
  - `onToggleFrontMatter?: () => void` - Front Matter表示切り替えコールバック
  - `showFrontMatter?: boolean` - 現在の表示状態
- UI追加
  - ヘッダーに「FM表示」/「FM非表示」ボタンを追加
  - ボタンの状態に応じてテキストが変化

**CSS更新:**
- `.btn-toggle-frontmatter` - 新しいボタンのスタイル
- `.tag-panel-actions` - ボタンを横並びに配置するレイアウト

**成果:**
- ✅ デフォルトでFront Matter非表示
- ✅ タグ編集パネルから表示切り替え可能
- ✅ リアルタイムでのエディタ内容更新
- ✅ 直感的なユーザーインターフェース

#### 3.10.2 ボタンのアイコン化 ✅

**背景:**
エディタ画面のボタンをテキストからアイコンに変更し、より洗練された見た目にする必要があった。

**実施内容:**

**タグ表示/非表示ボタンのアイコン化:**
- `tagedit.png`アイコンファイルを`public/tagedit.png`に配置
- ボタン内容をテキスト「タグ表示/タグ非表示」から`<img>`タグに変更
- アイコンサイズ: 32x32px
- 状態に応じた明るさ調整
  - タグパネル非表示時: `opacity: 0.6`（暗く）
  - タグパネル表示時: `opacity: 1`（明るく）
  - スムーズなトランジション（0.2秒）

**保存ボタンのアイコン化:**
- `save.png`アイコンファイルを`public/save.png`に配置
- ボタン内容をテキスト「保存 (Ctrl+S)」から`<img>`タグに変更
- アイコンサイズ: 32x32px
- `title`属性でツールチップを追加

**CSS最適化:**
- 両ボタンのパディングを`0.5rem 0.25rem`に統一
- `display: flex`でアイコンを中央配置
- アイコンの色は元の色のまま保持（フィルター適用なし）

**成果:**
- ✅ タグボタンのアイコン化と状態表示
- ✅ 保存ボタンのアイコン化
- ✅ 統一されたボタンデザイン
- ✅ コンパクトで洗練された見た目

#### 3.10.3 タグ編集パネルのタイトル色修正 ✅

**背景:**
タグ編集パネルのタイトル「タグ編集」が黒色で背景が暗いため、視認性が悪い問題があった。

**実施内容:**

**CSS修正:**
- `src/components/TagManagement/TagManager.css`
- `src/components/TagManagement/TagSettings.css`
- `src/components/TaskEditor/TagEditorPanel.css`

**修正内容:**
```css
.tag-manager .tag-manager-header h2,
.tag-settings .tag-settings-header h2,
.tag-editor-panel .tag-panel-header h3 {
  color: #d4d4d4 !important;
  text-align: left !important;
}
```

**成果:**
- ✅ タイトル文字の視認性向上
- ✅ ダークテーマでの適切なコントラスト
- ✅ 統一されたタイトルスタイル

### 3.11 配列タグ形式の統一 ✅

#### 3.11.1 YAML配列形式の不統一問題解決 ✅

**背景:**
新規タスク作成時とテンプレート適用時で配列タグの表示形式が異なる問題があった。
- 新規作成時: `status: [open, inprogress, delay, pending, close]`
- テンプレート適用時: `status:\n- open\n- inprogress\n- delay\n- pending\n- close`

**実施内容:**

**Rustバックエンド修正:**
- `src-tauri/src/parser/frontmatter.rs`の`serialize`メソッド修正
- `src-tauri/src/models/task.rs`の`TagValue::serialize`実装確認

**修正内容:**
```rust
// FrontMatterParser::serialize の修正
TagValue::Array(arr) => {
    if arr.is_empty() {
        yaml_lines.push(format!("{}: []", key));
    } else {
        let array_str = format!("[{}]", arr.join(", "));
        yaml_lines.push(format!("{}: {}", key, array_str));
    }
}
```

**成果:**
- ✅ 配列タグ形式の統一（`[item1, item2, item3]`形式）
- ✅ 新規作成時とテンプレート適用時の一貫性
- ✅ ユーザー体験の向上

## 次のステップ

Phase 4では、これらのタグシステムとテンプレート機能を活用した分析ダッシュボードの実装に進みます。

---

**最終更新:** 2025-10-25  
**開発者:** Claude Code + User

### 3.12 �^�O�����̃h���b�O&�h���b�v�@�\ ?

#### 3.12.1 ����������Tauri DnD���̔��� ??

**�w�i:**
�^�O�ҏW�p�l���Ń^�O�̏�����ύX�ł���悤�ɂ��邽�߁A�h���b�O&�h���b�v�@�\�̎������K�v�������B

**���{���e:**

**TagEditorPanel.tsx:**
- �h���b�O&�h���b�v�C�x���g�n���h���̎���
  - handleDragStart: �h���b�O�J�n���̏���
  - handleDragEnd: �h���b�O�I�����̏���  
  - handleDropToZone: �h���b�v�]�[���ւ̃h���b�v����
- �h���b�v�]�[���̃����_�����O
  - �^�O�t�B�[���h�ԂɃh���b�v�]�[����z�u
  - �h���b�O���Ɏ��o�I�t�B�[�h�o�b�N�i���n�C���C�g�j
- �^�O�t�B�[���h�S�̂�draggable�ɐݒ�
  - �����̓h���b�O�n���h���i??�j�̂�draggable���������A�C�x���g�����΂��Ȃ���肪����S�̂ɕύX

**TaskEditor.tsx:**
- handleTagReorder�֐��̎���
  - �^�O�����̕ύX���󂯎��
  - Front Matter��V���������ōč\�z
  - CodeMirror�G�f�B�^�̓��e���X�V
- handleSave��Front Matter�p�[�T�[�g��
  - YAML�z���2�̌`���ɑΉ�
    - �C�����C���`��: tags: [item1, item2]
    - ���X�g�`��: tags:\n- item1\n- item2

**CSS�X�V:**
- .drop-zone: �h���b�v�]�[���̃X�^�C��
- .tag-field: cursor: grab�Ńh���b�O�\�ł��邱�Ƃ����o�I�ɕ\��
- .tag-field.dragging: �h���b�O���̃^�O�t�B�[���h�𔼓�����

**�����������:**
- ? handleDragStart��handleDragEnd�͔���
- ? dataTransfer.setData()������
- ? onDragOver��onDrop���S�����΂��Ȃ�
- ? �h���b�O�C���[�W���\������Ȃ�

#### 3.12.2 Tauri WebView��DnD�u���b�N���̉��� ?

**���{�����̓���:**

3�̎�v�Ȍ���������:

1. **Tauri�̃O���[�o���h���b�O&�h���b�v�u���b�N**
   - �Z�L�����e�B�ړI��HTML5 DnD������������Ă���
   - WebView2/WKWebView��dragover/drop�C�x���g��j�~

2. **CodeMirror�̃C�x���g�C���^�[�Z�v�g**  
   - .codemirror-container���h���b�O�C�x���g���z��
   - drop-zone��DOM��ɑ��݂��邪�ACodeMirror���O�ʂ𕢂��Ă���
   - onMouseEnter�͓��삷�邪�AonDragOver�͓͂��Ȃ�

3. **setDragImage()�̍폜�^�C�~���O**
   - WebView���ł͑��폜����ƃC���[�W��������

**��������������:**

**�@ index.html�ɃO���[�o��DnD�u���b�N�����X�N���v�g��ǉ�**
**�A setDragImage()�̍폜��150ms�x��**  
**�B drop-zone��CSS�œK���ipointer-events: auto, z-index: 10�j**

**����:**
- ? Tauri��DnD�u���b�N����
- ? �h���b�O�C���[�W�̕\��
- ? drop-zone�̊m���ȃC�x���g��M

**���̃X�e�b�v:**
- CodeMirror�̃C�x���g�C���^�[�Z�v�g���̉������K�v
- �h���b�O���̂�CodeMirror��pointer-events: none�ɂ��������\��

---

**�ŏI�X�V:** 2025-10-26

### 3.12 タグ順序のドラッグ&ドロップ機能 ✅

#### 3.12.1 初期実装とTauri DnDの問題 ✅

**背景:**
タグ編集パネルでタグの順序を変更できるようにするため、ドラッグ&ドロップ機能の実装が必要だった。

**初期実装内容:**

**TagEditorPanel.tsx:**
- React HTML5 DnD APIによる実装
  - handleDragStart: ドラッグ開始時の処理
  - handleDragEnd: ドラッグ終了時の処理
  - handleDropToZone: ドロップゾーンへのドロップ処理
- ドロップゾーンのレンダリング
  - タグフィールド間にドロップゾーンを配置
  - ドラッグ時に視覚的フィードバック（ハイライト）
- タグフィールド全体をdraggableに設定

**TaskEditor.tsx:**
- handleTagReorder関数の実装
  - タグ順序の変更を受け取り
  - Front Matterを新しい順序で再構築
  - CodeMirrorエディタの内容を更新
- handleSaveのFront Matterパーサー拡張
  - YAML配列2つの形式に対応
    - インライン形式: `tags: [item1, item2]`
    - リスト形式: `tags:\n- item1\n- item2`

**CSS更新:**
- `.drop-zone`: ドロップゾーンのスタイル
- `.tag-field`: `cursor: grab`でドラッグ可能であることを視覚的に表示
- `.tag-field.dragging`: ドラッグ中のタグフィールドを半透明化

**発生した問題:**
- ❌ handleDragStartとhandleDragEndは発火
- ❌ dataTransfer.setData()は成功
- ❌ onDragOverとonDropが全く発火しない
- ❌ ドラッグイメージが表示されない
- ❌ マウスカーソルが禁止マークになる

#### 3.12.2 Tauri WebViewのDnDブロック問題の解決 ✅

**実装時の根本原因:**

3つの主な原因を発見:

1. **TauriのグローバルDnDブロック**
   - セキュリティ目的でHTML5 DnDがデフォルトでブロックされている
   - WebView2/WKWebViewがdragover/dropイベントを阻止

2. **CodeMirrorのイベントインターセプト**
   - `.codemirror-container`がドラッグイベントを横取り
   - drop-zoneがDOM上に存在するが、CodeMirrorが前面を覆っている
   - onMouseEnterは動作するが、onDragOverは届かない

3. **setDragImage()の削除タイミング**
   - WebView環境では即削除するとイメージが消える

**実装した解決策:**

**① index.htmlにグローバルDnDブロック解除スクリプトを追加**
```html
<script>
  // WebView が drag/drop をグローバルでブロックしないようにする
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
</script>
```

**② setDragImage()の削除を150ms遅延**
```typescript
setTimeout(() => {
  if (dragImage.parentNode) {
    dragImage.parentNode.removeChild(dragImage);
  }
}, 150);
```

**③ drop-zoneのCSS最適化**
```css
.drop-zone {
  pointer-events: auto;
  position: relative;
  z-index: 10;
}
```

**④ CodeMirrorのpointer-eventsをドラッグ中に無効化**

TaskEditor.tsx:
```typescript
const [isDraggingTag, setIsDraggingTag] = useState(false);

// CodeMirrorコンテナにスタイル適用
<div
  ref={editorRef}
  className="codemirror-container"
  style={{ pointerEvents: isDraggingTag ? 'none' : 'auto' }}
/>
```

TagEditorPanel.tsx:
```typescript
interface TagEditorPanelProps {
  // ... 他のprops
  onDragStateChange?: (isDragging: boolean) => void;
}

// ドラッグ開始時
const handleMouseDown = (_e: React.MouseEvent, tagKey: string) => {
  setDraggedTag(tagKey);
  onDragStateChange?.(true); // ← CodeMirrorを無効化
  // ...
};

// ドラッグ終了時
const handleGlobalMouseUp = (e: MouseEvent) => {
  // ...
  onDragStateChange?.(false); // ← CodeMirrorを有効化
};
```

#### 3.12.3 マウスイベントベースの実装への変更 ✅

**最終的な実装:**

React HTML5 DnD APIではなく、マウスイベント（mousedown, mousemove, mouseup）を使用した独自のドラッグ&ドロップ実装に変更。

**実装の特徴:**
- グローバルな`mousemove`/`mouseup`イベントリスナーでスムーズなドラッグ体験
- マウス位置から最も近いタグフィールドを検出してドロップ先を決定
- ドラッグ中は`user-select: none`でテキスト選択を防止
- `useRef`でドラッグ状態と開始位置を管理
- 適切なクリーンアップ処理（イベントリスナーの削除）

**視覚的フィードバック:**
```css
.drop-zone.hover {
  height: 20px;
  background: rgba(14, 99, 156, 0.1);
  border: 1px dashed #0e639c;
}

.tag-field {
  cursor: grab;
}

.tag-field:active {
  cursor: grabbing;
}

.tag-field.dragging {
  opacity: 0.4;
}
```

**成果:**
- ✅ TauriのDnDブロック回避
- ✅ ドラッグイメージの表示
- ✅ drop-zoneの確実なイベント受信
- ✅ CodeMirrorのイベントインターセプト問題解決
- ✅ スムーズなドラッグ&ドロップ体験
- ✅ タグ順序の変更がエディタとFront Matterに正しく反映

**技術的知見:**

Tauri + React + CodeMirrorの環境でドラッグ&ドロップを実装する際の重要なポイント:

1. **TauriのDnD制約**: HTML5 DnD APIはセキュリティでブロックされる → マウスイベントベースの独自実装が安定
2. **CodeMirrorの干渉**: エディタがイベントを横取りする → ドラッグ中は`pointer-events: none`で無効化
3. **WebViewの特性**: DOM要素の即削除でイメージが消える → setTimeoutで遅延削除
4. **イベント管理**: グローバルリスナーは必ずクリーンアップする → `useRef`と`useEffect`で管理

**更新ファイル:**
```
src/components/TaskEditor/TagEditorPanel.tsx     # マウスイベントベースDnD実装
src/components/TaskEditor/TagEditorPanel.css     # ドラッグ&ドロップスタイル
src/components/TaskEditor/TaskEditor.tsx         # isDraggingTag状態管理
index.html                                        # グローバルDnD解除スクリプト
```

### 3.13 Tag Attribute System (R-4.8) 実装状況 ⏳ 進行中

#### 概要

このセクションでは、Tag Attribute System (R-4.8) の実装状況を追跡します。型付きタグシステムにより、タグに対して9種類の属性タイプ（String, Number, Boolean, Datetime, Select, MultiSelect, Currency, Image, Hyperlink）を定義でき、型安全なタグ管理が可能になります。

#### 実装済み項目 ✅

**1. TypeScript型定義 ✅**
- **File**: `src/types/task.ts`
- **Status**: Complete
- **Description**: Tag Attribute Systemの包括的なTypeScript型定義
  - `TagAttributeType`: 全属性タイプのユニオン型
  - `StringAttributeOptions`, `NumberAttributeOptions`, `BooleanAttributeOptions` など
  - `TagSchema`: スキーマ定義インターフェース
  - `HyperlinkValue`: ハイパーリンク値のインターフェース

**2. Rustバックエンド実装 ✅**
- **Files**: 
  - `src-tauri/src/commands/tag_schema_commands.rs`
  - `src-tauri/src/service/tag_schema_service.rs`
- **Status**: Complete
- **Tauri Commands Implemented**:
  - `load_tag_schema(workspace_path: String) -> Result<String, String>`
  - `save_tag_schema(workspace_path: String, schema_json: String) -> Result<(), String>`
  - `get_dynamic_default_value(formula: String) -> Result<String, String>`
- **Features**:
  - `.hienmark/tag_schema.json` からのスキーマ読み込み/保存
  - 動的デフォルト値の計算（例: `=[TODAY]+30`）
  - 適切なエラーハンドリング

**3. フロントエンドサービス ✅**
- **Files**:
  - `src/services/tagSchemaService.ts`
  - `src/hooks/useTagSchema.ts`
- **Status**: Complete
- **Description**: 
  - タグスキーマ操作のサービス層
  - タグスキーマ状態管理のReactフック

**4. 動的入力コンポーネント（部分実装） ✅**
- **Files**:
  - `src/components/DynamicTagInputs/BooleanInput.tsx`
  - `src/components/DynamicTagInputs/SelectInput.tsx`
  - `src/components/DynamicTagInputs/MultiSelectInput.tsx`
  - `src/components/DynamicTagInputs/NumberInput.tsx`
  - `src/components/DynamicTagInputs/DateInput.tsx`
  - `src/components/DynamicTagInputs/index.ts`
- **Status**: Partially Complete
- **Implemented**: 5つの基本的な入力コンポーネント
- **Remaining**: Currency, Image, Hyperlink入力コンポーネント

#### 未実装項目 ⏳

**1. 追加の動的入力コンポーネント ⏳**
- **CurrencyInput.tsx**: 通貨入力とフォーマットサポート
- **ImageInput.tsx**: 画像選択とプレビュー
- **HyperlinkInput.tsx**: URLとテキスト入力

**2. TagConfigEditorの更新 ⏳**
- **File**: `src/components/TagManagement/TagConfigEditor.tsx`
- **Status**: Not Started
- **Required Changes**:
  - 属性タイプ選択UIの追加（現在のtagTypeオプションの拡張）
  - 各属性タイプのオプションエディタ追加
  - 9種類の属性タイプのサポート:
    - String, Number, Boolean, Datetime, Select, MultiSelect, Currency, Image, Hyperlink
  - 選択された属性タイプに基づく動的フォーム生成

**3. TagEditorPanelの更新 ⏳**
- **File**: `src/components/TaskEditor/TagEditorPanel.tsx`
- **Status**: Not Started
- **Required Changes**:
  - `useTagSchema`フックを使用したタグスキーマの読み込み
  - スキーマに基づく動的入力のレンダリング
  - スキーマが定義されていない場合の既存動作へのフォールバック
  - UIでの全属性タイプのサポート

**4. フィルター/ソート統合 ⏳**
- **Files**: 
  - `src-tauri/src/commands/filter_sort_commands.rs`
  - Filter/sort service files
- **Status**: Not Started
- **Required Changes**:
  - フィルタリング/ソート前にタグスキーマを読み込み
  - 型認識の比較の実装:
    - `Datetime`タイプ: chronoを使用した日付/時刻比較
    - `Number`/`Currency`タイプ: 数値比較
    - `Boolean`タイプ: True/false比較（1/0集約付き）
    - `Select`タイプ: ソート設定からのカスタム順序リストの使用

**5. スキーマファイル管理 ⏳**
- **Status**: Not Started
- **Required**: `.hienmark/tag_schema.json`がGitで追跡されることを確認（.gitignoreに含まれない）

#### アーキテクチャ決定

**スキーマストレージ**

タグスキーマは`.hienmark/tag_schema.json`にJSON形式で保存されます：

```json
{
  "priority": {
    "type": "Select",
    "options": {
      "optionsList": ["very high", "high", "medium", "low", "very low"],
      "allowManualEntry": false,
      "defaultValue": "medium",
      "displayFormat": "dropdown"
    }
  },
  "dueDate": {
    "type": "Datetime",
    "options": {
      "format": "dateOnly",
      "defaultValue": {
        "type": "dynamic",
        "formula": "=[TODAY]+7"
      }
    }
  }
}
```

**既存TagConfigとの統合**

新しいタグスキーマシステムは既存の`TagConfig`システムに**追加**される形で動作します：

- `TagConfig` (`.hienmark.json`内): 既存のタグ設定（エイリアス、ソート設定、フィルター設定）
- `TagSchema` (`.hienmark/tag_schema.json`内): 新しい属性タイプ定義
- 両システムは協調して包括的なタグ管理を提供

#### 次のステップ

1. **動的入力コンポーネントの完成**:
   - CurrencyInput, ImageInput, HyperlinkInputの実装
   - 全入力タイプの適切なバリデーション

2. **TagConfigEditorの更新**:
   - 属性タイプ選択UIの追加
   - 各属性タイプの動的オプションエディタ
   - 既存TagConfigシステムとの適切な統合

3. **TagEditorPanelの更新**:
   - レンダリングロジックへのタグスキーマ統合
   - スキーマに基づく動的入力の使用
   - 非スキーマタグのフォールバック動作の維持

4. **フィルター/ソート統合の実装**:
   - フィルター/ソートコマンドのタグスキーマ使用への更新
   - 型認識の比較の実装
   - カスタムソート順序のサポート

5. **テスト**:
   - 全属性タイプのテスト
   - 動的デフォルト値のテスト
   - 型付き属性でのフィルター/ソートのテスト
   - タグスキーマの保存/読み込みのテスト

#### 注記

- 実装は要件定義書のR-4.8.1からR-4.8.6までに指定された要件に従う
- バックエンドのRustコードは完成しており機能している
- フロントエンド統合は進行中
- システムは既存のタグ設定と後方互換性があるよう設計されている

#### 参照

- **要件**: 仕様書のR-4.8.1からR-4.8.6
- **実装仕様**: セクション3（データモデル）、セクション4（Rustバックエンド）、セクション5（Reactフロントエンド）

---

**最終更新:** 2025-10-31
**開発者:** Claude Code + User
