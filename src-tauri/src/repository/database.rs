// Database connection and schema management

use rusqlite::{Connection, Result as SqliteResult};
use std::path::Path;

/// SQLiteインデックスデータベース管理
pub struct IndexDatabase {
    connection: Connection,
}

impl IndexDatabase {
    /// 新しいデータベース接続を作成
    ///
    /// # Arguments
    /// * `workspace_root` - ワークスペースのルートディレクトリ
    ///
    /// # Returns
    /// * `Result<IndexDatabase, rusqlite::Error>` - データベース接続
    pub fn new(workspace_root: &Path) -> SqliteResult<Self> {
        // .hienmarkディレクトリを作成（存在しない場合）
        let hienmark_dir = workspace_root.join(".hienmark");
        std::fs::create_dir_all(&hienmark_dir).map_err(|e| {
            rusqlite::Error::InvalidPath(format!("Failed to create .hienmark directory: {}", e).into())
        })?;

        let db_path = hienmark_dir.join("cache.sqlite");
        let connection = Connection::open(&db_path)?;

        // 外部キー制約を有効化（結果を返さない）
        connection.execute("PRAGMA foreign_keys = ON", [])?;

        // WALモードを有効化（パフォーマンス向上）
        // PRAGMA journal_modeは現在の設定値を返すため、結果を読み取る必要がある
        let _journal_mode: String = connection.query_row(
            "PRAGMA journal_mode = WAL",
            [],
            |row| row.get(0),
        )?;

        // ページサイズを最適化（結果を返さない）
        connection.execute("PRAGMA page_size = 4096", [])?;

        let db = Self { connection };
        
        // スキーマを初期化
        db.initialize_schema()?;

        Ok(db)
    }

    /// スキーマを初期化
    fn initialize_schema(&self) -> SqliteResult<()> {
        // まずschema_versionテーブルを作成（存在しない場合）
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at INTEGER NOT NULL,
                migration_sql TEXT
            )",
            [],
        )?;

        let current_version = self.get_current_version()?;

        if current_version < 1 {
            self.create_schema_v1()?;
            self.set_version(1)?;
        }

        // 将来のマイグレーションをここに追加
        // if current_version < 2 {
        //     self.migrate_to_v2()?;
        //     self.set_version(2)?;
        // }

        Ok(())
    }

    /// スキーマバージョン1を作成
    fn create_schema_v1(&self) -> SqliteResult<()> {
        // 注意: schema_versionテーブルはinitialize_schema()で既に作成されている
        
        // タスクインデックス
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS tasks_index (
                id TEXT PRIMARY KEY,
                file_path TEXT UNIQUE NOT NULL,
                front_matter_json TEXT NOT NULL,
                modified_at INTEGER NOT NULL,
                indexed_at INTEGER NOT NULL,
                created_at INTEGER
            )",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_modified_at ON tasks_index(modified_at)",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_indexed_at ON tasks_index(indexed_at)",
            [],
        )?;

        // フォルダインデックス
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS folders_index (
                id TEXT PRIMARY KEY,
                parent_id TEXT,
                name TEXT NOT NULL,
                path TEXT UNIQUE NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders_index(parent_id)",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_folders_path ON folders_index(path)",
            [],
        )?;

        // タスク-フォルダ関連インデックス
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS task_folders_index (
                task_id TEXT NOT NULL,
                folder_id TEXT NOT NULL,
                PRIMARY KEY (task_id, folder_id),
                FOREIGN KEY (task_id) REFERENCES tasks_index(id) ON DELETE CASCADE,
                FOREIGN KEY (folder_id) REFERENCES folders_index(id) ON DELETE CASCADE
            )",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_folders_task_id ON task_folders_index(task_id)",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_folders_folder_id ON task_folders_index(folder_id)",
            [],
        )?;

        // アセットインデックス
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS assets_index (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                file_path TEXT UNIQUE NOT NULL,
                relative_path TEXT NOT NULL,
                file_size INTEGER,
                mime_type TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks_index(id) ON DELETE CASCADE
            )",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_assets_task_id ON assets_index(task_id)",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_assets_file_path ON assets_index(file_path)",
            [],
        )?;

        // タグインデックス
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS tags_index (
                category TEXT NOT NULL,
                value TEXT NOT NULL,
                task_count INTEGER DEFAULT 0,
                PRIMARY KEY (category, value)
            )",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_tags_category ON tags_index(category)",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_tags_task_count ON tags_index(task_count)",
            [],
        )?;

        // タスク-タグ関連インデックス
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS task_tags_index (
                task_id TEXT NOT NULL,
                category TEXT NOT NULL,
                value TEXT NOT NULL,
                PRIMARY KEY (task_id, category, value),
                FOREIGN KEY (task_id) REFERENCES tasks_index(id) ON DELETE CASCADE
            )",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags_index(task_id)",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_tags_category_value ON task_tags_index(category, value)",
            [],
        )?;

        // ファイルメタデータ
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS file_metadata (
                file_path TEXT PRIMARY KEY,
                mtime INTEGER NOT NULL,
                indexed_at INTEGER NOT NULL,
                file_size INTEGER,
                hash TEXT
            )",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_file_metadata_mtime ON file_metadata(mtime)",
            [],
        )?;

        self.connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_file_metadata_indexed_at ON file_metadata(indexed_at)",
            [],
        )?;

        Ok(())
    }

    /// 現在のスキーマバージョンを取得
    pub fn get_current_version(&self) -> SqliteResult<i32> {
        // schema_versionテーブルが存在するか確認
        let table_exists: bool = match self.connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='schema_version'",
            [],
            |row| {
                let count: i32 = row.get(0)?;
                Ok(count > 0)
            },
        ) {
            Ok(exists) => exists,
            Err(_) => false,
        };

        if !table_exists {
            return Ok(0);
        }

        // schema_versionテーブルが存在する場合、最大バージョンを取得
        match self.connection.query_row(
            "SELECT MAX(version) FROM schema_version",
            [],
            |row| {
                let v: Option<i32> = row.get(0)?;
                Ok(v.unwrap_or(0))
            },
        ) {
            Ok(v) => Ok(v),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(0),
            Err(e) => Err(e),
        }
    }

    /// スキーマバージョンを設定
    fn set_version(&self, version: i32) -> SqliteResult<()> {
        let now = chrono::Utc::now().timestamp();
        self.connection.execute(
            "INSERT OR REPLACE INTO schema_version (version, applied_at, migration_sql) VALUES (?1, ?2, ?3)",
            rusqlite::params![version, now, "-- Initial schema version 1"],
        )?;
        Ok(())
    }

    /// データベース接続への参照を取得（内部使用）
    pub(crate) fn connection(&self) -> &Connection {
        &self.connection
    }

    /// データベース接続への可変参照を取得（内部使用）
    pub(crate) fn connection_mut(&mut self) -> &mut Connection {
        &mut self.connection
    }

    /// トランザクションを開始
    pub fn transaction(&mut self) -> SqliteResult<rusqlite::Transaction> {
        self.connection.transaction()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_create_database() {
        let temp_dir = TempDir::new().unwrap();
        let db = IndexDatabase::new(temp_dir.path()).unwrap();
        assert_eq!(db.get_current_version().unwrap(), 1);
    }

    #[test]
    fn test_schema_creation() {
        let temp_dir = TempDir::new().unwrap();
        let db = IndexDatabase::new(temp_dir.path()).unwrap();
        
        // テーブルが作成されているか確認
        let table_count: i32 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert!(table_count >= 7); // 最低7つのテーブルが存在
    }
}

