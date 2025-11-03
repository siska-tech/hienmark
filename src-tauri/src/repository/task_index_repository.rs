// Task index repository

use crate::models::task::FrontMatter;
use crate::repository::database::IndexDatabase;
use chrono::{DateTime, Utc};
use rusqlite::{params, Result as SqliteResult};
use serde_json;

/// タスクインデックスの読み取り専用リポジトリトレイト
pub trait TaskIndexRepository {
    /// タスクIDからタスク情報を取得
    fn get_task(&self, task_id: &str) -> SqliteResult<Option<TaskIndexEntry>>;

    /// 全タスクの一覧を取得
    fn list_tasks(&self) -> SqliteResult<Vec<TaskIndexEntry>>;

    /// ファイルパスからタスク情報を取得
    fn get_task_by_path(&self, file_path: &str) -> SqliteResult<Option<TaskIndexEntry>>;

    /// 更新日時順にタスクを取得
    fn list_tasks_by_modified_at(&self, limit: Option<i64>) -> SqliteResult<Vec<TaskIndexEntry>>;
}

/// タスクインデックスエントリ（データベースから取得した情報）
#[derive(Debug, Clone)]
pub struct TaskIndexEntry {
    pub id: String,
    pub file_path: String,
    pub front_matter: FrontMatter,
    pub modified_at: DateTime<Utc>,
    pub indexed_at: DateTime<Utc>,
    pub created_at: Option<DateTime<Utc>>,
}

/// SQLite実装
pub struct SqliteTaskIndexRepository<'a> {
    db: &'a IndexDatabase,
}

impl<'a> SqliteTaskIndexRepository<'a> {
    pub fn new(db: &'a IndexDatabase) -> Self {
        Self { db }
    }

    /// タスクをインデックスに追加または更新
    pub fn upsert_task(&self, entry: &TaskIndexEntry) -> SqliteResult<()> {
        let front_matter_json = serde_json::to_string(&entry.front_matter)
            .map_err(|e| {
                rusqlite::Error::InvalidColumnType(
                    0,
                    format!("JSON serialization error: {}", e),
                    rusqlite::types::Type::Null,
                )
            })?;

        let modified_at = entry.modified_at.timestamp();
        let indexed_at = entry.indexed_at.timestamp();
        let created_at = entry.created_at.map(|dt| dt.timestamp());

        self.db.connection().execute(
            "INSERT OR REPLACE INTO tasks_index (id, file_path, front_matter_json, modified_at, indexed_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                entry.id,
                entry.file_path,
                front_matter_json,
                modified_at,
                indexed_at,
                created_at
            ],
        )?;

        Ok(())
    }

    /// タスクを削除
    pub fn delete_task(&self, task_id: &str) -> SqliteResult<()> {
        self.db.connection().execute(
            "DELETE FROM tasks_index WHERE id = ?1",
            params![task_id],
        )?;
        Ok(())
    }

    /// ファイルパスでタスクを削除
    pub fn delete_task_by_path(&self, file_path: &str) -> SqliteResult<()> {
        self.db.connection().execute(
            "DELETE FROM tasks_index WHERE file_path = ?1",
            params![file_path],
        )?;
        Ok(())
    }

    /// Front MatterをJSON文字列からデシリアライズ
    fn deserialize_front_matter(json: &str) -> SqliteResult<FrontMatter> {
        serde_json::from_str(json).map_err(|e| {
            rusqlite::Error::InvalidColumnType(
                0,
                format!("JSON deserialization error: {}", e),
                rusqlite::types::Type::Null,
            )
        })
    }

    /// Unix timestampからDateTime<Utc>に変換
    fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_timestamp(timestamp, 0).unwrap_or_else(|| Utc::now())
    }
}

