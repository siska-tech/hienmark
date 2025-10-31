use serde::{Deserialize, Serialize, Serializer};
use std::collections::HashMap;
use std::path::PathBuf;

/// タスクファイルを表現する構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    /// タスクID (ファイル名由来)
    pub id: String,

    /// ファイルパス
    #[serde(rename = "filePath")]
    pub file_path: PathBuf,

    /// Front Matter (タグ情報)
    #[serde(rename = "frontMatter")]
    pub front_matter: FrontMatter,

    /// Markdown本文 (Front Matter除外)
    pub content: String,

    /// ファイル最終更新日時
    #[serde(rename = "modifiedAt")]
    pub modified_at: chrono::DateTime<chrono::Utc>,

    /// Front Matterのタグ順序
    #[serde(rename = "tagOrder", skip_serializing_if = "Option::is_none")]
    pub tag_order: Option<Vec<String>>,
}

/// Front Matterデータ構造
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FrontMatter {
    /// 任意のキー・バリューペア
    #[serde(flatten)]
    pub tags: HashMap<String, TagValue>,
}

/// タグ値 (文字列、数値、配列、日付など)
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum TagValue {
    String(String),
    Number(i64),
    Float(f64),
    Bool(bool),
    Array(Vec<String>),
    // ISO 8601形式の日付文字列 (YYYY-MM-DD)
    // Note: Serdeのuntaggedでは、これはStringとして扱われるため
    // パース時に日付形式を検証する必要がある
}

impl Serialize for TagValue {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            TagValue::String(s) => serializer.serialize_str(s),
            TagValue::Number(n) => serializer.serialize_i64(*n),
            TagValue::Float(f) => serializer.serialize_f64(*f),
            TagValue::Bool(b) => serializer.serialize_bool(*b),
            TagValue::Array(arr) => {
                // 配列をYAMLリスト形式でシリアライズ
                // serde_yamlの設定でリスト形式を強制
                use serde::ser::SerializeSeq;
                let mut seq = serializer.serialize_seq(Some(arr.len()))?;
                for item in arr {
                    seq.serialize_element(item)?;
                }
                seq.end()
            }
        }
    }
}

impl TagValue {
    pub fn to_string_value(&self) -> String {
        match self {
            TagValue::String(s) => s.clone(),
            TagValue::Number(n) => n.to_string(),
            TagValue::Float(f) => f.to_string(),
            TagValue::Bool(b) => b.to_string(),
            TagValue::Array(arr) => format!("[{}]", arr.join(", ")),
        }
    }
}
