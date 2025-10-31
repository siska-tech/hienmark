use crate::models::{FrontMatter, TagValue};
use std::collections::HashMap;
use regex::Regex;

pub struct FrontMatterParser;

impl FrontMatterParser {
    /// Front Matterをパースして本文と分離（タグ順序も返す）
    pub fn parse(content: &str) -> Result<(FrontMatter, String), String> {
        // 改行コードを正規化（Windows対応）
        let normalized = content.replace("\r\n", "\n");

        // Front Matterを正規表現で抽出（終了後の空行も含む）
        let re = Regex::new(r"^---\n([\s\S]*?)\n---\n+").unwrap();

        if let Some(caps) = re.captures(&normalized) {
            let yaml_str = &caps[1];
            let front_matter = Self::parse_yaml_to_front_matter(yaml_str)?;

            // Front Matter部分を除いた本文
            let body = re.replace(&normalized, "").to_string();

            Ok((front_matter, body))
        } else {
            // Front Matterなしの場合
            Ok((FrontMatter::default(), content.to_string()))
        }
    }

    /// Front Matterをパースして、タグの順序も返す
    pub fn parse_with_order(content: &str) -> Result<(FrontMatter, String, Vec<String>), String> {
        // 改行コードを正規化（Windows対応）
        let normalized = content.replace("\r\n", "\n");

        // Front Matterを正規表現で抽出（終了後の空行も含む）
        let re = Regex::new(r"^---\n([\s\S]*?)\n---\n+").unwrap();

        if let Some(caps) = re.captures(&normalized) {
            let yaml_str = &caps[1];
            let (front_matter, tag_order) = Self::parse_yaml_to_front_matter_with_order(yaml_str)?;

            // Front Matter部分を除いた本文
            let body = re.replace(&normalized, "").to_string();

            Ok((front_matter, body, tag_order))
        } else {
            // Front Matterなしの場合
            Ok((FrontMatter::default(), content.to_string(), Vec::new()))
        }
    }

    fn parse_yaml_to_front_matter(yaml: &str) -> Result<FrontMatter, String> {
        if yaml.trim().is_empty() {
            return Ok(FrontMatter::default());
        }

        let value: serde_yaml::Value = serde_yaml::from_str(yaml)
            .map_err(|e| format!("Failed to parse front matter YAML: {}", e))?;

        let mut tags = HashMap::new();

        if let serde_yaml::Value::Mapping(map) = value {
            for (key, val) in map {
                if let serde_yaml::Value::String(key_str) = key {
                    let tag_value = Self::yaml_value_to_tag_value(&val);
                    tags.insert(key_str, tag_value);
                }
            }
        }

        Ok(FrontMatter { tags })
    }

    fn parse_yaml_to_front_matter_with_order(yaml: &str) -> Result<(FrontMatter, Vec<String>), String> {
        if yaml.trim().is_empty() {
            return Ok((FrontMatter::default(), Vec::new()));
        }

        let value: serde_yaml::Value = serde_yaml::from_str(yaml)
            .map_err(|e| format!("Failed to parse front matter YAML: {}", e))?;

        let mut tags = HashMap::new();
        let mut tag_order = Vec::new();

        if let serde_yaml::Value::Mapping(map) = value {
            for (key, val) in map {
                if let serde_yaml::Value::String(key_str) = key {
                    let tag_value = Self::yaml_value_to_tag_value(&val);
                    tag_order.push(key_str.clone());
                    tags.insert(key_str, tag_value);
                }
            }
        }

        Ok((FrontMatter { tags }, tag_order))
    }

