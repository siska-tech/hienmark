// Asset index repository

use crate::repository::database::IndexDatabase;
use chrono::{DateTime, Utc};
use rusqlite::{params, Result as SqliteResult};

/// アセットインデックスのリポジトリトレイト
pub trait AssetIndexRepository {
    /// アセットIDからアセット情報を取得
    fn get_asset(&self, asset_id: &str) -> SqliteResult<Option<AssetIndexEntry>>;

    /// 全アセットの一覧を取得
    fn list_assets(&self) -> SqliteResult<Vec<AssetIndexEntry>>;

    /// タスクIDからアセット一覧を取得
    fn list_assets_by_task(&self, task_id: &str) -> SqliteResult<Vec<AssetIndexEntry>>;

    /// ファイルパスからアセット情報を取得
    fn get_asset_by_path(&self, file_path: &str) -> SqliteResult<Option<AssetIndexEntry>>;
}

/// アセットインデックスエントリ
#[derive(Debug, Clone)]
pub struct AssetIndexEntry {
    pub id: String,
    pub task_id: String,
    pub file_path: String,
    pub relative_path: String,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// SQLite実装
pub struct SqliteAssetIndexRepository<'a> {
    db: &'a IndexDatabase,
}

impl<'a> SqliteAssetIndexRepository<'a> {
    pub fn new(db: &'a IndexDatabase) -> Self {
        Self { db }
    }

    /// アセットを追加または更新
    pub fn upsert_asset(&self, entry: &AssetIndexEntry) -> SqliteResult<()> {
        let created_at = entry.created_at.timestamp();
        self.db.connection().execute(
            "INSERT OR REPLACE INTO assets_index (id, task_id, file_path, relative_path, file_size, mime_type, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                entry.id,
                entry.task_id,
                entry.file_path,
                entry.relative_path,
                entry.file_size,
                entry.mime_type,
                created_at
            ],
        )?;
        Ok(())
    }

    /// アセットを削除
    pub fn delete_asset(&self, asset_id: &str) -> SqliteResult<()> {
        self.db.connection().execute(
            "DELETE FROM assets_index WHERE id = ?1",
            params![asset_id],
        )?;
        Ok(())
    }

    /// タスクIDでアセットを削除
    pub fn delete_assets_by_task(&self, task_id: &str) -> SqliteResult<()> {
        self.db.connection().execute(
            "DELETE FROM assets_index WHERE task_id = ?1",
            params![task_id],
        )?;
        Ok(())
    }

    /// Unix timestampからDateTime<Utc>に変換
    fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_timestamp(timestamp, 0).unwrap_or_else(|| Utc::now())
    }
}

