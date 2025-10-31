use crate::models::{Task, Workspace, WorkspaceConfig};
use crate::parser::FrontMatterParser;
use chrono::Utc;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// ワークスペース管理サービス
pub struct WorkspaceService;

impl WorkspaceService {
    pub fn new() -> Self {
        Self
    }

    /// 指定されたディレクトリから全タスクを読み込む
    ///
    /// # Arguments
    /// * `root_path` - ワークスペースのルートディレクトリ
    ///
    /// # Returns
    /// * `Result<Workspace, io::Error>` - 読み込まれたワークスペース
    pub fn load_workspace(&self, root_path: PathBuf) -> Result<Workspace, io::Error> {
        let mut workspace = Workspace::new(root_path.clone());

        // 設定ファイルを読み込む
        if let Ok(config) = Self::load_config(root_path.to_str().unwrap()) {
            workspace.config = config;
        }

        // .mdファイルをスキャン
        let md_files = self.scan_markdown_files(&root_path)?;

        // 各ファイルを読み込んでTaskに変換
        for file_path in md_files {
            if let Ok(task) = self.load_task(&file_path) {
                // タスクIDはファイル名（拡張子なし）
                let task_id = file_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                // タグインデックスを更新
                workspace.tag_index.index_task(&task_id, &task.front_matter.tags);

                workspace.tasks.insert(task_id, task);
            }
        }

        Ok(workspace)
    }

    /// 単一のタスクファイルを読み込む
    ///
    /// # Arguments
    /// * `file_path` - タスクファイルのパス
    ///
    /// # Returns
    /// * `Result<Task, io::Error>` - 読み込まれたタスク
    pub fn load_task(&self, file_path: &Path) -> Result<Task, io::Error> {
        let content = fs::read_to_string(file_path)?;

        // ファイルのメタデータから最終更新日時を取得
        let metadata = fs::metadata(file_path)?;
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.elapsed().ok())
            .map(|elapsed| Utc::now() - chrono::Duration::from_std(elapsed).unwrap_or_default())
            .unwrap_or_else(Utc::now);

        // Front Matterをパース（タグ順序も取得）
        let (front_matter, body, tag_order) = FrontMatterParser::parse_with_order(&content)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

        // タスクIDを取得
        let task_id = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        Ok(Task {
            id: task_id,
            file_path: file_path.to_path_buf(),
            front_matter,
            content: body,
            modified_at,
            tag_order: if tag_order.is_empty() { None } else { Some(tag_order) },
        })
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
                // 隠しディレクトリをスキップ
                if let Some(dir_name) = path.file_name() {
                    if dir_name.to_string_lossy().starts_with('.') {
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

    /// タスクをファイルに保存
    ///
    /// # Arguments
    /// * `task` - 保存するタスク
    ///
    /// # Returns
    /// * `Result<(), io::Error>` - 保存結果
    pub fn save_task(&self, task: &Task) -> Result<(), io::Error> {
        // Front MatterとBodyを結合（タグ順序を保持）
        let content = FrontMatterParser::serialize_with_order(
            &task.front_matter,
            &task.content,
            task.tag_order.as_ref()
        )
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

        // ファイルに書き込み
        fs::write(&task.file_path, content)?;

        Ok(())
    }

    /// タスクファイルを削除
    ///
    /// # Arguments
    /// * `file_path` - 削除するファイルのパス
    ///
    /// # Returns
    /// * `Result<(), io::Error>` - 削除結果
    pub fn delete_task(&self, file_path: &Path) -> Result<(), io::Error> {
        fs::remove_file(file_path)?;
        Ok(())
    }

    /// 新しいタスクを作成
    ///
    /// # Arguments
    /// * `workspace_root` - ワークスペースのルート
    /// * `task_id` - タスクID（ファイル名）
    /// * `content` - タスクの内容
    ///
    /// # Returns
    /// * `Result<Task, io::Error>` - 作成されたタスク
    pub fn create_task(
        &self,
        workspace_root: &Path,
        task_id: &str,
        content: &str,
    ) -> Result<Task, io::Error> {
        let file_path = workspace_root.join(format!("{}.md", task_id));

        // ファイルが既に存在する場合はエラー
        if file_path.exists() {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                "Task file already exists",
            ));
        }

        // Front MatterとBodyをパース（タグ順序も取得）
        let (front_matter, body, tag_order) = FrontMatterParser::parse_with_order(content)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

        let task = Task {
            id: task_id.to_string(),
            file_path: file_path.clone(),
            front_matter,
            content: body,
            modified_at: Utc::now(),
            tag_order: if tag_order.is_empty() { None } else { Some(tag_order) },
        };

        // ファイルに保存
        self.save_task(&task)?;

        Ok(task)
    }

