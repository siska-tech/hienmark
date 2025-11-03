// Index builder service - builds index from Markdown files

use crate::parser::FrontMatterParser;
use crate::repository::database::IndexDatabase;
use crate::repository::task_index_repository::{
    SqliteTaskIndexRepository, TaskIndexEntry, TaskIndexRepository,
};
use chrono::{DateTime, Utc};
use rusqlite::Result as SqliteResult;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// インデックスビルダーサービス
/// MarkdownファイルからSQLiteインデックスを構築する
pub struct IndexBuilder {
    db: IndexDatabase,
}

impl IndexBuilder {
    /// 新しいインデックスビルダーを作成
    ///
    /// # Arguments
    /// * `workspace_root` - ワークスペースのルートディレクトリ
    ///
    /// # Returns
    /// * `Result<IndexBuilder, rusqlite::Error>` - インデックスビルダー
    pub fn new(workspace_root: &Path) -> SqliteResult<Self> {
        let db = IndexDatabase::new(workspace_root)?;
        Ok(Self { db })
    }

    /// ワークスペース内の全Markdownファイルからインデックスを構築
    ///
    /// # Arguments
    /// * `workspace_root` - ワークスペースのルートディレクトリ
    ///
    /// # Returns
    /// * `Result<BuildResult, io::Error>` - 構築結果
    pub fn build_from_workspace(&mut self, workspace_root: &Path) -> Result<BuildResult, io::Error> {
        let mut result = BuildResult {
            tasks_indexed: 0,
            tasks_updated: 0,
            tasks_skipped: 0,
            errors: Vec::new(),
        };

        // .mdファイルをスキャン
        let md_files = self.scan_markdown_files(workspace_root)?;

        // トランザクションは将来的に実装（現時点では不要）
        // 将来的な拡張用にコメントアウト
        // let transaction = self.db.transaction().map_err(|e| {
        //     io::Error::new(io::ErrorKind::Other, format!("Database transaction error: {}", e))
        // })?;
        
        let task_repo = SqliteTaskIndexRepository::new(&self.db);

        for file_path in md_files {
            match self.process_task_file(&file_path, workspace_root, &task_repo) {
                Ok(TaskProcessResult::Indexed) => result.tasks_indexed += 1,
                Ok(TaskProcessResult::Updated) => result.tasks_updated += 1,
                Ok(TaskProcessResult::Skipped) => result.tasks_skipped += 1,
                Err(e) => {
                    result.errors.push(format!("{}: {}", file_path.display(), e));
                }
            }
        }

        Ok(result)
    }

