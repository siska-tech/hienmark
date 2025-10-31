use crate::models::{TagValue, Workspace};
use crate::service::WorkspaceService;
use std::io;

/// タグ管理サービス
pub struct TagService;

impl TagService {
    /// タグをリネーム（全タスクのFront Matterを一括更新）
    ///
    /// # Arguments
    /// * `workspace` - ワークスペース
    /// * `category` - タグカテゴリ名
    /// * `old_value` - 古い値
    /// * `new_value` - 新しい値
    ///
    /// # Returns
    /// * `Result<usize, io::Error>` - 更新されたタスク数
    pub fn rename_tag(
        workspace: &mut Workspace,
        category: &str,
        old_value: &str,
        new_value: &str,
    ) -> Result<usize, io::Error> {
        let mut updated_count = 0;
        let workspace_service = WorkspaceService::new();

        // 該当カテゴリを持つタスクIDを取得
        let task_ids: Vec<String> = if let Some(tag_category) = workspace.tag_index.categories.get(category) {
            tag_category.task_ids.clone()
        } else {
            return Ok(0); // カテゴリが存在しない場合は0を返す
        };

        // 各タスクを更新
        for task_id in task_ids {
            if let Some(task) = workspace.tasks.get_mut(&task_id) {
                // 該当カテゴリの値をチェック
                if let Some(value) = task.front_matter.tags.get(category) {
                    let value_str = value.to_string_value();

                    // 古い値と一致する場合のみ更新
                    if value_str == old_value {
                        // 新しい値を設定（型を維持）
                        let new_tag_value = match value {
                            TagValue::String(_) => TagValue::String(new_value.to_string()),
                            TagValue::Number(_) => {
                                // 数値の場合は変換を試みる
                                if let Ok(num) = new_value.parse::<i64>() {
                                    TagValue::Number(num)
                                } else {
                                    TagValue::String(new_value.to_string())
                                }
                            }
                            TagValue::Float(_) => {
                                // 浮動小数点の場合は変換を試みる
                                if let Ok(num) = new_value.parse::<f64>() {
                                    TagValue::Float(num)
                                } else {
                                    TagValue::String(new_value.to_string())
                                }
                            }
                            TagValue::Bool(_) => {
                                // 真偽値の場合は変換を試みる
                                if let Ok(b) = new_value.parse::<bool>() {
                                    TagValue::Bool(b)
                                } else {
                                    TagValue::String(new_value.to_string())
                                }
                            }
                            TagValue::Array(_) => TagValue::String(new_value.to_string()),
                        };

                        task.front_matter.tags.insert(category.to_string(), new_tag_value);

                        // タスクを保存
                        workspace_service.save_task(task)?;
                        updated_count += 1;
                    }
                }
            }
        }

        // タグインデックスを再構築
        workspace.tag_index = crate::models::TagIndex::new();
        for (task_id, task) in &workspace.tasks {
            workspace.tag_index.index_task(task_id, &task.front_matter.tags);
        }

        Ok(updated_count)
    }

