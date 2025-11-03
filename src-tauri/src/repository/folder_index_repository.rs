// Folder index repository

use crate::repository::database::IndexDatabase;
use chrono::{DateTime, Utc};
use rusqlite::{params, Result as SqliteResult};
use std::collections::HashMap;

/// フォルダインデックスのリポジトリトレイト
pub trait FolderIndexRepository {
    /// フォルダIDからフォルダ情報を取得
    fn get_folder(&self, folder_id: &str) -> SqliteResult<Option<FolderIndexEntry>>;

    /// 全フォルダの一覧を取得
    fn list_folders(&self) -> SqliteResult<Vec<FolderIndexEntry>>;

    /// パスからフォルダ情報を取得
    fn get_folder_by_path(&self, path: &str) -> SqliteResult<Option<FolderIndexEntry>>;

    /// 親フォルダIDから子フォルダ一覧を取得
    fn list_child_folders(&self, parent_id: Option<&str>) -> SqliteResult<Vec<FolderIndexEntry>>;

    /// フォルダ階層構造を取得（親から子へのマップ）
    fn get_folder_tree(&self) -> SqliteResult<HashMap<Option<String>, Vec<FolderIndexEntry>>>;
}

/// フォルダインデックスエントリ
#[derive(Debug, Clone)]
pub struct FolderIndexEntry {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub path: String,
    pub created_at: DateTime<Utc>,
}

/// SQLite実装
pub struct SqliteFolderIndexRepository<'a> {
    db: &'a IndexDatabase,
}

impl<'a> SqliteFolderIndexRepository<'a> {
    pub fn new(db: &'a IndexDatabase) -> Self {
        Self { db }
    }

    /// フォルダを追加または更新
    pub fn upsert_folder(&self, entry: &FolderIndexEntry) -> SqliteResult<()> {
        let created_at = entry.created_at.timestamp();
        self.db.connection().execute(
            "INSERT OR REPLACE INTO folders_index (id, parent_id, name, path, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![entry.id, entry.parent_id, entry.name, entry.path, created_at],
        )?;
        Ok(())
    }

    /// フォルダを削除
    pub fn delete_folder(&self, folder_id: &str) -> SqliteResult<()> {
        self.db.connection().execute(
            "DELETE FROM folders_index WHERE id = ?1",
            params![folder_id],
        )?;
        Ok(())
    }

    /// Unix timestampからDateTime<Utc>に変換
    fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_timestamp(timestamp, 0).unwrap_or_else(|| Utc::now())
    }
}

impl<'a> FolderIndexRepository for SqliteFolderIndexRepository<'a> {
    fn get_folder(&self, folder_id: &str) -> SqliteResult<Option<FolderIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, parent_id, name, path, created_at
             FROM folders_index
             WHERE id = ?1",
        )?;

        let entry = stmt.query_row(params![folder_id], |row| {
            Ok(FolderIndexEntry {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                created_at: Self::timestamp_to_datetime(row.get(4)?),
            })
        });

        match entry {
            Ok(e) => Ok(Some(e)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn list_folders(&self) -> SqliteResult<Vec<FolderIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, parent_id, name, path, created_at
             FROM folders_index
             ORDER BY path",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(FolderIndexEntry {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                created_at: Self::timestamp_to_datetime(row.get(4)?),
            })
        })?;

        let mut entries = Vec::new();
        for row_result in rows {
            entries.push(row_result?);
        }

        Ok(entries)
    }

    fn get_folder_by_path(&self, path: &str) -> SqliteResult<Option<FolderIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, parent_id, name, path, created_at
             FROM folders_index
             WHERE path = ?1",
        )?;

        let entry = stmt.query_row(params![path], |row| {
            Ok(FolderIndexEntry {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                created_at: Self::timestamp_to_datetime(row.get(4)?),
            })
        });

        match entry {
            Ok(e) => Ok(Some(e)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn list_child_folders(&self, parent_id: Option<&str>) -> SqliteResult<Vec<FolderIndexEntry>> {
        let mut entries = Vec::new();
        
        if let Some(parent_id) = parent_id {
            let mut stmt = self.db.connection().prepare(
                "SELECT id, parent_id, name, path, created_at
                 FROM folders_index
                 WHERE parent_id = ?1
                 ORDER BY name"
            )?;
            
            let rows = stmt.query_map(params![parent_id], |row| {
                Ok(FolderIndexEntry {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    name: row.get(2)?,
                    path: row.get(3)?,
                    created_at: Self::timestamp_to_datetime(row.get(4)?),
                })
            })?;
            
            for row_result in rows {
                entries.push(row_result?);
            }
        } else {
            let mut stmt = self.db.connection().prepare(
                "SELECT id, parent_id, name, path, created_at
                 FROM folders_index
                 WHERE parent_id IS NULL
                 ORDER BY name"
            )?;
            
            let rows = stmt.query_map([], |row| {
                Ok(FolderIndexEntry {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    name: row.get(2)?,
                    path: row.get(3)?,
                    created_at: Self::timestamp_to_datetime(row.get(4)?),
                })
            })?;
            
            for row_result in rows {
                entries.push(row_result?);
            }
        }

        Ok(entries)
    }

    fn get_folder_tree(&self) -> SqliteResult<HashMap<Option<String>, Vec<FolderIndexEntry>>> {
        let all_folders = self.list_folders()?;
        let mut tree: HashMap<Option<String>, Vec<FolderIndexEntry>> = HashMap::new();

        for folder in all_folders {
            tree.entry(folder.parent_id.clone())
                .or_insert_with(Vec::new)
                .push(folder);
        }

        Ok(tree)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_upsert_and_get_folder() {
        let temp_dir = TempDir::new().unwrap();
        let db = IndexDatabase::new(temp_dir.path()).unwrap();
        let repo = SqliteFolderIndexRepository::new(&db);

        let entry = FolderIndexEntry {
            id: "folder-1".to_string(),
            parent_id: None,
            name: "tasks".to_string(),
            path: "tasks".to_string(),
            created_at: Utc::now(),
        };

        repo.upsert_folder(&entry).unwrap();
        let retrieved = repo.get_folder("folder-1").unwrap().unwrap();

        assert_eq!(retrieved.id, "folder-1");
        assert_eq!(retrieved.name, "tasks");
    }

    #[test]
    fn test_list_child_folders() {
        let temp_dir = TempDir::new().unwrap();
        let db = IndexDatabase::new(temp_dir.path()).unwrap();
        let repo = SqliteFolderIndexRepository::new(&db);

        // 親フォルダ
        let parent = FolderIndexEntry {
            id: "parent".to_string(),
            parent_id: None,
            name: "parent".to_string(),
            path: "parent".to_string(),
            created_at: Utc::now(),
        };

        // 子フォルダ
        let child = FolderIndexEntry {
            id: "child".to_string(),
            parent_id: Some("parent".to_string()),
            name: "child".to_string(),
            path: "parent/child".to_string(),
            created_at: Utc::now(),
        };

        repo.upsert_folder(&parent).unwrap();
        repo.upsert_folder(&child).unwrap();

        let root_folders = repo.list_child_folders(None).unwrap();
        assert_eq!(root_folders.len(), 1);

        let child_folders = repo.list_child_folders(Some("parent")).unwrap();
        assert_eq!(child_folders.len(), 1);
    }
}

