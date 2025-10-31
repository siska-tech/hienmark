# Phase 2: コア機能実装 - 開発記録

**期間:** 2025-10-25  
**ステータス:** ✅ 完了

## 概要

Phase 1で構築した基盤を活用して、ワークスペース管理、タスクエディタ、CRUD操作、ファイル監視機能を実装しました。HienMarkのコアとなる機能が完成しました。

## マイルストーン

### 2.1 ワークスペース管理 ✅

**実施内容:**

**Rustサービス層実装** (`src-tauri/src/service/workspace_service.rs`):
- `WorkspaceService` - ワークスペース管理サービス
  - `load_workspace()` - ディレクトリから全タスク読み込み
  - `load_task()` - 単一タスクファイル読み込み
  - `scan_markdown_files()` - 再帰的な.mdファイルスキャン
  - `save_task()` - タスク保存
  - `create_task()` - 新規タスク作成
  - `delete_task()` - タスク削除
- ユニットテスト4件実装（全て成功）

**Tauriコマンド実装** (`src-tauri/src/commands/workspace_commands.rs`):
- `open_workspace` - ワークスペースを開く
- `list_tasks` - タスクID一覧取得
- `get_task` - 特定タスク取得
- `create_task` - 新規タスク作成
- `save_task` - タスク保存
- `delete_task` - タスク削除

**フロントエンド実装:**
- `src/services/workspaceService.ts` - Tauri APIラッパー
- `src/hooks/useWorkspace.ts` - Reactカスタムフック
- `src/components/TaskBrowser/` - タスク一覧コンポーネント
  - タスクリスト表示（最終更新日時順）
  - 検索機能
  - タグ表示（Front Matterのプレビュー）
  - タスク選択UI
  - 「+ New Task」ボタン

**App.tsx統合:**
- ワークスペース開くボタン
- TaskBrowserサイドバー統合
- タスク選択状態管理
- エラーハンドリング表示

**成果:**
- ✅ ワークスペースディレクトリ選択（ダイアログ）
- ✅ `.md`ファイルスキャン（再帰的）
- ✅ タスク一覧表示
- ✅ タスク検索
- ✅ タスク作成
- ✅ タスク選択
- ✅ Tauri権限設定（dialog/fs）

**技術的課題と解決:**

**課題1: Tauri権限エラー**
- 問題: `dialog.open not allowed` エラー
- 原因: Tauri 2.xのセキュリティモデルで権限が明示的に設定されていない
- 解決: `src-tauri/capabilities/default.json`に権限追加
  - `dialog:allow-open` - ディレクトリ選択
  - `fs:allow-read-text-file` - ファイル読み込み
  - `fs:allow-write-text-file` - ファイル書き込み
  - `fs:allow-remove` - ファイル削除
  - 他のファイル操作権限

### 2.1.1 ファイルウォッチャー ✅

**実施内容:**

**Rustファイルウォッチャー実装** (`src-tauri/src/service/file_watcher.rs`):
- `FileWatcherService` - ファイル監視サービス
  - `notify` クレートを使用したリアルタイム監視
  - `.md`ファイルの作成・変更・削除イベント検知
  - バックグラウンドスレッドで非同期処理
  - Tauriイベントシステムによるフロントエンド通知

**Tauriコマンド実装** (`src-tauri/src/commands/watcher_commands.rs`):
- `start_file_watcher` - ファイル監視開始
- `stop_file_watcher` - ファイル監視停止
- Mutex<Option<FileWatcherService>> による状態管理

**イベント定義:**
```rust
#[derive(Clone, serde::Serialize)]
struct FileChangeEvent {
    event_type: String,  // "created" | "modified" | "removed"
    file_path: String,
    task_id: String,
}
```

**フロントエンド統合:**
- `src/services/fileWatcherService.ts` - ファイルウォッチャーAPIラッパー
  - `startFileWatcher()` - 監視開始
  - `stopFileWatcher()` - 監視停止
  - `listenToFileChanges()` - イベントリスナー登録
- `src/hooks/useWorkspace.ts` への統合
  - ワークスペース開設時に自動的にファイルウォッチャー起動
  - イベント受信時にタスクリスト自動更新
  - コンポーネントアンマウント時に監視停止

**成果:**
- ✅ 外部エディタでのファイル変更をリアルタイム検知
- ✅ UI自動更新（リロード不要）
- ✅ バックグラウンドスレッドによる非ブロッキング処理
- ✅ リソースリーク防止（適切なクリーンアップ）

### 2.2 タスクエディタ ✅

**実施内容:**

**依存関係インストール:**
```bash
npm install @codemirror/state @codemirror/view @codemirror/commands
npm install @codemirror/lang-markdown @codemirror/theme-one-dark
npm install markdown-it @types/markdown-it
npm install dompurify @types/dompurify
npm install mermaid
```

