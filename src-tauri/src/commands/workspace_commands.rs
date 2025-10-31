use crate::models::Workspace;
use crate::service::WorkspaceService;
use std::path::PathBuf;

/// ワークスペース管理のためのTauriコマンド

/// ワークスペースディレクトリを開く
///
/// # Arguments
/// * `path` - ワークスペースのルートディレクトリパス
///
/// # Returns
/// * `Result<Workspace, String>` - 読み込まれたワークスペース
#[tauri::command]
pub async fn open_workspace(path: String) -> Result<Workspace, String> {
    let root_path = PathBuf::from(&path);

    // パスが存在するか確認
    if !root_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !root_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let service = WorkspaceService::new();
    service
        .load_workspace(root_path)
        .map_err(|e| format!("Failed to load workspace: {}", e))
}

/// ワークスペース内のタスク一覧を取得
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
///
/// # Returns
/// * `Result<Vec<String>, String>` - タスクIDのリスト
#[tauri::command]
pub async fn list_tasks(workspace_path: String) -> Result<Vec<String>, String> {
    let workspace = open_workspace(workspace_path).await?;
    let task_ids: Vec<String> = workspace.tasks.keys().cloned().collect();
    Ok(task_ids)
}

/// 特定のタスクを読み込む
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `task_id` - タスクID
///
/// # Returns
/// * `Result<Task, String>` - 読み込まれたタスク
#[tauri::command]
pub async fn get_task(workspace_path: String, task_id: String) -> Result<crate::models::Task, String> {
    let workspace = open_workspace(workspace_path).await?;

    workspace
        .tasks
        .get(&task_id)
        .cloned()
        .ok_or_else(|| format!("Task not found: {}", task_id))
}

/// 新しいタスクを作成
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `task_id` - タスクID（ファイル名）
/// * `content` - タスクの初期内容
///
/// # Returns
/// * `Result<Task, String>` - 作成されたタスク
#[tauri::command]
pub async fn create_task(
    workspace_path: String,
    task_id: String,
    content: String,
) -> Result<crate::models::Task, String> {
    let root_path = PathBuf::from(&workspace_path);

    let service = WorkspaceService::new();
    service
        .create_task(&root_path, &task_id, &content)
        .map_err(|e| format!("Failed to create task: {}", e))
}

/// タスクを保存
///
/// # Arguments
/// * `task` - 保存するタスク
///
/// # Returns
/// * `Result<(), String>` - 保存結果
#[tauri::command]
pub async fn save_task(task: crate::models::Task) -> Result<(), String> {
    let service = WorkspaceService::new();
    service
        .save_task(&task)
        .map_err(|e| format!("Failed to save task: {}", e))
}

/// タスクを削除
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `task_id` - 削除するタスクID
///
/// # Returns
/// * `Result<(), String>` - 削除結果
#[tauri::command]
pub async fn delete_task(workspace_path: String, task_id: String) -> Result<(), String> {
    let root_path = PathBuf::from(&workspace_path);
    let file_path = root_path.join(format!("{}.md", task_id));

    let service = WorkspaceService::new();
    service
        .delete_task(&file_path)
        .map_err(|e| format!("Failed to delete task: {}", e))
}

/// タスクをリネーム
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `old_task_id` - 古いタスクID
/// * `new_task_id` - 新しいタスクID
///
/// # Returns
/// * `Result<(), String>` - リネーム結果
#[tauri::command]
pub async fn rename_task(
    workspace_path: String,
    old_task_id: String,
    new_task_id: String,
) -> Result<(), String> {
    let root_path = PathBuf::from(&workspace_path);

    let service = WorkspaceService::new();
    service
        .rename_task(&root_path, &old_task_id, &new_task_id)
        .map_err(|e| format!("Failed to rename task: {}", e))
}

/// タグインデックスを取得
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
///
/// # Returns
/// * `Result<TagIndex, String>` - タグインデックス
#[tauri::command]
pub async fn get_tag_index(workspace_path: String) -> Result<crate::models::TagIndex, String> {
    let workspace = open_workspace(workspace_path).await?;
    Ok(workspace.tag_index)
}

/// ワークスペース設定を更新
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `config` - 新しい設定
///
/// # Returns
/// * `Result<(), String>` - 更新結果
#[tauri::command]
pub async fn update_workspace_config(
    workspace_path: String,
    config: crate::models::WorkspaceConfig,
) -> Result<(), String> {
    WorkspaceService::save_config(&workspace_path, &config)
}

/// ワークスペース設定を取得
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
///
/// # Returns
/// * `Result<WorkspaceConfig, String>` - ワークスペース設定
#[tauri::command]
pub async fn get_workspace_config(
    workspace_path: String,
) -> Result<crate::models::WorkspaceConfig, String> {
    WorkspaceService::load_config(&workspace_path)
}