    /// タスクをリネーム（ファイル名変更 + depends_on参照の更新）
    ///
    /// # Arguments
    /// * `workspace_root` - ワークスペースのルート
    /// * `old_task_id` - 古いタスクID
    /// * `new_task_id` - 新しいタスクID
    ///
    /// # Returns
    /// * `Result<(), io::Error>` - リネーム結果
    pub fn rename_task(
        &self,
        workspace_root: &Path,
        old_task_id: &str,
        new_task_id: &str,
    ) -> Result<(), io::Error> {
        let old_file_path = workspace_root.join(format!("{}.md", old_task_id));
        let new_file_path = workspace_root.join(format!("{}.md", new_task_id));

        // 古いファイルが存在しない場合はエラー
        if !old_file_path.exists() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Task file not found: {}", old_task_id),
            ));
        }

        // 新しいファイルが既に存在する場合はエラー
        if new_file_path.exists() {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("Task file already exists: {}", new_task_id),
            ));
        }

        // ファイル名を変更
        fs::rename(&old_file_path, &new_file_path)?;

        // depends_on参照を更新
        self.update_depends_on_references(workspace_root, old_task_id, new_task_id)?;

        Ok(())
    }

    /// depends_on参照を更新
    ///
    /// # Arguments
    /// * `workspace_root` - ワークスペースのルート
    /// * `old_task_id` - 古いタスクID
    /// * `new_task_id` - 新しいタスクID
    ///
    /// # Returns
    /// * `Result<(), io::Error>` - 更新結果
    fn update_depends_on_references(
        &self,
        workspace_root: &Path,
        old_task_id: &str,
        new_task_id: &str,
    ) -> Result<(), io::Error> {
        // 全タスクファイルをスキャン
        let md_files = self.scan_markdown_files(workspace_root)?;

        for file_path in md_files {
            let content = fs::read_to_string(&file_path)?;
            
            // 古いタスクIDへの参照を検索
            let old_pattern = format!("depends_on: {}", old_task_id);
            let new_pattern = format!("depends_on: {}", new_task_id);
            
            let updated_content = content.replace(&old_pattern, &new_pattern);
            
            // 内容が変更された場合のみ書き込み
            if updated_content != content {
                fs::write(&file_path, updated_content)?;
            }
        }

        Ok(())
    }

    /// ワークスペース設定を読み込む
    ///
    /// # Arguments
    /// * `workspace_path` - ワークスペースのルートパス
    ///
    /// # Returns
    /// * `Result<WorkspaceConfig, String>` - ワークスペース設定
    pub fn load_config(workspace_path: &str) -> Result<WorkspaceConfig, String> {
        let root_path = PathBuf::from(workspace_path);
        let config_path = root_path.join(".hienmark.json");

        // 設定ファイルが存在すれば読み込む
        if config_path.exists() {
            let config_json = fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read config: {}", e))?;

            let config: WorkspaceConfig = serde_json::from_str(&config_json)
                .map_err(|e| format!("Failed to parse config: {}", e))?;

            Ok(config)
        } else {
            // デフォルト設定を返す
            Ok(WorkspaceConfig::default())
        }
    }

    /// ワークスペース設定を保存
    ///
    /// # Arguments
    /// * `workspace_path` - ワークスペースのルートパス
    /// * `config` - 保存する設定
    ///
    /// # Returns
    /// * `Result<(), String>` - 保存結果
    pub fn save_config(workspace_path: &str, config: &WorkspaceConfig) -> Result<(), String> {
        let root_path = PathBuf::from(workspace_path);
        let config_path = root_path.join(".hienmark.json");

        // 設定をJSON形式で保存
        let config_json = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        fs::write(&config_path, config_json)
            .map_err(|e| format!("Failed to write config: {}", e))?;

        Ok(())
    }
}

impl Default for WorkspaceService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_scan_markdown_files() {
        let temp_dir = TempDir::new().unwrap();
        let root = temp_dir.path();

        // テストファイルを作成
        fs::write(root.join("task1.md"), "# Task 1").unwrap();
        fs::write(root.join("task2.md"), "# Task 2").unwrap();
        fs::write(root.join("note.txt"), "Not a markdown file").unwrap();

        // サブディレクトリ
        let sub_dir = root.join("subdir");
        fs::create_dir(&sub_dir).unwrap();
        fs::write(sub_dir.join("task3.md"), "# Task 3").unwrap();

        let service = WorkspaceService::new();
        let md_files = service.scan_markdown_files(root).unwrap();

        assert_eq!(md_files.len(), 3);
        assert!(md_files.iter().all(|p| p.extension().unwrap() == "md"));
    }

    #[test]
    fn test_load_task_with_frontmatter() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.md");

        let content = r#"---
status: pending
priority: high
---

# Test Task
This is a test task."#;

        fs::write(&file_path, content).unwrap();

        let service = WorkspaceService::new();
        let task = service.load_task(&file_path).unwrap();

        assert!(!task.front_matter.tags.is_empty());
        assert!(task.content.contains("# Test Task"));
        assert_eq!(task.id, "test");
    }

    #[test]
    fn test_create_and_delete_task() {
        let temp_dir = TempDir::new().unwrap();
        let root = temp_dir.path();

        let service = WorkspaceService::new();

        // タスク作成
        let content = "# New Task\nThis is a new task.";
        let task = service.create_task(root, "new-task", content).unwrap();

        assert!(task.file_path.exists());
        assert_eq!(task.file_path.file_stem().unwrap(), "new-task");

        // タスク削除
        service.delete_task(&task.file_path).unwrap();
        assert!(!task.file_path.exists());
    }

    #[test]
    fn test_save_task() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.md");

        let service = WorkspaceService::new();

        // タスクを作成
        let content = r#"---
status: in_progress
---

# Updated Task
Content has been updated."#;

        let (front_matter, body) = FrontMatterParser::parse(content).unwrap();

        let task = Task {
            id: "test".to_string(),
            file_path: file_path.clone(),
            front_matter,
            content: body,
            modified_at: Utc::now(),
            tag_order: None,
        };

        // 保存
        service.save_task(&task).unwrap();

        // 読み込んで確認
        let loaded_task = service.load_task(&file_path).unwrap();
        assert!(loaded_task.content.contains("# Updated Task"));
        assert!(loaded_task.front_matter.tags.contains_key("status"));
    }
}
