---
status: completed
priority: medium
assignee: FE
start_date: 2025-10-26
end_date: 2025-10-26
tags: ["Phase 3", "タグシステム", "DnD", "UI改善"]
depends_on: ["task-ph3-11-配列タグ形式の統一.md"]
---

# Task-PH3-12: タグ順序のドラッグ&ドロップ機能

## 概要

タグ編集パネルでタグの順序を変更できるドラッグ&ドロップ機能を実装しました。TauriのDnDブロック問題を解決し、マウスイベントベースの独自実装を採用しました。

**関連Phase:** Phase 3: タグシステム実装  
**期間:** 2025-10-26

## タスク詳細

### 実施内容

**初期実装とTauri DnDの問題 (3.12.1):**
- React HTML5 DnD APIによる実装を試行
  - `handleDragStart`, `handleDragEnd`, `handleDropToZone`の実装
  - タグフィールド間にドロップゾーンを配置
  - `handleTagReorder`関数でFront Matter再構築とCodeMirror更新
- **発生した問題:**
  - `handleDragStart`と`handleDragEnd`は発火するが、`onDragOver`と`onDrop`が全く発火しない
  - ドラッグイメージが表示されない
  - マウスカーソルが禁止マークになる

**Tauri WebViewのDnDブロック問題の解決 (3.12.2):**
- **根本原因（3つ）:**
  1. TauriのグローバルDnDブロック（セキュリティ目的）
  2. CodeMirrorのイベントインターセプト（`.codemirror-container`がドラッグイベントを横取り）
  3. `setDragImage()`の削除タイミング（WebView環境では即削除するとイメージが消える）
- **解決策:**
  1. `index.html`にグローバルDnDブロック解除スクリプトを追加
  2. `setDragImage()`の削除を150ms遅延
  3. drop-zoneのCSS最適化（`pointer-events: auto, z-index: 10`）
  4. CodeMirrorの`pointer-events`をドラッグ中に無効化（`isDraggingTag`状態管理）

**マウスイベントベースの実装への変更 (3.12.3):**
- React HTML5 DnD APIからマウスイベント（mousedown, mousemove, mouseup）ベースの実装に変更
- **実装の特徴:**
  - グローバルな`mousemove`/`mouseup`イベントリスナーでスムーズなドラッグ体験
  - マウス位置から最も近いタグフィールドを検出してドロップ先を決定
  - ドラッグ中は`user-select: none`でテキスト選択を防止
  - `useRef`でドラッグ状態と開始位置を管理
  - 適切なクリーンアップ処理（イベントリスナーの削除）
- **視覚的フィードバック:**
  - `.drop-zone.hover`: ハイライト表示（`rgba(14, 99, 156, 0.1)`, 破線ボーダー）
  - `.tag-field`: `cursor: grab`でドラッグ可能であることを表示
  - `.tag-field.dragging`: 半透明化（`opacity: 0.4`）

### 成果物

- `src/components/TaskEditor/TagEditorPanel.tsx` - マウスイベントベースDnD実装
- `src/components/TaskEditor/TagEditorPanel.css` - ドラッグ&ドロップスタイル
- `src/components/TaskEditor/TaskEditor.tsx` - isDraggingTag状態管理
- `index.html` - グローバルDnD解除スクリプト

### チェックリスト

- [x] ドラッグ&ドロップ機能の実装
- [x] Tauri DnDブロック問題の解決
- [x] CodeMirrorのイベントインターセプト問題解決
- [x] マウスイベントベースの実装への変更
- [x] タグ順序の変更がエディタとFront Matterに正しく反映

## 技術的知見

Tauri + React + CodeMirrorの環境でドラッグ&ドロップを実装する際の重要なポイント:

1. **TauriのDnD制約**: HTML5 DnD APIはセキュリティでブロックされる → マウスイベントベースの独自実装が安定
2. **CodeMirrorの干渉**: エディタがイベントを横取りする → ドラッグ中は`pointer-events: none`で無効化
3. **WebViewの特性**: DOM要素の即削除でイメージが消える → setTimeoutで遅延削除
4. **イベント管理**: グローバルリスナーは必ずクリーンアップする → `useRef`と`useEffect`で管理

## 成果

- ✅ **TauriのDnDブロック回避**: マウスイベントベースの独自実装
- ✅ **スムーズなドラッグ&ドロップ体験**: 視覚的フィードバックと適切な処理
- ✅ **タグ順序の変更が正しく反映**: エディタとFront Matterへの自動反映

## 完了記録

**完了日:** 2025-10-26  
**開発者:** Claude Code + User

**次のステップ:** Task-PH3-13 Tag Attribute System (進行中)

