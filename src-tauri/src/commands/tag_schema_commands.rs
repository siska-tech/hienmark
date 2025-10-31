use crate::service::TagSchemaService;
use serde_json::Value;
use std::path::PathBuf;

/// タグスキーマを読み込む
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
///
/// # Returns
/// * `Result<String, String>` - スキーマのJSON文字列（存在しない場合は空のオブジェクト）
#[tauri::command]
pub async fn load_tag_schema(workspace_path: String) -> Result<String, String> {
    let root_path = PathBuf::from(&workspace_path);
    let schema_path = root_path.join(".hienmark").join("tag_schema.json");
    
    if !schema_path.exists() {
        // ファイルが存在しない場合は空のオブジェクトを返す
        return Ok("{}".to_string());
    }
    
    std::fs::read_to_string(&schema_path)
        .map_err(|e| format!("Failed to read tag schema: {}", e))
}

/// タグスキーマを保存
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `schema_json` - スキーマのJSON文字列
///
/// # Returns
/// * `Result<(), String>` - 保存結果
#[tauri::command]
pub async fn save_tag_schema(workspace_path: String, schema_json: String) -> Result<(), String> {
    let root_path = PathBuf::from(&workspace_path);
    let hienmark_dir = root_path.join(".hienmark");
    
    // .hienmarkディレクトリが存在しない場合は作成
    if !hienmark_dir.exists() {
        std::fs::create_dir_all(&hienmark_dir)
            .map_err(|e| format!("Failed to create .hienmark directory: {}", e))?;
    }
    
    let schema_path = hienmark_dir.join("tag_schema.json");
    
    // JSONの妥当性をチェック
    let _: Value = serde_json::from_str(&schema_json)
        .map_err(|e| format!("Invalid JSON: {}", e))?;
    
    // ファイルに書き込み
    std::fs::write(&schema_path, schema_json)
        .map_err(|e| format!("Failed to write tag schema: {}", e))
}

/// 動的デフォルト値を計算
///
/// # Arguments
/// * `formula` - 計算式（例: `=[TODAY]+30`）
///
/// # Returns
/// * `Result<String, String>` - 計算結果のISO 8601形式の文字列
#[tauri::command]
pub fn get_dynamic_default_value(formula: String) -> Result<String, String> {
    let service = TagSchemaService::new();
    service.calculate_dynamic_default_value(&formula)
}
