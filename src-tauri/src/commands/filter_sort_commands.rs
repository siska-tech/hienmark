use crate::models;
use std::path::PathBuf;
use std::fs;

/// カスタムフィルター/ソート設定を取得
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
///
/// # Returns
/// * `Result<models::CustomFiltersAndSorts, String>` - カスタムフィルター/ソート設定
#[tauri::command]
pub async fn get_filters_and_sorts(workspace_path: String) -> Result<models::CustomFiltersAndSorts, String> {
    let root_path = PathBuf::from(&workspace_path);
    let config_path = root_path.join(".hienmark").join("filters_and_sorts.json");
    
    if !config_path.exists() {
        // デフォルトの空設定を返す
        return Ok(models::CustomFiltersAndSorts {
            filters: Vec::new(),
            sorts: Vec::new(),
        });
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read filters and sorts config: {}", e))?;

    let filters_and_sorts: models::CustomFiltersAndSorts = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse filters and sorts config: {}", e))?;

    Ok(filters_and_sorts)
}

/// カスタムフィルター/ソート設定を保存
///
/// # Arguments
/// * `workspace_path` - ワークスペースのルートパス
/// * `filters_and_sorts` - 保存するカスタムフィルター/ソート設定
///
/// # Returns
/// * `Result<(), String>` - 保存結果
#[tauri::command]
pub async fn save_filters_and_sorts(
    workspace_path: String,
    filters_and_sorts: models::CustomFiltersAndSorts,
) -> Result<(), String> {
    let root_path = PathBuf::from(&workspace_path);
    let hienmark_dir = root_path.join(".hienmark");
    
    // .hienmarkディレクトリが存在しない場合は作成
    if !hienmark_dir.exists() {
        fs::create_dir_all(&hienmark_dir)
            .map_err(|e| format!("Failed to create .hienmark directory: {}", e))?;
    }

    let config_path = hienmark_dir.join("filters_and_sorts.json");

    let content = serde_json::to_string_pretty(&filters_and_sorts)
        .map_err(|e| format!("Failed to serialize filters and sorts config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write filters and sorts config: {}", e))?;

    Ok(())
}


