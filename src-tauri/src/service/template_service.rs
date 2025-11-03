use crate::models::{TagTemplate, FrontMatter};
use crate::parser::frontmatter::FrontMatterParser;

/// テンプレート関連の操作を提供するサービス
pub struct TemplateService;

impl TemplateService {
    /// テンプレートを新規タスクに適用（フロントマター文字列を生成）
    ///
    /// # Arguments
    /// * `template` - 適用するテンプレート
    /// * `content` - タスクの本文（オプション、空文字列でもOK）
    ///
    /// # Returns
    /// フロントマターを含む完全なMarkdown文字列
    pub fn apply_template_to_new_task(template: &TagTemplate, content: &str) -> Result<String, String> {
        let front_matter = FrontMatter {
            tags: template.tags.clone(),
        };

        FrontMatterParser::serialize(&front_matter, content)
            .map_err(|e| format!("Failed to serialize front matter: {}", e))
    }

    /// テンプレートを既存タスクに適用（既存タグをマージ）
    ///
    /// # Arguments
    /// * `template` - 適用するテンプレート
    /// * `task_content` - 既存タスクの完全な内容
    /// * `overwrite` - trueの場合は既存タグを上書き、falseの場合はマージ
    ///
    /// # Returns
    /// 更新されたMarkdown文字列
    pub fn apply_template_to_existing_task(
        template: &TagTemplate,
        task_content: &str,
        overwrite: bool,
    ) -> Result<String, String> {
        let (mut front_matter, body) = FrontMatterParser::parse(task_content)
            .map_err(|e| format!("Failed to parse front matter: {}", e))?;

        if overwrite {
            // 上書きモード: テンプレートのタグで完全に置き換え
            front_matter.tags = template.tags.clone();
        } else {
            // マージモード: 既存タグを保持し、テンプレートのタグを追加（既存タグが優先）
            for (key, value) in &template.tags {
                front_matter.tags.entry(key.clone()).or_insert(value.clone());
            }
        }

        FrontMatterParser::serialize(&front_matter, &body)
            .map_err(|e| format!("Failed to serialize front matter: {}", e))
    }

    /// ファイルからテンプレートを生成（既存タスクをテンプレート化）
    ///
    /// # Arguments
    /// * `task_content` - タスクの完全な内容
    /// * `template_name` - テンプレート名
    /// * `description` - テンプレートの説明
    ///
    /// # Returns
    /// 新しいTagTemplate
    pub fn create_template_from_task(
        task_content: &str,
        template_name: String,
        description: Option<String>,
    ) -> Result<TagTemplate, String> {
        let (front_matter, _) = FrontMatterParser::parse(task_content)
            .map_err(|e| format!("Failed to parse front matter: {}", e))?;

        if front_matter.tags.is_empty() {
            return Err("Task has no tags to create template from".to_string());
        }

        Ok(TagTemplate::new(template_name, description, front_matter.tags))
    }

    /// テンプレートのプレビュー（YAML形式の文字列を生成）
    ///
    /// # Arguments
    /// * `template` - プレビューするテンプレート
    ///
    /// # Returns
    /// YAML形式のフロントマター文字列（区切り記号含む）
    pub fn preview_template(template: &TagTemplate) -> Result<String, String> {
        let front_matter = FrontMatter {
            tags: template.tags.clone(),
        };

        FrontMatterParser::serialize(&front_matter, "")
            .map_err(|e| format!("Failed to serialize template: {}", e))
    }

