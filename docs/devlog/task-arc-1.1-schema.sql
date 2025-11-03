-- Task-ARC-1.1: インデックススキーマ定義 - DDL
-- 作成日: 2025-11-06
-- 用途: SQLiteインデックス/キャッシュデータベースのスキーマ定義
-- ファイル名: .hienmark/cache.sqlite

-- 外部キー制約を有効化
PRAGMA foreign_keys = ON;

-- WALモードを有効化（パフォーマンス向上）
PRAGMA journal_mode = WAL;

-- ページサイズを最適化
PRAGMA page_size = 4096;

-- ============================================
-- スキーマバージョン管理
-- ============================================

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,     -- スキーマバージョン番号
    applied_at INTEGER NOT NULL,     -- 適用日時 (Unix timestamp UTC)
    migration_sql TEXT               -- マイグレーションSQL（ロールバック用）
);

-- ============================================
-- タスクインデックス
-- ============================================

CREATE TABLE IF NOT EXISTS tasks_index (
    id TEXT PRIMARY KEY,
    file_path TEXT UNIQUE NOT NULL,
    front_matter_json TEXT NOT NULL,  -- Front Matter全体をJSON文字列として保存
    modified_at INTEGER NOT NULL,     -- Unix timestamp (UTC)
    indexed_at INTEGER NOT NULL,      -- インデックス更新日時 (Unix timestamp UTC)
    created_at INTEGER                -- ファイル作成日時 (Unix timestamp UTC)
);

CREATE INDEX IF NOT EXISTS idx_tasks_modified_at ON tasks_index(modified_at);
CREATE INDEX IF NOT EXISTS idx_tasks_indexed_at ON tasks_index(indexed_at);

-- ============================================
-- フォルダインデックス
-- ============================================

CREATE TABLE IF NOT EXISTS folders_index (
    id TEXT PRIMARY KEY,              -- フォルダID（パスベースまたはUUID）
    parent_id TEXT,                   -- 親フォルダID（NULLの場合はルート）
    name TEXT NOT NULL,               -- フォルダ名
    path TEXT UNIQUE NOT NULL,        -- ワークスペースルートからの相対パス
    created_at INTEGER NOT NULL       -- 作成日時 (Unix timestamp UTC)
);

CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders_index(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders_index(path);

-- ============================================
-- タスク-フォルダ関連インデックス
-- ============================================

CREATE TABLE IF NOT EXISTS task_folders_index (
    task_id TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    PRIMARY KEY (task_id, folder_id),
    FOREIGN KEY (task_id) REFERENCES tasks_index(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders_index(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_folders_task_id ON task_folders_index(task_id);
CREATE INDEX IF NOT EXISTS idx_task_folders_folder_id ON task_folders_index(folder_id);

-- ============================================
-- アセットインデックス
-- ============================================

CREATE TABLE IF NOT EXISTS assets_index (
    id TEXT PRIMARY KEY,              -- アセットID（UUIDまたはファイル名ベース）
    task_id TEXT NOT NULL,            -- 関連タスクID
    file_path TEXT UNIQUE NOT NULL,   -- アセットファイルのフルパス
    relative_path TEXT NOT NULL,     -- Markdown記法で使用する相対パス
    file_size INTEGER,                -- ファイルサイズ（バイト）
    mime_type TEXT,                   -- MIMEタイプ（例: "image/png"）
    created_at INTEGER NOT NULL,      -- 作成日時 (Unix timestamp UTC)
    FOREIGN KEY (task_id) REFERENCES tasks_index(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_task_id ON assets_index(task_id);
CREATE INDEX IF NOT EXISTS idx_assets_file_path ON assets_index(file_path);

-- ============================================
-- タグインデックス
-- ============================================

CREATE TABLE IF NOT EXISTS tags_index (
    category TEXT NOT NULL,           -- タグカテゴリ（例: "status"）
    value TEXT NOT NULL,              -- タグ値（例: "pending"）
    task_count INTEGER DEFAULT 0,     -- このタグを持つタスク数
    PRIMARY KEY (category, value)
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags_index(category);
CREATE INDEX IF NOT EXISTS idx_tags_task_count ON tags_index(task_count);

-- ============================================
-- タスク-タグ関連インデックス
-- ============================================

CREATE TABLE IF NOT EXISTS task_tags_index (
    task_id TEXT NOT NULL,
    category TEXT NOT NULL,
    value TEXT NOT NULL,              -- タグ値（文字列化）
    PRIMARY KEY (task_id, category, value),
    FOREIGN KEY (task_id) REFERENCES tasks_index(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags_index(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_category_value ON task_tags_index(category, value);

-- ============================================
-- ファイルメタデータ
-- ============================================

CREATE TABLE IF NOT EXISTS file_metadata (
    file_path TEXT PRIMARY KEY,       -- ファイルパス（ワークスペースルートからの相対パス）
    mtime INTEGER NOT NULL,           -- ファイルシステムの最終更新日時 (Unix timestamp UTC)
    indexed_at INTEGER NOT NULL,      -- インデックスに追加/更新された日時 (Unix timestamp UTC)
    file_size INTEGER,                -- ファイルサイズ（バイト）
    hash TEXT                         -- ファイルハッシュ（オプション、将来的な拡張）
);

CREATE INDEX IF NOT EXISTS idx_file_metadata_mtime ON file_metadata(mtime);
CREATE INDEX IF NOT EXISTS idx_file_metadata_indexed_at ON file_metadata(indexed_at);

-- ============================================
-- 初期スキーマバージョンの記録
-- ============================================

INSERT OR IGNORE INTO schema_version (version, applied_at, migration_sql) VALUES (
    1,
    strftime('%s', 'now'),
    '-- Initial schema version 1'
);

-- ============================================
-- 整合性チェッククエリ（開発・デバッグ用）
-- ============================================

-- 孤立したtask_folders_indexレコードを検出
-- SELECT * FROM task_folders_index
-- WHERE task_id NOT IN (SELECT id FROM tasks_index)
--    OR folder_id NOT IN (SELECT id FROM folders_index);

-- 孤立したassets_indexレコードを検出
-- SELECT * FROM assets_index
-- WHERE task_id NOT IN (SELECT id FROM tasks_index);

-- 孤立したtask_tags_indexレコードを検出
-- SELECT * FROM task_tags_index
-- WHERE task_id NOT IN (SELECT id FROM tasks_index);

