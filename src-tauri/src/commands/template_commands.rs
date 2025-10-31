use std::collections::HashMap;

use crate::models::{TagTemplate, TagValue};
use crate::service::{TemplateService, WorkspaceService};

/// テンプレート一覧を取得
#[tauri::command]
pub async fn list_templates(
    workspace_path: String,
) -> Result<Vec<TagTemplate>, String> {
    let config = WorkspaceService::load_config(&workspace_path)?;

    let mut templates: Vec<TagTemplate> = config.templates.templates.values().cloned().collect();
    templates.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(templates)
}

/// 特定のテンプレートを取得
#[tauri::command]
pub async fn get_template(
    workspace_path: String,
    template_name: String,
) -> Result<TagTemplate, String> {
    let config = WorkspaceService::load_config(&workspace_path)?;

    config.templates.get_template(&template_name)
        .cloned()
        .ok_or_else(|| format!("Template '{}' not found", template_name))
}

/// デフォルトテンプレートを取得
#[tauri::command]
pub async fn get_default_template(
    workspace_path: String,
) -> Result<Option<TagTemplate>, String> {
    let config = WorkspaceService::load_config(&workspace_path)?;

    Ok(config.templates.get_default_template().cloned())
}

/// テンプレートを作成
#[tauri::command]
pub async fn create_template(
    workspace_path: String,
    name: String,
    description: Option<String>,
    tags: HashMap<String, TagValue>,
) -> Result<TagTemplate, String> {
    let template = TagTemplate::new(name.clone(), description, tags);

    // バリデーション
    let errors = TemplateService::validate_template(&template);
    if !errors.is_empty() {
        return Err(format!("Validation failed: {}", errors.join(", ")));
    }

    // 設定を読み込み
    let mut config = WorkspaceService::load_config(&workspace_path)?;

    // テンプレート名の重複チェック
    if config.templates.templates.contains_key(&name) {
        return Err(format!("Template '{}' already exists", name));
    }

    // テンプレートを追加
    config.templates.add_template(template.clone());

    // 設定を保存
    WorkspaceService::save_config(&workspace_path, &config)?;

    Ok(template)
}

/// テンプレートを更新
#[tauri::command]
pub async fn update_template(
    workspace_path: String,
    name: String,
    description: Option<String>,
    tags: HashMap<String, TagValue>,
) -> Result<TagTemplate, String> {
    let mut config = WorkspaceService::load_config(&workspace_path)?;

    // テンプレートが存在するか確認
    let template = config.templates.templates.get_mut(&name)
        .ok_or_else(|| format!("Template '{}' not found", name))?;

    // 更新
    template.update(description, tags);

    // バリデーション
    let errors = TemplateService::validate_template(template);
    if !errors.is_empty() {
        return Err(format!("Validation failed: {}", errors.join(", ")));
    }

    let updated_template = template.clone();

    // 設定を保存
    WorkspaceService::save_config(&workspace_path, &config)?;

    Ok(updated_template)
}

/// テンプレートを削除
#[tauri::command]
pub async fn delete_template(
    workspace_path: String,
    name: String,
) -> Result<(), String> {
    let mut config = WorkspaceService::load_config(&workspace_path)?;

    if config.templates.remove_template(&name).is_none() {
        return Err(format!("Template '{}' not found", name));
    }

    // 設定を保存
    WorkspaceService::save_config(&workspace_path, &config)?;

    Ok(())
}

/// テンプレート名を変更
#[tauri::command]
pub async fn rename_template(
    workspace_path: String,
    old_name: String,
    new_name: String,
) -> Result<(), String> {
    let mut config = WorkspaceService::load_config(&workspace_path)?;

    config.templates.rename_template(&old_name, new_name)?;

    // 設定を保存
    WorkspaceService::save_config(&workspace_path, &config)?;

    Ok(())
}

/// デフォルトテンプレートを設定
#[tauri::command]
pub async fn set_default_template(
    workspace_path: String,
    template_name: Option<String>,
) -> Result<(), String> {
    let mut config = WorkspaceService::load_config(&workspace_path)?;

    config.templates.set_default(template_name)?;

    // 設定を保存
    WorkspaceService::save_config(&workspace_path, &config)?;

    Ok(())
}

/// テンプレートを新規タスクに適用
#[tauri::command]
pub async fn apply_template_to_new_task(
    workspace_path: String,
    template_name: String,
    content: String,
) -> Result<String, String> {
    let config = WorkspaceService::load_config(&workspace_path)?;

    let template = config.templates.get_template(&template_name)
        .ok_or_else(|| format!("Template '{}' not found", template_name))?;

    TemplateService::apply_template_to_new_task(template, &content)
}

/// テンプレートを既存タスクに適用
#[tauri::command]
pub async fn apply_template_to_existing_task(
    workspace_path: String,
    template_name: String,
    task_content: String,
    overwrite: bool,
) -> Result<String, String> {
    let config = WorkspaceService::load_config(&workspace_path)?;

    let template = config.templates.get_template(&template_name)
        .ok_or_else(|| format!("Template '{}' not found", template_name))?;

    TemplateService::apply_template_to_existing_task(template, &task_content, overwrite)
}

/// 既存タスクからテンプレートを作成
#[tauri::command]
pub async fn create_template_from_task(
    workspace_path: String,
    task_content: String,
    template_name: String,
    description: Option<String>,
) -> Result<TagTemplate, String> {
    let template = TemplateService::create_template_from_task(
        &task_content,
        template_name.clone(),
        description,
    )?;

    // バリデーション
    let errors = TemplateService::validate_template(&template);
    if !errors.is_empty() {
        return Err(format!("Validation failed: {}", errors.join(", ")));
    }

    // 設定を読み込み
    let mut config = WorkspaceService::load_config(&workspace_path)?;

    // テンプレート名の重複チェック
    if config.templates.templates.contains_key(&template_name) {
        return Err(format!("Template '{}' already exists", template_name));
    }

    // テンプレートを追加
    config.templates.add_template(template.clone());

    // 設定を保存
    WorkspaceService::save_config(&workspace_path, &config)?;

    Ok(template)
}

/// テンプレートのプレビューを取得
#[tauri::command]
pub async fn preview_template(
    workspace_path: String,
    template_name: String,
) -> Result<String, String> {
    let config = WorkspaceService::load_config(&workspace_path)?;

    let template = config.templates.get_template(&template_name)
        .ok_or_else(|| format!("Template '{}' not found", template_name))?;

    TemplateService::preview_template(template)
}
