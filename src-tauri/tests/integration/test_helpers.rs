// 統合テスト用ヘルパー関数

use std::path::PathBuf;
use std::fs;
use tempfile::TempDir;

// 注意: 実際の型インポートは、lib.rsでpub useされている必要があります
// テスト時は直接モジュールをインポートするか、適切なパスを使用します

/// テスト用のワークスペースを作成
pub fn create_test_workspace() -> Result<TempDir, std::io::Error> {
    let temp_dir = TempDir::new()?;
    let workspace_path = temp_dir.path();

    // .hienmark ディレクトリを作成
    let hienmark_dir = workspace_path.join(".hienmark");
    fs::create_dir_all(&hienmark_dir)?;

    // 基本的な設定ファイルを作成
    let config = r#"{
  "strictTagMode": false,
  "allowedCategories": ["status", "priority"],
  "watchEnabled": false,
  "autoSaveEnabled": true,
  "autoSaveInterval": 3000
}"#;
    fs::write(workspace_path.join(".hienmark.json"), config)?;

    Ok(temp_dir)
}

/// テスト用のタスクファイルを作成
pub fn create_test_task(workspace_path: &PathBuf, task_id: &str, content: &str) -> Result<PathBuf, std::io::Error> {
    let file_path = workspace_path.join(format!("{}.md", task_id));
    fs::write(&file_path, content)?;
    Ok(file_path)
}

/// テスト用のFrontMatterを含むタスクを作成
pub fn create_task_with_frontmatter(
    workspace_path: &PathBuf,
    task_id: &str,
    frontmatter: &str,
    body: &str,
) -> Result<PathBuf, std::io::Error> {
    let content = format!("---\n{}\n---\n\n{}", frontmatter, body);
    create_test_task(workspace_path, task_id, &content)
}

/// テスト用のワークスペースをクリーンアップ
pub fn cleanup_test_workspace(temp_dir: TempDir) {
    drop(temp_dir); // TempDirがドロップされると自動的に削除される
}

/// テスト用の分析設定を作成
pub fn create_test_analysis_settings(workspace_path: &PathBuf) -> Result<(), std::io::Error> {
    let settings = r#"{
  "chartMappings": {
    "gantt": {
      "type": "gantt",
      "mapping": {
        "title": "title",
        "startDate": "start_date",
        "endDate": "end_date"
      }
    },
    "pie": {
      "type": "pie",
      "mapping": {
        "category": "status",
        "value": "count"
      }
    }
  }
}"#;
    
    let settings_path = workspace_path.join(".hienmark").join("analysis_settings.json");
    fs::write(settings_path, settings)?;
    Ok(())
}

/// テスト用のタグスキーマファイルを作成
pub fn create_test_tag_schema(workspace_path: &PathBuf) -> Result<(), std::io::Error> {
    let schema = r#"{
  "status": {
    "type": "Select",
    "options": {
      "optionsList": ["todo", "doing", "done"],
      "allowManualEntry": false
    }
  },
  "priority": {
    "type": "Number",
    "options": {
      "min": 1,
      "max": 5,
      "defaultValue": 3
    }
  }
}"#;
    
    let schema_path = workspace_path.join(".hienmark").join("tag_schema.json");
    fs::write(schema_path, schema)?;
    Ok(())
}

/// アサーション用のヘルパー
pub mod assertions {
    use crate::models::{Task, TagValue, FrontMatter};
    
    /// タスクが期待されるFrontMatterを持つことを検証
    pub fn assert_frontmatter_contains(tasks: &[Task], tag_key: &str, expected_value: &TagValue) {
        let found = tasks.iter().any(|task| {
            task.front_matter.tags.get(tag_key)
                .map(|v| values_equal(v, expected_value))
                .unwrap_or(false)
        });
        
        assert!(found, "Expected to find tag '{}' with value {:?} in tasks", tag_key, expected_value);
    }
    
    /// 2つのTagValueが等しいか比較
    fn values_equal(v1: &TagValue, v2: &TagValue) -> bool {
        match (v1, v2) {
            (TagValue::String(s1), TagValue::String(s2)) => s1 == s2,
            (TagValue::Number(n1), TagValue::Number(n2)) => n1 == n2,
            (TagValue::Float(f1), TagValue::Float(f2)) => (f1 - f2).abs() < f64::EPSILON,
            (TagValue::Bool(b1), TagValue::Bool(b2)) => b1 == b2,
            (TagValue::Array(a1), TagValue::Array(a2)) => a1 == a2,
            _ => false,
        }
    }
    
    /// タスクが期待される内容を持つことを検証
    pub fn assert_task_has_content(task: &Task, expected_content: &str) {
        assert!(
            task.content.contains(expected_content),
            "Expected task content to contain '{}', but got: {}", 
            expected_content, 
            task.content
        );
    }
}