    /// 単一のタスクファイルを処理してインデックスに追加または更新
    ///
    /// # Arguments
    /// * `file_path` - タスクファイルのパス
    /// * `workspace_root` - ワークスペースのルートディレクトリ
    /// * `task_repo` - タスクインデックスリポジトリ
    ///
    /// # Returns
    /// * `Result<TaskProcessResult, io::Error>` - 処理結果
    pub fn process_task_file(
        &self,
        file_path: &Path,
        workspace_root: &Path,
        task_repo: &SqliteTaskIndexRepository,
    ) -> Result<TaskProcessResult, io::Error> {
        // ファイルを読み込む
        let content = fs::read_to_string(file_path)?;

        // ファイルのメタデータから最終更新日時を取得
        let metadata = fs::metadata(file_path)?;
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .ok()
                    .map(|d| d.as_secs() as i64)
            })
            .and_then(|timestamp| DateTime::from_timestamp(timestamp, 0))
            .unwrap_or_else(|| Utc::now());

        let created_at = metadata
            .created()
            .ok()
            .and_then(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .ok()
                    .map(|d| d.as_secs() as i64)
            })
            .and_then(|timestamp| DateTime::from_timestamp(timestamp, 0));

        // Front Matterをパース
        let (front_matter, _body, _tag_order) =
            FrontMatterParser::parse_with_order(&content).map_err(|e| {
                io::Error::new(io::ErrorKind::InvalidData, format!("Parse error: {}", e))
            })?;

        // タスクIDを取得（ファイル名、拡張子なし）
        let task_id = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
            .ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "Cannot extract task ID from file path",
                )
            })?;

        // ワークスペースルートからの相対パスを取得
        let relative_path = file_path
            .strip_prefix(workspace_root)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| file_path.to_string_lossy().to_string());

        // TaskIndexEntryを作成
        let entry = TaskIndexEntry {
            id: task_id.clone(),
            file_path: relative_path,
            front_matter,
            modified_at,
            indexed_at: Utc::now(),
            created_at,
        };

        // 既存のエントリをチェック
        let existing = task_repo.get_task(&task_id).map_err(|e| {
            io::Error::new(io::ErrorKind::Other, format!("Database query error: {}", e))
        })?;

        let result = if let Some(existing_entry) = existing {
            // 既存エントリがある場合、更新日時を比較
            if existing_entry.modified_at < modified_at {
                // 更新されているのでインデックスを更新
                task_repo.upsert_task(&entry).map_err(|e| {
                    io::Error::new(io::ErrorKind::Other, format!("Database update error: {}", e))
                })?;
                TaskProcessResult::Updated
            } else {
                // 変更なし
                TaskProcessResult::Skipped
            }
        } else {
            // 新規エントリ
            task_repo.upsert_task(&entry).map_err(|e| {
                io::Error::new(io::ErrorKind::Other, format!("Database insert error: {}", e))
            })?;
            TaskProcessResult::Indexed
        };

        Ok(result)
    }

    /// ディレクトリ内の全.mdファイルをスキャン（再帰的）
    ///
    /// # Arguments
    /// * `dir` - スキャンするディレクトリ
    ///
    /// # Returns
    /// * `Result<Vec<PathBuf>, io::Error>` - 見つかった.mdファイルのパスリスト
    fn scan_markdown_files(&self, dir: &Path) -> Result<Vec<PathBuf>, io::Error> {
        let mut md_files = Vec::new();

        if !dir.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Path is not a directory",
            ));
        }

        self.scan_recursive(dir, &mut md_files)?;

        // ファイル名順にソート
        md_files.sort();

        Ok(md_files)
    }

    /// 再帰的にディレクトリをスキャン
    fn scan_recursive(&self, dir: &Path, md_files: &mut Vec<PathBuf>) -> Result<(), io::Error> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // 隠しディレクトリをスキップ（.hienmarkもスキップ）
                if let Some(dir_name) = path.file_name() {
                    let dir_name_str = dir_name.to_string_lossy();
                    if dir_name_str.starts_with('.') {
                        continue;
                    }
                }
                // 再帰的にスキャン
                self.scan_recursive(&path, md_files)?;
            } else if path.is_file() {
                // .mdファイルのみ追加
                if let Some(ext) = path.extension() {
                    if ext == "md" {
                        md_files.push(path);
                    }
                }
            }
        }

        Ok(())
    }

    /// データベース接続への参照を取得
    pub fn database(&self) -> &IndexDatabase {
        &self.db
    }
}

/// タスク処理結果
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TaskProcessResult {
    /// 新規にインデックスに追加された
    Indexed,
    /// 既存エントリが更新された
    Updated,
    /// 変更がないためスキップされた
    Skipped,
}

/// インデックス構築結果
#[derive(Debug, Clone)]
pub struct BuildResult {
    /// 新規にインデックスに追加されたタスク数
    pub tasks_indexed: usize,
    /// 更新されたタスク数
    pub tasks_updated: usize,
    /// スキップされたタスク数（変更なし）
    pub tasks_skipped: usize,
    /// エラーリスト
    pub errors: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    // Note: FrontMatter, TagValue, HashMap are unused in tests but kept for future use
    use tempfile::TempDir;

    #[test]
    fn test_build_from_workspace() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_root = temp_dir.path();

        // テスト用のMarkdownファイルを作成
        let task_file = workspace_root.join("test-task.md");
        let content = r#"---
status: pending
priority: high
---

# Test Task

This is a test task.
"#;
        std::fs::write(&task_file, content).unwrap();

        let mut builder = IndexBuilder::new(workspace_root).unwrap();
        let result = builder.build_from_workspace(workspace_root).unwrap();

        assert_eq!(result.tasks_indexed, 1);
        assert_eq!(result.errors.len(), 0);
    }

    #[test]
    fn test_process_task_file() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_root = temp_dir.path();

        let task_file = workspace_root.join("test-task.md");
        let content = r#"---
status: pending
---

# Test Task
"#;
        std::fs::write(&task_file, content).unwrap();

        let builder = IndexBuilder::new(workspace_root).unwrap();
        let task_repo = SqliteTaskIndexRepository::new(builder.database());

        let result = builder
            .process_task_file(&task_file, workspace_root, &task_repo)
            .unwrap();

        assert_eq!(result, TaskProcessResult::Indexed);

        // 再度処理するとスキップされる
        let result2 = builder
            .process_task_file(&task_file, workspace_root, &task_repo)
            .unwrap();
        assert_eq!(result2, TaskProcessResult::Skipped);
    }
}

