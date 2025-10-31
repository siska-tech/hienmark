use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::{channel, Receiver};
use tauri::{AppHandle, Emitter};

/// ファイル変更イベントの種類
#[derive(Debug, Clone, serde::Serialize)]
pub struct FileChangeEvent {
    /// イベントタイプ（created, modified, removed）
    pub event_type: String,
    /// 変更されたファイルのパス
    pub path: String,
}

/// ファイルウォッチャーサービス
pub struct FileWatcherService {
    watcher: Option<RecommendedWatcher>,
}

impl FileWatcherService {
    pub fn new() -> Self {
        Self { watcher: None }
    }

    /// ワークスペースディレクトリの監視を開始
    ///
    /// # Arguments
    /// * `app_handle` - Tauriアプリハンドル
    /// * `workspace_path` - 監視するワークスペースのパス
    ///
    /// # Returns
    /// * `Result<Receiver<notify::Result<Event>>, String>` - イベント受信チャネル
    pub fn start_watching(
        &mut self,
        app_handle: AppHandle,
        workspace_path: &Path,
    ) -> Result<(), String> {
        // チャネルを作成
        let (tx, rx) = channel();

        // ウォッチャーを作成
        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Err(e) = tx.send(res) {
                    eprintln!("Failed to send watch event: {}", e);
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        // ディレクトリの監視を開始
        watcher
            .watch(workspace_path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch directory: {}", e))?;

        self.watcher = Some(watcher);

        // バックグラウンドスレッドでイベントを処理
        let workspace_path_clone = workspace_path.to_path_buf();
        std::thread::spawn(move || {
            Self::handle_events(app_handle, rx, workspace_path_clone);
        });

        Ok(())
    }

    /// ファイルイベントを処理してフロントエンドに通知
    fn handle_events(
        app_handle: AppHandle,
        rx: Receiver<notify::Result<Event>>,
        workspace_path: std::path::PathBuf,
    ) {
        for res in rx {
            match res {
                Ok(event) => {
                    // .mdファイルの変更のみを処理
                    for path in &event.paths {
                        if let Some(ext) = path.extension() {
                            if ext == "md" && path.starts_with(&workspace_path) {
                                let event_type = match event.kind {
                                    notify::EventKind::Create(_) => "created",
                                    notify::EventKind::Modify(_) => "modified",
                                    notify::EventKind::Remove(_) => "removed",
                                    _ => continue,
                                };

                                let change_event = FileChangeEvent {
                                    event_type: event_type.to_string(),
                                    path: path.to_string_lossy().to_string(),
                                };

                                // フロントエンドにイベントを送信
                                if let Err(e) = app_handle.emit("file-change", &change_event) {
                                    eprintln!("Failed to emit file-change event: {}", e);
                                }

                                log::info!(
                                    "File {} detected: {}",
                                    event_type,
                                    path.display()
                                );
                            }
                        }
                    }
                }
                Err(e) => {
                    log::error!("Watch error: {:?}", e);
                }
            }
        }
    }

    /// 監視を停止
    pub fn stop_watching(&mut self) {
        if let Some(watcher) = self.watcher.take() {
            drop(watcher);
            log::info!("File watcher stopped");
        }
    }
}

impl Default for FileWatcherService {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for FileWatcherService {
    fn drop(&mut self) {
        self.stop_watching();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_watcher_creation() {
        let watcher = FileWatcherService::new();
        assert!(watcher.watcher.is_none());
    }

    #[test]
    fn test_file_change_event_serialization() {
        let event = FileChangeEvent {
            event_type: "modified".to_string(),
            path: "/test/path.md".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("modified"));
        assert!(json.contains("/test/path.md"));
    }
}