impl<'a> TaskIndexRepository for SqliteTaskIndexRepository<'a> {
    fn get_task(&self, task_id: &str) -> SqliteResult<Option<TaskIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, file_path, front_matter_json, modified_at, indexed_at, created_at
             FROM tasks_index
             WHERE id = ?1",
        )?;

        let entry = stmt.query_row(params![task_id], |row| {
            Ok(TaskIndexEntry {
                id: row.get(0)?,
                file_path: row.get(1)?,
                front_matter: Self::deserialize_front_matter(
                    row.get::<_, String>(2)?.as_str(),
                )?,
                modified_at: Self::timestamp_to_datetime(row.get(3)?),
                indexed_at: Self::timestamp_to_datetime(row.get(4)?),
                created_at: row.get::<_, Option<i64>>(5)?.map(Self::timestamp_to_datetime),
            })
        });

        match entry {
            Ok(e) => Ok(Some(e)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn list_tasks(&self) -> SqliteResult<Vec<TaskIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, file_path, front_matter_json, modified_at, indexed_at, created_at
             FROM tasks_index
             ORDER BY id",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(TaskIndexEntry {
                id: row.get(0)?,
                file_path: row.get(1)?,
                front_matter: Self::deserialize_front_matter(
                    row.get::<_, String>(2)?.as_str(),
                )?,
                modified_at: Self::timestamp_to_datetime(row.get(3)?),
                indexed_at: Self::timestamp_to_datetime(row.get(4)?),
                created_at: row.get::<_, Option<i64>>(5)?.map(Self::timestamp_to_datetime),
            })
        })?;

        let mut entries = Vec::new();
        for row_result in rows {
            entries.push(row_result?);
        }

        Ok(entries)
    }

    fn get_task_by_path(&self, file_path: &str) -> SqliteResult<Option<TaskIndexEntry>> {
        let mut stmt = self.db.connection().prepare(
            "SELECT id, file_path, front_matter_json, modified_at, indexed_at, created_at
             FROM tasks_index
             WHERE file_path = ?1",
        )?;

        let entry = stmt.query_row(params![file_path], |row| {
            Ok(TaskIndexEntry {
                id: row.get(0)?,
                file_path: row.get(1)?,
                front_matter: Self::deserialize_front_matter(
                    row.get::<_, String>(2)?.as_str(),
                )?,
                modified_at: Self::timestamp_to_datetime(row.get(3)?),
                indexed_at: Self::timestamp_to_datetime(row.get(4)?),
                created_at: row.get::<_, Option<i64>>(5)?.map(Self::timestamp_to_datetime),
            })
        });

        match entry {
            Ok(e) => Ok(Some(e)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn list_tasks_by_modified_at(&self, limit: Option<i64>) -> SqliteResult<Vec<TaskIndexEntry>> {
        let query = if let Some(limit) = limit {
            format!(
                "SELECT id, file_path, front_matter_json, modified_at, indexed_at, created_at
                 FROM tasks_index
                 ORDER BY modified_at DESC
                 LIMIT {}",
                limit
            )
        } else {
            "SELECT id, file_path, front_matter_json, modified_at, indexed_at, created_at
             FROM tasks_index
             ORDER BY modified_at DESC"
                .to_string()
        };

        let mut stmt = self.db.connection().prepare(&query)?;
        let rows = stmt.query_map([], |row| {
            Ok(TaskIndexEntry {
                id: row.get(0)?,
                file_path: row.get(1)?,
                front_matter: Self::deserialize_front_matter(
                    row.get::<_, String>(2)?.as_str(),
                )?,
                modified_at: Self::timestamp_to_datetime(row.get(3)?),
                indexed_at: Self::timestamp_to_datetime(row.get(4)?),
                created_at: row.get::<_, Option<i64>>(5)?.map(Self::timestamp_to_datetime),
            })
        })?;

        let mut entries = Vec::new();
        for row_result in rows {
            entries.push(row_result?);
        }

        Ok(entries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::task::{FrontMatter, TagValue};
    use tempfile::TempDir;
    use std::collections::HashMap;

    fn create_test_front_matter() -> FrontMatter {
        let mut tags = HashMap::new();
        tags.insert("status".to_string(), TagValue::String("pending".to_string()));
        tags.insert("priority".to_string(), TagValue::String("high".to_string()));
        FrontMatter { tags }
    }

    #[test]
    fn test_upsert_and_get_task() {
        let temp_dir = TempDir::new().unwrap();
        let db = IndexDatabase::new(temp_dir.path()).unwrap();
        let repo = SqliteTaskIndexRepository::new(&db);

        let entry = TaskIndexEntry {
            id: "test-task".to_string(),
            file_path: "tasks/test-task.md".to_string(),
            front_matter: create_test_front_matter(),
            modified_at: Utc::now(),
            indexed_at: Utc::now(),
            created_at: Some(Utc::now()),
        };

        repo.upsert_task(&entry).unwrap();
        let retrieved = repo.get_task("test-task").unwrap().unwrap();

        assert_eq!(retrieved.id, "test-task");
        assert_eq!(retrieved.file_path, "tasks/test-task.md");
    }

    #[test]
    fn test_delete_task() {
        let temp_dir = TempDir::new().unwrap();
        let db = IndexDatabase::new(temp_dir.path()).unwrap();
        let repo = SqliteTaskIndexRepository::new(&db);

        let entry = TaskIndexEntry {
            id: "test-task".to_string(),
            file_path: "tasks/test-task.md".to_string(),
            front_matter: create_test_front_matter(),
            modified_at: Utc::now(),
            indexed_at: Utc::now(),
            created_at: Some(Utc::now()),
        };

        repo.upsert_task(&entry).unwrap();
        repo.delete_task("test-task").unwrap();
        let retrieved = repo.get_task("test-task").unwrap();
        assert!(retrieved.is_none());
    }
}
