---
status: completed
priority: high
assignee: TL/BE
start_date: 2025-11-06
end_date: 2025-11-06
tags: ["アーキテクチャ", "REQ-ARC-001", "データベース", "設計"]
depends_on: []
---

# Task-ARC-1.1: インデックススキーマ定義

## 概要

タスク、フォルダ、タグ、アセットのインデックススキーマ定義を行う。

## 重要事項

**アーキテクチャ軌道修正（2025年11月5日）:**
- SQLiteは**プライマリではなく、インデックス/キャッシュ**としてのみ機能する
- Markdownファイルが唯一の真実の源（プライマリデータ）
- インデックスは削除されても100%再構築可能でなければならない

## タスク詳細

### スキーマ設計要件

- **テーブル構造:**
  - `tasks_index` - タスクインデックス（ID, ファイルパス, Front Matter JSON, 最終更新日時）
  - `folders_index` - フォルダ階層インデックス（ID, 親フォルダID, 名前, パス）
  - `task_folders_index` - タスクとフォルダの関連インデックス（タスクID, フォルダID）
  - `assets_index` - アセットインデックス（ID, ファイルパス, タスクID, 相対パス）
  - `tags_index` - タグインデックス（カテゴリ, 値, タスク数）
  - `task_tags_index` - タスクとタグの関連インデックス（タスクID, カテゴリ, 値）
  - `file_metadata` - ファイルメタデータ（ファイルパス, mtime, インデックス最終更新日時）

### 成果物

- ER図
- テーブル定義書（DDL）
- インデックス設計書
- スキーマバージョン管理方針

### チェックリスト

- [x] ER図作成
- [x] テーブルDDL作成
- [x] インデックス設計（検索性能確保）
- [x] ファイルメタデータテーブル設計（mtime比較用）
- [x] スキーマレビュー

## メモ

- ファイル名: `.hienmark/cache.sqlite`
- Git連携を考慮した設計（Markdownプライマリ）

## 完了記録

**完了日:** 2025-11-06

**成果物:**
- `task-arc-1.1-schema-design.md` - スキーマ設計書（ER図、DDL、インデックス設計、バージョン管理方針）
- `task-arc-1.1-schema.sql` - SQLite用DDLファイル

**設計内容:**
- 7つのテーブル（tasks_index, folders_index, task_folders_index, assets_index, tags_index, task_tags_index, file_metadata）
- 14のインデックスによる検索性能最適化
- スキーマバージョン管理機能
- 外部キー制約によるデータ整合性保証

**実装ファイル:**
- `docs/devlog/task-arc-1.1-schema-design.md` - スキーマ設計書
- `docs/devlog/task-arc-1.1-schema.sql` - DDLファイル

**設計のポイント:**
- SQLiteはインデックス/キャッシュとしてのみ使用
- Markdownファイルがプライマリデータソース
- インデックスは100%再構築可能な設計

