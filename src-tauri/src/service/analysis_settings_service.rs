use std::path::PathBuf;
use std::fs;
use serde_json::Value;

/// 分析設定サービス
/// 分析設定の読み込み・保存を担当
pub struct AnalysisSettingsService;

impl AnalysisSettingsService {
    /// 新しいサービスインスタンスを作成
    pub fn new() -> Self {
        Self
    }

    /// 分析設定ファイルのパスを取得
    ///
    /// # Arguments
    /// * `workspace_path` - ワークスペースのルートパス
    ///
    /// # Returns
    /// * `PathBuf` - 設定ファイルのパス
    fn settings_path(workspace_path: &PathBuf) -> PathBuf {
        workspace_path.join(".hienmark").join("analysis_settings.json")
    }

    /// 分析設定を読み込む
    ///
    /// # Arguments
    /// * `workspace_path` - ワークスペースのルートパス
    ///
    /// # Returns
    /// * `Result<String, String>` - 設定JSON文字列（ファイルが存在しない場合は空のJSONオブジェクト）
    pub fn load_settings(workspace_path: &PathBuf) -> Result<String, String> {
        let settings_path = Self::settings_path(workspace_path);
        
        if !settings_path.exists() {
            // ファイルが存在しない場合は空のオブジェクトを返す
            return Ok("{}".to_string());
        }
        
        fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read analysis settings: {}", e))
    }

    /// 分析設定を保存
    ///
    /// # Arguments
    /// * `workspace_path` - ワークスペースのルートパス
    /// * `settings_json` - 設定JSON文字列
    ///
    /// # Returns
    /// * `Result<(), String>` - 保存結果
    pub fn save_settings(
        workspace_path: &PathBuf,
        settings_json: &str,
    ) -> Result<(), String> {
        // JSONの妥当性をチェック
        let _: Value = serde_json::from_str(settings_json)
            .map_err(|e| format!("Invalid JSON: {}", e))?;

        let hienmark_dir = workspace_path.join(".hienmark");
        
        // .hienmarkディレクトリが存在しない場合は作成
        if !hienmark_dir.exists() {
            fs::create_dir_all(&hienmark_dir)
                .map_err(|e| format!("Failed to create .hienmark directory: {}", e))?;
        }
        
        let settings_path = Self::settings_path(workspace_path);
        
        // ファイルに書き込み
        fs::write(&settings_path, settings_json)
            .map_err(|e| format!("Failed to write analysis settings: {}", e))
    }
}

impl Default for AnalysisSettingsService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_load_settings_not_exists() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_path_buf();
        
        let result = AnalysisSettingsService::load_settings(&workspace_path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "{}");
    }

    #[test]
    fn test_save_and_load_settings() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_path_buf();
        
        let settings_json = r#"{"chartMappings": {}}"#;
        
        // 保存
        let result = AnalysisSettingsService::save_settings(&workspace_path, settings_json);
        assert!(result.is_ok());
        
        // 読み込み
        let result = AnalysisSettingsService::load_settings(&workspace_path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), settings_json);
    }

    #[test]
    fn test_save_invalid_json() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_path_buf();
        
        let invalid_json = "{ invalid json }";
        
        let result = AnalysisSettingsService::save_settings(&workspace_path, invalid_json);
        assert!(result.is_err());
    }
}