impl<'a> AssetIndexRepository for SqliteAssetIndexRepository<'a> {
    fn get_asset(&self, asset_id: &str) -> SqliteResult<Option<AssetIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, task_id, file_path, relative_path, file_size, mime_type, created_at
             FROM assets_index
             WHERE id = ?1",
        )?;

        let entry = stmt.query_row(params![asset_id], |row| {
            Ok(AssetIndexEntry {
                id: row.get(0)?,
                task_id: row.get(1)?,
                file_path: row.get(2)?,
                relative_path: row.get(3)?,
                file_size: row.get(4)?,
                mime_type: row.get(5)?,
                created_at: Self::timestamp_to_datetime(row.get(6)?),
            })
        });

        match entry {
            Ok(e) => Ok(Some(e)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn list_assets(&self) -> SqliteResult<Vec<AssetIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, task_id, file_path, relative_path, file_size, mime_type, created_at
             FROM assets_index
             ORDER BY created_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AssetIndexEntry {
                id: row.get(0)?,
                task_id: row.get(1)?,
                file_path: row.get(2)?,
                relative_path: row.get(3)?,
                file_size: row.get(4)?,
                mime_type: row.get(5)?,
                created_at: Self::timestamp_to_datetime(row.get(6)?),
            })
        })?;

        let mut entries = Vec::new();
        for row_result in rows {
            entries.push(row_result?);
        }

        Ok(entries)
    }

    fn list_assets_by_task(&self, task_id: &str) -> SqliteResult<Vec<AssetIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, task_id, file_path, relative_path, file_size, mime_type, created_at
             FROM assets_index
             WHERE task_id = ?1
             ORDER BY created_at DESC",
        )?;

        let rows = stmt.query_map(params![task_id], |row| {
            Ok(AssetIndexEntry {
                id: row.get(0)?,
                task_id: row.get(1)?,
                file_path: row.get(2)?,
                relative_path: row.get(3)?,
                file_size: row.get(4)?,
                mime_type: row.get(5)?,
                created_at: Self::timestamp_to_datetime(row.get(6)?),
            })
        })?;

        let mut entries = Vec::new();
        for row_result in rows {
            entries.push(row_result?);
        }

        Ok(entries)
    }

    fn get_asset_by_path(&self, file_path: &str) -> SqliteResult<Option<AssetIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, task_id, file_path, relative_path, file_size, mime_type, created_at
             FROM assets_index
             WHERE file_path = ?1",
        )?;

        let entry = stmt.query_row(params![file_path], |row| {
            Ok(AssetIndexEntry {
                id: row.get(0)?,
                task_id: row.get(1)?,
                file_path: row.get(2)?,
                relative_path: row.get(3)?,
                file_size: row.get(4)?,
                mime_type: row.get(5)?,
                created_at: Self::timestamp_to_datetime(row.get(6)?),
            })
        });

        match entry {
            Ok(e) => Ok(Some(e)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::task_index_repository::{SqliteTaskIndexRepository, TaskIndexEntry};
    use crate::models::task::{FrontMatter, TagValue};
    use tempfile::TempDir;
    use std::collections::HashMap;

    fn create_test_task_entry() -> TaskIndexEntry {
        let mut tags = HashMap::new();
        tags.insert("status".to_string(), TagValue::String("pending".to_string()));
        let front_matter = FrontMatter { tags };

        TaskIndexEntry {
            id: "task-1".to_string(),
            file_path: "task-1.md".to_string(),
            front_matter,
            modified_at: Utc::now(),
            indexed_at: Utc::now(),
            created_at: Some(Utc::now()),
        }
    }

    #[test]
    fn test_upsert_and_get_asset() {
        let temp_dir = TempDir::new().unwrap();
        let db = IndexDatabase::new(temp_dir.path()).unwrap();
        
        // まずタスクを作成（外部キー制約のため）
        let task_repo = SqliteTaskIndexRepository::new(&db);
        let task_entry = create_test_task_entry();
        task_repo.upsert_task(&task_entry).unwrap();

        let asset_repo = SqliteAssetIndexRepository::new(&db);
        let entry = AssetIndexEntry {
            id: "asset-1".to_string(),
            task_id: "task-1".to_string(),
            file_path: "/path/to/asset.png".to_string(),
            relative_path: ".hienmark/assets/asset.png".to_string(),
            file_size: Some(1024),
            mime_type: Some("image/png".to_string()),
            created_at: Utc::now(),
        };

        asset_repo.upsert_asset(&entry).unwrap();
        let retrieved = asset_repo.get_asset("asset-1").unwrap().unwrap();

        assert_eq!(retrieved.id, "asset-1");
        assert_eq!(retrieved.task_id, "task-1");
    }

    #[test]
    fn test_list_assets_by_task() {
        let temp_dir = TempDir::new().unwrap();
        let db = IndexDatabase::new(temp_dir.path()).unwrap();
        
        // まずタスクを作成（外部キー制約のため）
        let task_repo = SqliteTaskIndexRepository::new(&db);
        let task_entry = create_test_task_entry();
        task_repo.upsert_task(&task_entry).unwrap();

        let asset_repo = SqliteAssetIndexRepository::new(&db);
        let entry = AssetIndexEntry {
            id: "asset-1".to_string(),
            task_id: "task-1".to_string(),
            file_path: "/path/to/asset.png".to_string(),
            relative_path: ".hienmark/assets/asset.png".to_string(),
            file_size: None,
            mime_type: None,
            created_at: Utc::now(),
        };

        asset_repo.upsert_asset(&entry).unwrap();
        let assets = asset_repo.list_assets_by_task("task-1").unwrap();
        assert_eq!(assets.len(), 1);
    }
}

