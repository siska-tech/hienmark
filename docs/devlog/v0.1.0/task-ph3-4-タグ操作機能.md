---
status: completed
priority: highest
assignee: BE/FE
start_date: 2025-10-25
end_date: 2025-10-25
tags: ["Phase 3", "タグシステム", "タグ操作", "リネーム", "削除"]
depends_on: ["task-ph3-3-タグ管理機能.md"]
---

# Task-PH3-4: タグ操作機能（リネーム・削除）

## 概要

タグのリネームと削除機能を実装しました。全タスクから一括でタグを更新・削除する機能と、ユーザーフレンドリーなUIを構築しました。

**関連Phase:** Phase 3: タグシステム実装  
**期間:** 2025-10-25

## タスク詳細

### 実施内容

**タグリネーム機能:**
- Rustバックエンド実装
  - `TagService` サービス実装 (`src-tauri/src/service/tag_service.rs`)
  - `rename_tag()` - タグ値の一括リネーム
    - 全タスクから該当タグを検索
    - Front Matterを更新
    - ファイルに保存
    - タグインデックスを再構築
  - 型を維持したリネーム（String → String、Number → Number等）
- Tauriコマンド実装 (`src-tauri/src/commands/tag_commands.rs`)
  - `rename_tag` - リネームコマンド
- フロントエンド実装
  - `TagService` API拡張
  - `TagManager` コンポーネント更新（インライン編集UI）

**タグ削除機能:**
- Rustバックエンド実装
  - `TagService::delete_tag()` メソッド
  - 特定の値を削除（value指定時）
  - カテゴリごと削除（value未指定時）
- Tauriコマンド
  - `delete_tag` コマンド
- フロントエンド実装
  - `TagService::deleteTag()` メソッド追加
  - `TagManager` コンポーネント更新（削除ボタン、確認ダイアログ）

### 成果物

- `src-tauri/src/service/tag_service.rs` - タグ操作サービス
- `src-tauri/src/commands/tag_commands.rs` - タグ操作コマンド
- `src/services/tagService.ts` - タグAPI拡張

### チェックリスト

- [x] タグリネーム機能実装（バックエンド）
- [x] タグリネーム機能実装（フロントエンド）
- [x] タグ削除機能実装（バックエンド）
- [x] タグ削除機能実装（フロントエンド）
- [x] インライン編集UI
- [x] 削除確認ダイアログ
- [x] カテゴリ削除機能

## 成果

- ✅ **タグ値の一括リネーム**: 全タスクへの自動反映
- ✅ **タグ値の個別削除**: 特定の値を削除
- ✅ **カテゴリの一括削除**: 全タスクから該当カテゴリを削除
- ✅ **安全性を考慮した確認ダイアログ**: 誤削除防止
- ✅ **視覚的フィードバック**: 更新タスク数の表示

## 完了記録

**完了日:** 2025-10-25  
**開発者:** Claude Code + User

**次のステップ:** Task-PH3-5 タグモード管理

