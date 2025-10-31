use tauri::AppHandle;
use tauri::Manager;
use std::fs;
use std::path::PathBuf;
use crate::data_models::ProjectData;

type CommandResult<T> = Result<T, String>;

fn project_file_path(app: &AppHandle) -> CommandResult<PathBuf> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;
    let dir = base.join("gantt_data");
    Ok(dir.join("gantt_project.json"))
}

#[tauri::command]
pub async fn load_project(app: AppHandle) -> CommandResult<ProjectData> {
    let path = project_file_path(&app)?;
    if !path.exists() {
        return Ok(ProjectData::default());
    }
    let s = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let v: ProjectData = serde_json::from_str(&s).map_err(|e| e.to_string())?;
    Ok(v)
}

#[tauri::command]
pub async fn save_project(app: AppHandle, project_data: ProjectData) -> CommandResult<()> {
    let path = project_file_path(&app)?;
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    let s = serde_json::to_string_pretty(&project_data).map_err(|e| e.to_string())?;
    fs::write(path, s).map_err(|e| e.to_string())?;
    Ok(())
}