    fn yaml_value_to_tag_value(value: &serde_yaml::Value) -> TagValue {
        match value {
            serde_yaml::Value::String(s) => TagValue::String(s.clone()),
            serde_yaml::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    TagValue::Number(i)
                } else if let Some(f) = n.as_f64() {
                    TagValue::Float(f)
                } else {
                    TagValue::String(n.to_string())
                }
            }
            serde_yaml::Value::Bool(b) => TagValue::Bool(*b),
            serde_yaml::Value::Sequence(seq) => {
                let strings: Vec<String> = seq
                    .iter()
                    .map(|v| match v {
                        serde_yaml::Value::String(s) => s.clone(),
                        _ => v.as_str().unwrap_or("").to_string(),
                    })
                    .collect();
                TagValue::Array(strings)
            }
            _ => TagValue::String(value.as_str().unwrap_or("").to_string()),
        }
    }

    /// Front MatterとMarkdown本文を結合
    pub fn serialize(front_matter: &FrontMatter, content: &str) -> Result<String, String> {
        Self::serialize_with_order(front_matter, content, None)
    }

    /// Front MatterとMarkdown本文を結合（タグ順序指定可能）
    pub fn serialize_with_order(front_matter: &FrontMatter, content: &str, tag_order: Option<&Vec<String>>) -> Result<String, String> {
        if front_matter.tags.is_empty() {
            return Ok(content.to_string());
        }

        let mut yaml_lines = Vec::new();

        // タグ順序が指定されている場合は、その順序で処理
        let keys: Vec<String> = if let Some(order) = tag_order {
            // 指定された順序に従って、存在するキーのみを取得
            order.iter()
                .filter(|key| front_matter.tags.contains_key(*key))
                .cloned()
                .collect()
        } else {
            // 順序指定がない場合は、HashMapのキーをそのまま使用
            front_matter.tags.keys().cloned().collect()
        };

        for key in keys {
            if let Some(value) = front_matter.tags.get(&key) {
                match value {
                    TagValue::String(s) => {
                        if s.is_empty() {
                            yaml_lines.push(format!("{}: ", key));
                        } else {
                            yaml_lines.push(format!("{}: {}", key, s));
                        }
                    }
                    TagValue::Number(n) => {
                        yaml_lines.push(format!("{}: {}", key, n));
                    }
                    TagValue::Float(f) => {
                        yaml_lines.push(format!("{}: {}", key, f));
                    }
                    TagValue::Bool(b) => {
                        yaml_lines.push(format!("{}: {}", key, b));
                    }
                    TagValue::Array(arr) => {
                        if arr.is_empty() {
                            yaml_lines.push(format!("{}: []", key));
                        } else {
                            let array_str = format!("[{}]", arr.join(", "));
                            yaml_lines.push(format!("{}: {}", key, array_str));
                        }
                    }
                }
            }
        }

        let yaml = yaml_lines.join("\n");
        Ok(format!("---\n{}\n---\n\n{}", yaml, content))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_front_matter() {
        let content = r#"---
status: pending
priority: high
due_date: 2025-11-15
---

# Task Content"#;

        let (front_matter, body) = FrontMatterParser::parse(content).unwrap();

        match front_matter.tags.get("status").unwrap() {
            TagValue::String(s) => assert_eq!(s, "pending"),
            _ => panic!("Expected string"),
        }
        match front_matter.tags.get("priority").unwrap() {
            TagValue::String(s) => assert_eq!(s, "high"),
            _ => panic!("Expected string"),
        }
        assert!(body.contains("# Task Content"));
    }

    #[test]
    fn test_parse_no_front_matter() {
        let content = "# Just a regular markdown file";
        let (front_matter, body) = FrontMatterParser::parse(content).unwrap();

        assert!(front_matter.tags.is_empty());
        assert_eq!(body, content);
    }

    #[test]
    fn test_parse_array_values() {
        let content = r#"---
depends_on: [task-001, task-002]
---
Content"#;

        let (front_matter, _) = FrontMatterParser::parse(content).unwrap();
        let depends = front_matter.tags.get("depends_on").unwrap();

        match depends {
            TagValue::Array(arr) => {
                assert_eq!(arr.len(), 2);
                assert_eq!(arr[0], "task-001");
            }
            _ => panic!("Expected array"),
        }
    }

    #[test]
    fn test_serialize_front_matter() {
        let mut tags = HashMap::new();
        tags.insert("status".to_string(), TagValue::String("done".to_string()));
        tags.insert("priority".to_string(), TagValue::String("high".to_string()));

        let front_matter = FrontMatter { tags };
        let content = "Task body";

        let result = FrontMatterParser::serialize(&front_matter, content).unwrap();

        assert!(result.starts_with("---"));
        assert!(result.contains("status: done"));
        assert!(result.contains("priority: high"));
        assert!(result.contains("Task body"));
    }

    #[test]
    fn test_serialize_array_values() {
        let mut tags = HashMap::new();
        tags.insert("status".to_string(), TagValue::Array(vec![
            "open".to_string(),
            "inprogress".to_string(),
            "close".to_string(),
        ]));

        let front_matter = FrontMatter { tags };
        let content = "Task body";

        let result = FrontMatterParser::serialize(&front_matter, content).unwrap();

        assert!(result.contains("status:"));
        assert!(result.contains("- open"));
        assert!(result.contains("- inprogress"));
        assert!(result.contains("- close"));
    }
}