    /// テンプレートのバリデーション
    ///
    /// # Arguments
    /// * `template` - バリデーションするテンプレート
    ///
    /// # Returns
    /// バリデーション結果（エラーメッセージのリスト）
    pub fn validate_template(template: &TagTemplate) -> Vec<String> {
        let mut errors = Vec::new();

        if template.name.trim().is_empty() {
            errors.push("Template name cannot be empty".to_string());
        }

        if template.tags.is_empty() {
            errors.push("Template must have at least one tag".to_string());
        }

        // タグキーの検証
        for key in template.tags.keys() {
            if key.trim().is_empty() {
                errors.push("Tag keys cannot be empty".to_string());
            }
            if key.contains('\n') {
                errors.push(format!("Tag key '{}' cannot contain newlines", key));
            }
        }

        errors
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_template_to_new_task() {
        use std::collections::HashMap;
        use crate::models::task::TagValue;
        
        let mut tags = HashMap::new();
        tags.insert("status".to_string(), TagValue::String("pending".to_string()));
        tags.insert("priority".to_string(), TagValue::String("high".to_string()));

        let template = TagTemplate::new(
            "default".to_string(),
            Some("Default template".to_string()),
            tags,
        );

        let result = TemplateService::apply_template_to_new_task(&template, "# My Task\n\nTask content");
        assert!(result.is_ok());

        let content = result.unwrap();
        assert!(content.contains("status: pending"));
        assert!(content.contains("priority: high"));
        assert!(content.contains("# My Task"));
    }

    #[test]
    fn test_apply_template_to_existing_task_merge() {
        use std::collections::HashMap;
        use crate::models::task::TagValue;
        
        let mut tags = HashMap::new();
        tags.insert("status".to_string(), TagValue::String("pending".to_string()));
        tags.insert("priority".to_string(), TagValue::String("high".to_string()));

        let template = TagTemplate::new(
            "default".to_string(),
            None,
            tags,
        );

        let existing_content = "---\nstatus: done\ntags: [important]\n---\n# Task\n\nContent";
        let result = TemplateService::apply_template_to_existing_task(&template, existing_content, false);

        assert!(result.is_ok());
        let content = result.unwrap();
        // 既存のstatusが優先される（マージモード）
        assert!(content.contains("status: done"));
        // テンプレートのpriorityが追加される
        assert!(content.contains("priority: high"));
        // 既存のtagsは保持
        assert!(content.contains("tags:"));
    }

    #[test]
    fn test_apply_template_to_existing_task_overwrite() {
        use std::collections::HashMap;
        use crate::models::task::TagValue;
        
        let mut tags = HashMap::new();
        tags.insert("status".to_string(), TagValue::String("pending".to_string()));

        let template = TagTemplate::new(
            "default".to_string(),
            None,
            tags,
        );

        let existing_content = "---\nstatus: done\ntags: [important]\n---\n# Task\n\nContent";
        let result = TemplateService::apply_template_to_existing_task(&template, existing_content, true);

        assert!(result.is_ok());
        let content = result.unwrap();
        // 上書きモードなのでstatusが置き換わる
        assert!(content.contains("status: pending"));
        // tagsは削除される（テンプレートにないため）
        assert!(!content.contains("tags:"));
    }

    #[test]
    fn test_create_template_from_task() {
        let task_content = "---\nstatus: pending\npriority: high\n---\n# Task\n\nContent";
        let result = TemplateService::create_template_from_task(
            task_content,
            "my-template".to_string(),
            Some("Test template".to_string()),
        );

        assert!(result.is_ok());
        let template = result.unwrap();
        assert_eq!(template.name, "my-template");
        assert_eq!(template.description, Some("Test template".to_string()));
        assert_eq!(template.tags.len(), 2);
    }

    #[test]
    fn test_validate_template() {
        use std::collections::HashMap;
        use crate::models::task::TagValue;
        
        let mut tags = HashMap::new();
        tags.insert("status".to_string(), TagValue::String("pending".to_string()));

        let template = TagTemplate::new("valid".to_string(), None, tags);
        let errors = TemplateService::validate_template(&template);
        assert!(errors.is_empty());

        // 空のテンプレート名
        let invalid_template = TagTemplate::new("".to_string(), None, HashMap::new());
        let errors = TemplateService::validate_template(&invalid_template);
        assert!(!errors.is_empty());
    }
}
