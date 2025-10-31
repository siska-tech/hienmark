use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::TagValue;

/// 許容値の設定方法
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AllowedValueType {
    /// 直接入力（自由な値）
    DirectInput,
    /// リスト設定（選択肢の定義）
    List(Vec<String>),
    /// パターン設定（正規表現による制約）
    Pattern(String),
    /// 範囲設定（数値の範囲制約）
    Range { min: f64, max: f64 },
}

/// タグの設定情報（エイリアス、許容値、型定義など）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagConfig {
    /// タグのエイリアス（表示名）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alias: Option<String>,
    
    /// タグの型
    pub tag_type: TagType,
    
    /// 許容値の設定
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allowed_value_type: Option<AllowedValueType>,
    
    /// デフォルト値
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<TagValue>,
    
    /// 必須かどうか
    #[serde(default)]
    pub required: bool,
    
    /// 説明文
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// タグの型定義
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TagType {
    /// 文字列型（自由入力）
    String,
    /// 選択型（ドロップダウン）
    Select,
    /// 複数選択型（チェックボックス）
    MultiSelect,
    /// 数値型
    Number,
    /// 真偽値型
    Boolean,
    /// 日付型
    Date,
    /// 配列型（文字列の配列）
    Array,
}

impl Default for TagConfig {
    fn default() -> Self {
        Self {
            alias: None,
            tag_type: TagType::String,
            allowed_value_type: None,
            default_value: None,
            required: false,
            description: None,
        }
    }
}

impl TagConfig {
    /// 新しいタグ設定を作成
    pub fn new(tag_type: TagType) -> Self {
        Self {
            tag_type,
            ..Default::default()
        }
    }
    
    /// エイリアスを設定
    pub fn with_alias(mut self, alias: String) -> Self {
        self.alias = Some(alias);
        self
    }
    
    /// 許容値を設定
    pub fn with_allowed_value_type(mut self, allowed_value_type: AllowedValueType) -> Self {
        self.allowed_value_type = Some(allowed_value_type);
        self
    }
    
    /// デフォルト値を設定
    pub fn with_default_value(mut self, value: TagValue) -> Self {
        self.default_value = Some(value);
        self
    }
    
    /// 説明を設定
    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }
}

/// タグ設定コレクション - ワークスペース全体のタグ設定を管理
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TagConfigCollection {
    /// タグ名 → タグ設定
    pub configs: HashMap<String, TagConfig>,
}

impl TagConfigCollection {
    /// 新しいタグ設定コレクションを作成
    pub fn new() -> Self {
        Self {
            configs: HashMap::new(),
        }
    }
    
    /// タグ設定を追加または更新
    pub fn set_config(&mut self, tag_name: String, config: TagConfig) {
        self.configs.insert(tag_name, config);
    }
    
    /// デフォルトのタグ設定を作成
    pub fn create_default_configs() -> Self {
        let mut collection = Self::new();
        
        // status タグの設定
        collection.set_config(
            "status".to_string(),
            TagConfig::new(TagType::Select)
                .with_alias("ステータス".to_string())
                .with_allowed_value_type(AllowedValueType::List(vec![
                    "open".to_string(),
                    "inprogress".to_string(),
                    "delay".to_string(),
                    "pending".to_string(),
                    "close".to_string(),
                ]))
                .with_default_value(TagValue::String("pending".to_string()))
                .with_description("タスクの現在の状態".to_string()),
        );
        
        // priority タグの設定
        collection.set_config(
            "priority".to_string(),
            TagConfig::new(TagType::Select)
                .with_alias("優先度".to_string())
                .with_allowed_value_type(AllowedValueType::List(vec![
                    "low".to_string(),
                    "medium".to_string(),
                    "high".to_string(),
                    "urgent".to_string(),
                ]))
                .with_default_value(TagValue::String("medium".to_string()))
                .with_description("タスクの優先度".to_string()),
        );
        
        // tags タグの設定
        collection.set_config(
            "tags".to_string(),
            TagConfig::new(TagType::MultiSelect)
                .with_alias("ラベル".to_string())
                .with_allowed_value_type(AllowedValueType::List(vec![
                    "bug".to_string(),
                    "feature".to_string(),
                    "urgent".to_string(),
                    "review".to_string(),
                    "documentation".to_string(),
                ]))
                .with_description("タスクの分類ラベル".to_string()),
        );
        
        // assignee タグの設定
        collection.set_config(
            "assignee".to_string(),
            TagConfig::new(TagType::String)
                .with_alias("担当者".to_string())
                .with_allowed_value_type(AllowedValueType::DirectInput)
                .with_description("タスクの担当者".to_string()),
        );
        
        // due_date タグの設定
        collection.set_config(
            "due_date".to_string(),
            TagConfig::new(TagType::Date)
                .with_alias("期限".to_string())
                .with_allowed_value_type(AllowedValueType::DirectInput)
                .with_description("タスクの期限日".to_string()),
        );
        
        collection
    }
}