**TaskEditorコンポーネント実装** (`src/components/TaskEditor/TaskEditor.tsx`):
- CodeMirror 6を使用したMarkdownエディタ
- 分割ビュー（エディタ/プレビュー）
- 機能:
  - ✅ Markdown構文ハイライト
  - ✅ リアルタイムプレビュー
  - ✅ Front Matter自動パース・フォーマット
  - ✅ キーボードショートカット（Ctrl+S: 保存, Esc: 閉じる）
  - ✅ 未保存変更インジケーター
  - ✅ プレビューON/OFF切り替え
  - ✅ ダークテーマエディタ + ライトテーマプレビュー

**Markdownプレビュー機能:**
- `markdown-it` による CommonMark → HTML 変換
- `DOMPurify` による XSS 対策（HTMLサニタイゼーション）
- 許可タグ: h1-h6, p, br, hr, ul, ol, li, strong, em, code, pre, blockquote, a, img, table関連
- Front Matter除去（プレビューには表示しない）

**Mermaidプレビュー機能** (`src/components/TaskEditor/MermaidPreview.tsx`):
- Mermaid.js によるダイアグラムレンダリング
- セキュリティ設定:
  ```typescript
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'antiscript', // XSS対策
  });
  ```
- 自動検出: `` ```mermaid ... ``` `` コードブロック
- エラーハンドリング（無効な構文の場合もフレンドリーなエラー表示）
- 対応ダイアグラム:
  - フローチャート (flowchart, graph)
  - シーケンス図 (sequenceDiagram)
  - ガントチャート (gantt)
  - クラス図 (classDiagram)
  - ER図 (erDiagram)
  - パイチャート (pie)
  - その他全てのMermaidダイアグラムタイプ

**Front Matterエディタ統合:**
- YAML Front Matter → TypeScript Object パース
- エディタ上での直接編集可能
- 保存時に自動的にフォーマット
- 配列、数値、真偽値、null値のサポート

**TaskEditor.css スタイリング:**
- ダークテーマ（VS Code風）
- スプリットビューレイアウト（50%/50%）
- レスポンシブスクロールバー
- Mermaidダイアグラム専用スタイル

**App.tsx統合:**
- TaskBrowserからタスク選択時にTaskEditor表示
- エディタとブラウザの共存
- 保存後に自動的にTaskBrowserリフレッシュ

**セキュリティ対策（3層防御）:**
1. **markdown-it**: `html: false` でHTMLタグ無効化
2. **DOMPurify**: 許可されたタグとアトリビュートのみ表示
3. **Mermaid**: `securityLevel: 'antiscript'` で script タグ無効化

**成果:**
- ✅ CodeMirror 6統合完了
- ✅ Markdown編集・プレビュー
- ✅ Front Matter編集
- ✅ Mermaidダイアグラムプレビュー
- ✅ XSS対策完全実装
- ✅ キーボードショートカット
- ✅ 自動保存対応可能な構造

### 2.3 タスクCRUD操作 ✅

**実施内容:**

**タスク削除UI実装:**
- TaskBrowserに削除ボタン追加
  - 各タスクアイテムに「×」削除ボタン配置
  - ホバー時にのみ表示される控えめなデザイン
- 削除確認ダイアログ実装
  - モーダルオーバーレイで確認ダイアログ表示
  - タスク名を表示して誤削除を防止
  - 「This action cannot be undone」警告メッセージ
  - Cancel/Deleteボタンで明確な操作
- App.tsxに削除ハンドラー統合
  - useWorkspaceのdeleteTask関数を呼び出し
  - 削除されたタスクが選択中の場合、選択を解除
  - ファイルウォッチャーと連携して状態自動更新

**自動保存機能実装:**
- TaskEditorに3秒間の自動保存タイマー追加
  - `useRef`でタイマーID管理
  - エディタ変更時にタイマーをリセット（デバウンス）
  - 3秒間編集がない場合に自動保存実行
- 最終保存時刻の表示
  - フッターに「最終保存: HH:MM:SS」表示
  - 未保存状態では非表示
  - 保存成功時に時刻更新
- クリーンアップ処理
  - コンポーネントアンマウント時にタイマークリア
  - メモリリーク防止

**CRUD操作完全実装:**
1. **Create (作成)** ✅
   - TaskBrowserの「+ New Task」ボタン
   - Tauri `create_task` コマンド呼び出し
   - 新規タスクファイル作成後に自動的にエディタで開く

2. **Read (読み込み)** ✅
   - ワークスペース開設時に全タスク読み込み
   - Tauri `get_task` コマンドでタスク取得
   - Front Matterとコンテンツの正確なパース

