use crate::service::FileWatcherService;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, State};

/// ファイルウォッチャーの状態管理
pub struct WatcherState {
    pub watcher: Mutex<Option<FileWatcherService>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watcher: Mutex::new(None),
        }
    }
}

impl Default for WatcherState {
    fn default() -> Self {
        Self::new()
    }
}

/// ファイル監視を開始
///
/// # Arguments
/// * `app_handle` - Tauriアプリハンドル
/// * `state` - ウォッチャーの状態
/// * `workspace_path` - 監視するワークスペースのパス
///
/// # Returns
/// * `Result<(), String>` - 開始結果
#[tauri::command]
pub async fn start_file_watcher(
    app_handle: AppHandle,
    state: State<'_, WatcherState>,
    workspace_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&workspace_path);

    if !path.exists() {
        return Err(format!("Workspace path does not exist: {}", workspace_path));
    }

    let mut watcher_guard = state
        .watcher
        .lock()
        .map_err(|e| format!("Failed to lock watcher: {}", e))?;

    // 既存のウォッチャーがあれば停止
    if let Some(mut existing_watcher) = watcher_guard.take() {
        existing_watcher.stop_watching();
    }

    // 新しいウォッチャーを作成して開始
    let mut new_watcher = FileWatcherService::new();
    new_watcher.start_watching(app_handle, &path)?;

    *watcher_guard = Some(new_watcher);

    log::info!("File watcher started for: {}", workspace_path);
    Ok(())
}

/// ファイル監視を停止
///
/// # Arguments
/// * `state` - ウォッチャーの状態
///
/// # Returns
/// * `Result<(), String>` - 停止結果
#[tauri::command]
pub async fn stop_file_watcher(state: State<'_, WatcherState>) -> Result<(), String> {
    let mut watcher_guard = state
        .watcher
        .lock()
        .map_err(|e| format!("Failed to lock watcher: {}", e))?;

    if let Some(mut watcher) = watcher_guard.take() {
        watcher.stop_watching();
        log::info!("File watcher stopped");
        Ok(())
    } else {
        Err("No active file watcher".to_string())
    }
}