    /// タグを削除（全タスクのFront Matterから削除）
    ///
    /// # Arguments
    /// * `workspace` - ワークスペース
    /// * `category` - タグカテゴリ名
    /// * `value` - 削除する値（Noneの場合はカテゴリごと削除）
    ///
    /// # Returns
    /// * `Result<usize, io::Error>` - 更新されたタスク数
    pub fn delete_tag(
        workspace: &mut Workspace,
        category: &str,
        value: Option<&str>,
    ) -> Result<usize, io::Error> {
        let mut updated_count = 0;
        let workspace_service = WorkspaceService::new();

        // 該当カテゴリを持つタスクIDを取得
        let task_ids: Vec<String> = if let Some(tag_category) = workspace.tag_index.categories.get(category) {
            tag_category.task_ids.clone()
        } else {
            return Ok(0); // カテゴリが存在しない場合は0を返す
        };

        // 各タスクを更新
        for task_id in task_ids {
            if let Some(task) = workspace.tasks.get_mut(&task_id) {
                let should_remove = if let Some(target_value) = value {
                    // 特定の値のみ削除
                    if let Some(tag_value) = task.front_matter.tags.get(category) {
                        tag_value.to_string_value() == target_value
                    } else {
                        false
                    }
                } else {
                    // カテゴリごと削除
                    task.front_matter.tags.contains_key(category)
                };

                if should_remove {
                    task.front_matter.tags.remove(category);
                    workspace_service.save_task(task)?;
                    updated_count += 1;
                }
            }
        }

        // タグインデックスを再構築
        workspace.tag_index = crate::models::TagIndex::new();
        for (task_id, task) in &workspace.tasks {
            workspace.tag_index.index_task(task_id, &task.front_matter.tags);
        }

        Ok(updated_count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{FrontMatter, TagIndex, WorkspaceConfig, Task, TagValue};
    use std::collections::HashMap;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn create_test_workspace() -> (TempDir, Workspace) {
        let temp_dir = TempDir::new().unwrap();
        let root_path = temp_dir.path().to_path_buf();

        let mut workspace = Workspace {
            root_path: root_path.clone(),
            tasks: HashMap::new(),
            tag_index: TagIndex::new(),
            config: WorkspaceConfig::default(),
        };

        // テストタスクを作成
        let mut tags1 = HashMap::new();
        tags1.insert("status".to_string(), TagValue::String("pending".to_string()));
        tags1.insert("priority".to_string(), TagValue::String("high".to_string()));

        let mut tags2 = HashMap::new();
        tags2.insert("status".to_string(), TagValue::String("pending".to_string()));
        tags2.insert("priority".to_string(), TagValue::String("low".to_string()));

        let task1 = Task {
            id: "task1".to_string(),
            file_path: root_path.join("task1.md"),
            front_matter: FrontMatter { tags: tags1.clone() },
            content: "Task 1 content".to_string(),
            modified_at: chrono::Utc::now(),
            tag_order: None,
        };

        let task2 = Task {
            id: "task2".to_string(),
            file_path: root_path.join("task2.md"),
            front_matter: FrontMatter { tags: tags2.clone() },
            content: "Task 2 content".to_string(),
            modified_at: chrono::Utc::now(),
            tag_order: None,
        };

        // タスクをワークスペースに追加
        workspace.tag_index.index_task("task1", &tags1);
        workspace.tag_index.index_task("task2", &tags2);
        workspace.tasks.insert("task1".to_string(), task1);
        workspace.tasks.insert("task2".to_string(), task2);

        (temp_dir, workspace)
    }

    #[test]
    fn test_rename_tag() {
        let (_temp_dir, mut workspace) = create_test_workspace();

        // ファイルを作成
        let workspace_service = WorkspaceService::new();
        for task in workspace.tasks.values() {
            workspace_service.save_task(task).unwrap();
        }

        // "pending" を "in_progress" にリネーム
        let count = TagService::rename_tag(&mut workspace, "status", "pending", "in_progress").unwrap();

        assert_eq!(count, 2); // 2つのタスクが更新された

        // 確認
        assert_eq!(
            workspace.tasks["task1"].front_matter.tags["status"].to_string_value(),
            "in_progress"
        );
        assert_eq!(
            workspace.tasks["task2"].front_matter.tags["status"].to_string_value(),
            "in_progress"
        );
    }

    #[test]
    fn test_delete_tag_specific_value() {
        let (_temp_dir, mut workspace) = create_test_workspace();

        // ファイルを作成
        let workspace_service = WorkspaceService::new();
        for task in workspace.tasks.values() {
            workspace_service.save_task(task).unwrap();
        }

        // priority="high" を削除
        let count = TagService::delete_tag(&mut workspace, "priority", Some("high")).unwrap();

        assert_eq!(count, 1); // 1つのタスクが更新された

        // 確認
        assert!(!workspace.tasks["task1"].front_matter.tags.contains_key("priority"));
        assert_eq!(
            workspace.tasks["task2"].front_matter.tags["priority"].to_string_value(),
            "low"
        );
    }

    #[test]
    fn test_delete_tag_category() {
        let (_temp_dir, mut workspace) = create_test_workspace();

        // ファイルを作成
        let workspace_service = WorkspaceService::new();
        for task in workspace.tasks.values() {
            workspace_service.save_task(task).unwrap();
        }

        // priorityカテゴリごと削除
        let count = TagService::delete_tag(&mut workspace, "priority", None).unwrap();

        assert_eq!(count, 2); // 2つのタスクが更新された

        // 確認
        assert!(!workspace.tasks["task1"].front_matter.tags.contains_key("priority"));
        assert!(!workspace.tasks["task2"].front_matter.tags.contains_key("priority"));
    }
}