3. **Update (更新)** ✅
   - TaskEditorでのリアルタイム編集
   - 手動保存（Ctrl+S）
   - 自動保存（3秒後）
   - Tauri `save_task` コマンド呼び出し
   - ファイルウォッチャーによる他プロセスの変更検知

4. **Delete (削除)** ✅
   - TaskBrowser削除ボタン
   - 確認ダイアログで誤削除防止
   - Tauri `delete_task` コマンド呼び出し
   - 削除後の状態自動更新

**成果:**
- ✅ 完全なCRUD操作実装
- ✅ 削除確認UI（モーダルダイアログ）
- ✅ 自動保存機能（3秒デバウンス）
- ✅ 最終保存時刻表示
- ✅ ファイルウォッチャーとの連携
- ✅ ユーザーフレンドリーなUI/UX

## ディレクトリ構造（Phase 2完了時点）

```
HienMark/
├── src/                          # フロントエンド
│   ├── types/
│   │   └── task.ts              ✅ TypeScript型定義
│   ├── components/
│   │   ├── TaskBrowser/         ✅ タスク一覧コンポーネント
│   │   │   ├── TaskBrowser.tsx
│   │   │   ├── TaskBrowser.css
│   │   │   └── index.ts
│   │   └── TaskEditor/          ✅ タスクエディタ（NEW）
│   │       ├── TaskEditor.tsx
│   │       ├── TaskEditor.css
│   │       ├── MermaidPreview.tsx
│   │       └── index.ts
│   ├── services/                ✅ バックエンドAPI呼び出し
│   │   ├── workspaceService.ts
│   │   └── fileWatcherService.ts  ✅ ファイルウォッチャー（NEW）
│   ├── hooks/                   ✅ Reactカスタムフック
│   │   └── useWorkspace.ts      ✅ ファイルウォッチャー統合済み
│   ├── App.tsx                  ✅ メインアプリ（エディタ統合）
│   ├── App.css                  ✅ アプリスタイル
│   └── main.tsx
│
├── src-tauri/                   # Rustバックエンド
│   ├── src/
│   │   ├── models/              ✅ データモデル
│   │   ├── parser/              ✅ Markdown/FrontMatterパーサー
│   │   ├── service/             ✅ ビジネスロジック
│   │   │   ├── mod.rs
│   │   │   ├── workspace_service.rs
│   │   │   └── file_watcher.rs  ✅ ファイル監視（NEW）
│   │   ├── commands/            ✅ Tauriコマンド
│   │   │   ├── mod.rs
│   │   │   ├── workspace_commands.rs
│   │   │   └── watcher_commands.rs  ✅ ファイルウォッチャー（NEW）
│   │   ├── lib.rs              ✅ コマンド登録済み
│   │   └── main.rs
│   ├── capabilities/
│   │   └── default.json         ✅ Tauri権限設定
│   └── Cargo.toml
```

## ビルド結果

**フロントエンド:**
```bash
✅ npm run build 成功
✅ TypeScriptコンパイル成功
⚠️  Bundle size warning（Mermaid.jsによる大きなチャンクサイズ）
```

**Rustバックエンド:**
```bash
✅ cargo check 成功
⚠️  8 warnings (未使用のimport/関数 - 今後の機能で使用予定)
```

**Tauriアプリケーション:**
```bash
❌ npm run tauri build 失敗
原因: bundle identifierがデフォルト値（com.tauri.dev）のまま
対応: tauri.conf.json の identifier を変更する必要あり
```

## 成果

Phase 2の完了により、以下の機能が利用可能になりました：

- ✅ **ワークスペース管理**: ディレクトリベースのタスク管理
- ✅ **タスクブラウザ**: 検索・選択・作成・削除機能
- ✅ **Markdownエディタ**: CodeMirror 6による高機能エディタ
- ✅ **リアルタイムプレビュー**: MarkdownとMermaidの即座表示
- ✅ **ファイル監視**: 外部エディタとの連携
- ✅ **CRUD操作**: 完全なタスク操作機能
- ✅ **自動保存**: 3秒デバウンスによる自動保存
- ✅ **セキュリティ**: XSS対策を含む安全な処理

## 技術的成果

1. **アーキテクチャ**: Tauri + React + Rustの堅牢な基盤
2. **セキュリティ**: 3層防御によるXSS対策
3. **パフォーマンス**: 非同期処理とファイル監視
4. **UX**: 直感的なUIとキーボードショートカット
5. **拡張性**: Mermaidダイアグラムサポート

## 次のステップ

Phase 3では、タグベースの分析・管理機能の実装に進みます。

---

**最終更新:** 2025-10-25  
**開発者:** Claude Code + User
