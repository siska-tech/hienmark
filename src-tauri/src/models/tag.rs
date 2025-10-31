use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::{TagValue};

/// 全タスクから集約されたタグ情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagIndex {
    /// カテゴリ名 → 値のリスト
    pub categories: HashMap<String, TagCategory>,

    /// 最終更新日時
    #[serde(rename = "updatedAt")]
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl TagIndex {
    pub fn new() -> Self {
        Self {
            categories: HashMap::new(),
            updated_at: chrono::Utc::now(),
        }
    }

    /// タスクのタグをインデックスに追加
    ///
    /// # Arguments
    /// * `task_id` - タスクID
    /// * `tags` - タスクのタグマップ
    pub fn index_task(&mut self, task_id: &str, tags: &HashMap<String, TagValue>) {
        for (category_name, tag_value) in tags {
            let category = self
                .categories
                .entry(category_name.clone())
                .or_insert_with(|| TagCategory::new(category_name.clone()));

            // タスクIDを追加（重複チェック）
            if !category.task_ids.contains(&task_id.to_string()) {
                category.task_ids.push(task_id.to_string());
            }

            // 値の出現回数をカウント
            let value_str = tag_value.to_string_value();
            *category.values.entry(value_str).or_insert(0) += 1;
        }

        self.updated_at = chrono::Utc::now();
    }
}

impl Default for TagIndex {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagCategory {
    /// カテゴリ名 (例: "status")
    pub name: String,

    /// 出現した値とその使用回数
    pub values: HashMap<String, usize>,

    /// このカテゴリを持つタスクID一覧
    #[serde(rename = "taskIds")]
    pub task_ids: Vec<String>,
}

impl TagCategory {
    pub fn new(name: String) -> Self {
        Self {
            name,
            values: HashMap::new(),
            task_ids: Vec::new(),
        }
    }
}
