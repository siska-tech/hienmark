---
status: completed
priority: high
assignee: FE/BE
start_date: 2025-12-08
end_date: 2025-12-10
tags: ["編集機能", "REQ-EDT-004", "実装", "React", "Rust"]
depends_on: []
---

# Task-EDT-4.1: D&Dによるファイルコピーと相対パス挿入ロジック

## 概要

ドラッグ&ドロップによるファイルコピー（`.hienmark/assets/`）と、Markdown記法での相対パス自動挿入機能を実装する。

## タスク詳細

### 実装要件

- **ストレージ:** `.hienmark/assets/` ディレクトリに集約
- **ファイルコピー:** D&D時に元ファイルをアセットディレクトリへコピー
- **パス生成:** Markdown記法 `![alt](relative/path/to/asset.png)` を自動挿入
- **整合性管理:** REQ-ARC-001のインデックスで管理

### チェックリスト

- [x] Rust側: アセットファイルコピーコマンドを実装（copy_asset_to_workspace）
- [x] Rust側: アセットディレクトリ初期化ロジックを実装（.hienmark/assets/）
- [x] Rust側: Base64データからアセットを保存するコマンドを実装（save_asset_from_base64）※削除済み
- [x] Rust側: base64クレートを追加（Cargo.toml）※削除済み
- [x] React側: TaskEditorにドラッグ&ドロップハンドラ追加
- [x] React側: Tauri v2の`tauri://drag-drop`イベントリスナー実装
- [x] React側: CodeMirrorへのMarkdown記法自動挿入
- [x] React側: 画像パスの`convertFileSrc`変換実装（CSP対応）
- [x] Tauri設定: `assetProtocol`の設定（tauri.conf.json）
- [x] **ドラッグ&ドロップイベントが発火しない問題の解決** ✅

## 成果物

- アセット管理機能（Rust側実装完了）✅
- 相対パス自動生成ロジック（Rust側実装完了）✅
- Tauri v2のネイティブD&Dイベント実装（React側、完了）✅
- 画像表示機能（`convertFileSrc`を使用したCSP対応、完了）✅

## 実装詳細

### Rust側（バックエンド）- ✅ 完了

**実装済み機能:**
- `WorkspaceService::copy_asset_to_workspace`: ファイルパスからアセットをコピー ✅
- ~~`WorkspaceService::save_asset_from_base64`: Base64データからアセットを保存~~ ❌ 削除済み（不要になったため）
- Tauriコマンド: `copy_asset_to_workspace` ✅
- `.hienmark/assets/`ディレクトリの自動作成 ✅
- 一意なファイル名生成（`ファイル名_タイムスタンプ.拡張子`） ✅
- ~~`base64 = "0.22"`依存関係追加~~ ❌ 削除済み（不要になったため）

**ファイル変更:**
- `src-tauri/src/service/workspace_service.rs`: アセット管理メソッド追加 ✅
- `src-tauri/src/commands/workspace_commands.rs`: Tauriコマンド追加 ✅
- `src-tauri/src/lib.rs`: コマンド登録 ✅
- ~~`src-tauri/Cargo.toml`: base64依存関係追加~~ ❌ 削除済み

### React側（フロントエンド）- ✅ 完了

**最終実装アプローチ: Tauri v2のネイティブ`tauri://drag-drop`イベントを使用**

**解決内容:**
- **問題の原因**: TauriのWebViewがOSからのファイルドラッグイベントをデフォルトでブロックしているため、HTML5 D&Dイベント（`dragover`/`drop`）が発火しなかった
- **解決方法**: CodeMirrorのDOMイベントに頼るのではなく、Tauriのネイティブファイルドロップイベント（`tauri://drag-drop`）を使用
- **メリット**: 
  - Base64エンコードが不要（ファイルパスを直接受け取れる）
  - 既存の`copy_asset_to_workspace`コマンドをそのまま使用可能
  - Tauriの公式推奨方法

**実装内容:**
- `src/components/TaskEditor/TaskEditor.tsx`: 
  - `listen('tauri://drag-drop', ...)`を使用したイベントリスナー実装
  - `handleFileDrop`関数を`useCallback`で実装
  - `convertFileSrc`を使用した画像パス変換（CSP対応）
- `src/main.tsx`: グローバルリスナーのテストコード（削除済み）
- `src-tauri/tauri.conf.json`: 
  - `dragDropEnabled: true`（不要なため削除）
  - `assetProtocol`設定追加
  - CSP設定更新（`img-src`に`asset:`と`http://asset.localhost`を追加）

**実装ファイル:**
- `src/components/TaskEditor/TaskEditor.tsx`: TauriネイティブD&Dイベント実装 ✅
- `src/components/TaskEditor/TaskEditor.css`: `.editor-pane.drag-over`スタイル（既存）
- `src-tauri/tauri.conf.json`: `assetProtocol`とCSP設定追加 ✅

### 技術的課題

1. **Tauri D&D制約**: 
   - HTML5 DnDではローカルファイルパスが取得できない
   - 解決策: Tauri v2のネイティブ`tauri://drag-drop`イベントを使用
   - 状態: ✅ 解決済み（Base64エンコード不要）

2. **CodeMirror D&Dイベント発火問題**: 
   - 問題: HTML5 D&Dイベント（`dragover`/`drop`）が発火しない
   - 根本原因: TauriのWebViewがOSからのファイルドラッグイベントをデフォルトでブロック
   - 解決策: Tauriのネイティブ`tauri://drag-drop`イベントを使用（HTML5 D&Dイベントではなく）
   - 状態: ✅ 解決済み

3. **一意ファイル名**: 
   - タイムスタンプ付与で名前衝突を回避
   - 状態: ✅ 実装済み

