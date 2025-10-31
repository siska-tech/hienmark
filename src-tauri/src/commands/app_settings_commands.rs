use serde_json::Value;
use tauri_plugin_store::StoreExt;

const SETTINGS_STORE_PATH: &str = ".hienmark/app-settings.json";

#[tauri::command]
pub async fn get_app_settings(
    app: tauri::AppHandle,
    key: String,
) -> Result<Option<Value>, String> {
    let store = app
        .store(SETTINGS_STORE_PATH)
        .map_err(|e| format!("Failed to open settings store: {}", e))?;

    let value = store.get(key);
    Ok(value.map(|v| v.clone()))
}

#[tauri::command]
pub async fn save_app_settings(
    app: tauri::AppHandle,
    key: String,
    value: Value,
) -> Result<(), String> {
    let store = app
        .store(SETTINGS_STORE_PATH)
        .map_err(|e| format!("Failed to open settings store: {}", e))?;

    store.set(key, value.clone());

    store
        .save()
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    Ok(())
}
