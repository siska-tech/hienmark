use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::TagValue;

/// タグテンプレート - 新規タスク作成時や既存タスクへの適用に使用
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagTemplate {
    /// テンプレート名
    pub name: String,

    /// テンプレートの説明
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// デフォルトタグ値
    pub tags: HashMap<String, TagValue>,

    /// 作成日時
    #[serde(rename = "createdAt")]
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// 最終更新日時
    #[serde(rename = "updatedAt")]
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl TagTemplate {
    pub fn new(name: String, description: Option<String>, tags: HashMap<String, TagValue>) -> Self {
        let now = chrono::Utc::now();
        Self {
            name,
            description,
            tags,
            created_at: now,
            updated_at: now,
        }
    }

    /// テンプレートを更新
    pub fn update(&mut self, description: Option<String>, tags: HashMap<String, TagValue>) {
        self.description = description;
        self.tags = tags;
        self.updated_at = chrono::Utc::now();
    }
}

/// テンプレートコレクション - ワークスペース設定に保存
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TemplateCollection {
    /// テンプレート名 → テンプレート
    pub templates: HashMap<String, TagTemplate>,

    /// デフォルトテンプレート名（新規タスク作成時に自動適用）
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "defaultTemplate")]
    pub default_template: Option<String>,
}

impl TemplateCollection {
    pub fn new() -> Self {
        Self {
            templates: HashMap::new(),
            default_template: None,
        }
    }

    /// テンプレートを追加
    pub fn add_template(&mut self, template: TagTemplate) {
        self.templates.insert(template.name.clone(), template);
    }

    /// テンプレートを削除
    pub fn remove_template(&mut self, name: &str) -> Option<TagTemplate> {
        // デフォルトテンプレートが削除された場合、デフォルトをクリア
        if self.default_template.as_deref() == Some(name) {
            self.default_template = None;
        }
        self.templates.remove(name)
    }

    /// テンプレートを取得
    pub fn get_template(&self, name: &str) -> Option<&TagTemplate> {
        self.templates.get(name)
    }

    /// テンプレート名を変更
    pub fn rename_template(&mut self, old_name: &str, new_name: String) -> Result<(), String> {
        if self.templates.contains_key(&new_name) {
            return Err(format!("Template '{}' already exists", new_name));
        }

        if let Some(mut template) = self.templates.remove(old_name) {
            template.name = new_name.clone();
            template.updated_at = chrono::Utc::now();
            self.templates.insert(new_name.clone(), template);

            // デフォルトテンプレート名も更新
            if self.default_template.as_deref() == Some(old_name) {
                self.default_template = Some(new_name);
            }

            Ok(())
        } else {
            Err(format!("Template '{}' not found", old_name))
        }
    }

    /// デフォルトテンプレートを設定
    pub fn set_default(&mut self, name: Option<String>) -> Result<(), String> {
        if let Some(ref template_name) = name {
            if !self.templates.contains_key(template_name) {
                return Err(format!("Template '{}' not found", template_name));
            }
        }
        self.default_template = name;
        Ok(())
    }

    /// デフォルトテンプレートを取得
    pub fn get_default_template(&self) -> Option<&TagTemplate> {
        self.default_template
            .as_ref()
            .and_then(|name| self.templates.get(name))
    }
}
