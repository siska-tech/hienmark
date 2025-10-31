use serde::{Deserialize, Serialize};

/// 比較演算子
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComparisonOperator {
    #[serde(rename = "==")]
    Equal,
    #[serde(rename = "!=")]
    NotEqual,
    #[serde(rename = ">")]
    GreaterThan,
    #[serde(rename = "<")]
    LessThan,
    #[serde(rename = ">=")]
    GreaterThanOrEqual,
    #[serde(rename = "<=")]
    LessThanOrEqual,
    #[serde(rename = "contains")]
    Contains,
    #[serde(rename = "starts_with")]
    StartsWith,
    #[serde(rename = "ends_with")]
    EndsWith,
    #[serde(rename = "regex")]
    Regex,
}

/// 論理演算子
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogicalOperator {
    AND,
    OR,
    NOT,
}

/// ソート順
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SortOrder {
    Asc,
    Desc,
}

/// フィルター条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    #[serde(rename = "tagKey")]
    pub tag_key: String,
    pub operator: ComparisonOperator,
    pub value: serde_json::Value,
}

/// フィルター式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterExpression {
    pub condition: Option<FilterCondition>,
    pub expressions: Option<Vec<FilterExpression>>,
    #[serde(rename = "logicalOperator")]
    pub logical_operator: Option<LogicalOperator>,
}

/// カスタムフィルター
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomFilter {
    pub name: String,
    pub description: Option<String>,
    pub expression: FilterExpression,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// ソートキー
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortKey {
    #[serde(rename = "tagKey")]
    pub tag_key: String,
    pub order: SortOrder,
    #[serde(rename = "customOrder")]
    pub custom_order: Option<Vec<String>>,
}

/// カスタムソート
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomSort {
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "sortKeys")]
    pub sort_keys: Vec<SortKey>,
    #[serde(rename = "handleMissing")]
    pub handle_missing: String, // "first" or "last"
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// カスタムフィルター/ソート設定コレクション
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomFiltersAndSorts {
    pub filters: Vec<CustomFilter>,
    pub sorts: Vec<CustomSort>,
}