4. **相対パス形式**: 
   - `.hienmark/assets/ファイル名_タイムスタンプ.拡張子`
   - 状態: ✅ 実装済み

5. **画像表示のCSP制限**: 
   - 問題: TauriのCSPにより、ローカルファイルパスを`img`タグの`src`に直接指定できない
   - 解決策: `convertFileSrc`関数を使用してパスを変換
   - 追加設定: `tauri.conf.json`の`assetProtocol`とCSP設定
   - 状態: ✅ 解決済み

## 作業ログ

### 2025-12-08: 初期実装

**Rust側実装:**
- ✅ アセットディレクトリ自動作成ロジック
- ✅ ファイルコピー機能（パスベース）
- ✅ Base64データ保存機能
- ✅ Tauriコマンド登録
- ✅ 依存関係追加

**React側実装（アプローチ1）:**
- ✅ `editorPaneRef`へのD&Dイベントリスナー追加
- ✅ Base64エンコードロジック
- ✅ CodeMirrorへのMarkdown挿入ロジック
- ✅ `index.html`にグローバルD&D解除スクリプト追加
- ❌ **問題**: イベントが発火しない

### 2025-12-08: デバッグと修正試行

**問題分析:**
- イベントリスナーは正常に登録されている（ログ確認済み）
- `[D&D] Event listeners registered`は出力される
- しかし、`dragover`/`drop`イベントが発火しない
- **根本原因**: TauriのWebViewがOSからのファイルドラッグイベントをデフォルトでブロックしている

**修正試行:**
1. ✅ `index.html`のグローバル`preventDefault`削除（初期実装で追加していた）
2. ✅ CodeMirrorの`contentDOM`への直接リスナー追加
3. ✅ CodeMirrorの`dom`（ルート要素）への直接リスナー追加
4. ✅ 詳細なデバッグログ追加
5. ✅ `EditorView.domEventHandlers`拡張機能への移行
6. ✅ **Tauri v2のネイティブ`tauri://drag-drop`イベント方式への切り替え（最終解決策）**

**結果:**
- ✅ Tauri v2のネイティブイベント方式で実装完了
- ✅ 動作確認完了（ファイルドロップでアセットが正常に追加される）

### 2025-12-08: TauriネイティブD&D実装完了

**実装内容:**
- ✅ `listen('tauri://drag-drop', ...)`を使用
- ✅ CodeMirror拡張機能（`createDragDropExtension`）を削除
- ✅ Base64エンコードロジックを削除
- ✅ `copy_asset_to_workspace`コマンドを直接使用（パラメータ名を`workspace_path`, `source_path`, `task_id`に修正）
- ✅ 画像ファイル拡張子チェック実装
- ✅ React Strict Mode対応（`useCallback`と適切なクリーンアップ処理）
- ✅ 画像パスの`convertFileSrc`変換実装（CSP対応）

### 2025-12-08: 画像表示機能実装完了

**実装内容:**
- ✅ `convertFileSrc`を`@tauri-apps/api/core`からインポート
- ✅ Markdownレンダリング後のHTML内の`img`タグの`src`属性を変換
- ✅ `tauri.conf.json`に`assetProtocol`設定追加
- ✅ CSP設定更新（`img-src`に`asset:`と`http://asset.localhost`を追加）
- ✅ `scope: ["**"]`でワークスペース外のファイルもアクセス可能に設定

## 実装完了 ✅

### 解決した問題

1. **TauriのD&D制約**
   - ✅ 解決: Tauri v2のネイティブ`tauri://drag-drop`イベントを使用することで回避

2. **CodeMirrorのD&D実装**
   - ✅ 不要: Tauriのネイティブイベントを使用するため、CodeMirror拡張は不要

3. **Base64エンコードのオーバーヘッド**
   - ✅ 解決: ファイルパスを直接受け取るため、Base64エンコードが不要

4. **画像表示のCSP制限**
   - ✅ 解決: `convertFileSrc`関数と`assetProtocol`設定により解決

### 削除された実装

- ❌ Base64エンコード関連のコード（不要になったため削除）
- ❌ `save_asset_from_base64`コマンドと実装（使用されていないため削除）
- ❌ `base64`クレートの依存関係（不要になったため削除）

## メモ

- プロジェクト移動時のリンク切れを防ぐため、相対パスを使用
- アセットはインデックスで管理し、高速検索を可能にする
- Rust側・React側ともに実装完了 ✅
- Tauriのネイティブ`tauri://drag-drop`イベントを使用することで、Base64エンコードが不要になり、パフォーマンスとコードの簡潔性が向上
- ファイルパスを直接受け取るため、既存の`copy_asset_to_workspace`コマンドをそのまま使用可能
- `convertFileSrc`関数と`assetProtocol`設定により、TauriのCSP制限を回避してローカル画像を表示可能

## 技術的実装詳細

### Tauri v2の`tauri://drag-drop`イベント

```typescript
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// イベントリスナー登録
const promise = listen('tauri://drag-drop', (event) => {
  const paths = (event.payload as { paths: string[] }).paths;
  if (paths && paths.length > 0) {
    handleFileDrop(paths[0]);
  }
});
```

### 画像パスの変換

```typescript
import { convertFileSrc } from '@tauri-apps/api/core';

// 相対パスを絶対パスに変換してからconvertFileSrcで変換
const absolutePath = workspacePath + '/' + relativePath;
const convertedSrc = convertFileSrc(absolutePath);
```

### 設定ファイル

**`tauri.conf.json`:**
- `assetProtocol.enable: true`
- `assetProtocol.scope: ["**"]`（すべてのローカルファイルへのアクセスを許可）
- CSPに`img-src 'self' asset: http://asset.localhost`を追加
