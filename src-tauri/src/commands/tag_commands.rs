use crate::service::{WorkspaceService, TagService};
use std::path::PathBuf;

/// タグをリネーム
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `category` - タグカテゴリ名
/// * `old_value` - 古い値
/// * `new_value` - 新しい値
///
/// # Returns
/// * `Result<usize, String>` - 更新されたタスク数
#[tauri::command]
pub async fn rename_tag(
    workspace_path: String,
    category: String,
    old_value: String,
    new_value: String,
) -> Result<usize, String> {
    let root_path = PathBuf::from(&workspace_path);

    let workspace_service = WorkspaceService::new();
    let mut workspace = workspace_service
        .load_workspace(root_path)
        .map_err(|e| format!("Failed to load workspace: {}", e))?;

    TagService::rename_tag(&mut workspace, &category, &old_value, &new_value)
        .map_err(|e| format!("Failed to rename tag: {}", e))
}

/// タグを削除
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `category` - タグカテゴリ名
/// * `value` - 削除する値（Noneの場合はカテゴリごと削除）
///
/// # Returns
/// * `Result<usize, String>` - 更新されたタスク数
#[tauri::command]
pub async fn delete_tag(
    workspace_path: String,
    category: String,
    value: Option<String>,
) -> Result<usize, String> {
    let root_path = PathBuf::from(&workspace_path);

    let workspace_service = WorkspaceService::new();
    let mut workspace = workspace_service
        .load_workspace(root_path)
        .map_err(|e| format!("Failed to load workspace: {}", e))?;

    TagService::delete_tag(&mut workspace, &category, value.as_deref())
        .map_err(|e| format!("Failed to delete tag: {}", e))
}
