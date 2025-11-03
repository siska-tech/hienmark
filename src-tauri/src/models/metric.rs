use serde::{Deserialize, Serialize};
use crate::models::{Task, TagValue};
use crate::models::filter_sort::{FilterExpression, FilterCondition, ComparisonOperator, LogicalOperator};

/// メトリック計算タイプ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MetricCalculationType {
    Count,
    Sum,
    Average,
}

/// メトリック定義
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metric {
    pub id: String,
    pub name: String,
    #[serde(rename = "calculationType")]
    pub calculation_type: MetricCalculationType,
    #[serde(rename = "sourceTag", skip_serializing_if = "Option::is_none")]
    pub source_tag: Option<String>,
    #[serde(rename = "filterExpression", skip_serializing_if = "Option::is_none")]
    pub filter_expression: Option<FilterExpression>,
    #[serde(rename = "isDefault", skip_serializing_if = "Option::is_none")]
    pub is_default: Option<bool>,
}

impl Metric {
    /// タスクのリストに対してメトリックを評価し、値を計算する
    pub fn evaluate(&self, tasks: &[&Task]) -> f64 {
        // フィルターを適用
        let filtered_tasks: Vec<&Task> = if let Some(ref filter_expr) = self.filter_expression {
            tasks.iter()
                .filter(|task| Self::evaluate_filter_expression(task, filter_expr))
                .copied()
                .collect()
        } else {
            tasks.iter().copied().collect()
        };

        match self.calculation_type {
            MetricCalculationType::Count => filtered_tasks.len() as f64,
            MetricCalculationType::Sum => {
                if let Some(ref source_tag) = self.source_tag {
                    filtered_tasks
                        .iter()
                        .filter_map(|task| Self::extract_numeric_value(task, source_tag))
                        .sum::<f64>()
                } else {
                    0.0
                }
            }
            MetricCalculationType::Average => {
                if let Some(ref source_tag) = self.source_tag {
                    let values: Vec<f64> = filtered_tasks
                        .iter()
                        .filter_map(|task| Self::extract_numeric_value(task, source_tag))
                        .collect();
                    if values.is_empty() {
                        0.0
                    } else {
                        values.iter().sum::<f64>() / values.len() as f64
                    }
                } else {
                    0.0
                }
            }
        }
    }

    /// フィルター式を評価
    fn evaluate_filter_expression(task: &Task, expression: &FilterExpression) -> bool {
        // 単一条件
        if let Some(ref condition) = expression.condition {
            return Self::evaluate_condition(task, condition);
        }

        // 複合式
        if let Some(ref expressions) = expression.expressions {
            let results: Vec<bool> = expressions
                .iter()
                .map(|expr| Self::evaluate_filter_expression(task, expr))
                .collect();

            if let Some(ref op) = expression.logical_operator {
                match op {
                    LogicalOperator::AND => results.iter().all(|&r| r),
                    LogicalOperator::OR => results.iter().any(|&r| r),
                    LogicalOperator::NOT => !results.first().copied().unwrap_or(false),
                }
            } else {
                // デフォルトはAND
                results.iter().all(|&r| r)
            }
        } else {
            true
        }
    }

    /// 条件を評価
    fn evaluate_condition(task: &Task, condition: &FilterCondition) -> bool {
        let task_value = task.front_matter.tags.get(&condition.tag_key);

        match condition.operator {
            ComparisonOperator::Equal => {
                Self::compare_values(task_value, &condition.value, |a, b| a == b)
            }
            ComparisonOperator::NotEqual => {
                Self::compare_values(task_value, &condition.value, |a, b| a != b)
            }
            ComparisonOperator::GreaterThan => {
                Self::compare_numeric(task_value, &condition.value, |a, b| a > b)
            }
            ComparisonOperator::LessThan => {
                Self::compare_numeric(task_value, &condition.value, |a, b| a < b)
            }
            ComparisonOperator::GreaterThanOrEqual => {
                Self::compare_numeric(task_value, &condition.value, |a, b| a >= b)
            }
            ComparisonOperator::LessThanOrEqual => {
                Self::compare_numeric(task_value, &condition.value, |a, b| a <= b)
            }
            ComparisonOperator::Contains => {
                Self::compare_string(task_value, &condition.value, |a, b| a.contains(b))
            }
            ComparisonOperator::StartsWith => {
                Self::compare_string(task_value, &condition.value, |a, b| a.starts_with(b))
            }
            ComparisonOperator::EndsWith => {
                Self::compare_string(task_value, &condition.value, |a, b| a.ends_with(b))
            }
            ComparisonOperator::Regex => {
                // 簡易実装: containsと同じ扱い
                Self::compare_string(task_value, &condition.value, |a, b| a.contains(b))
            }
        }
    }

    /// 値を比較（等価性）
    fn compare_values<F>(task_value: Option<&TagValue>, condition_value: &serde_json::Value, cmp: F) -> bool
    where
        F: Fn(&str, &str) -> bool,
    {
        let task_str = task_value.map(|v| v.to_string_value()).unwrap_or_default();
        let cond_str = match condition_value {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::Bool(b) => b.to_string(),
            _ => return false,
        };
        cmp(&task_str, &cond_str)
    }

    /// 数値を比較
    fn compare_numeric<F>(task_value: Option<&TagValue>, condition_value: &serde_json::Value, cmp: F) -> bool
    where
        F: Fn(f64, f64) -> bool,
    {
        let task_num = match task_value {
            Some(TagValue::Number(n)) => *n as f64,
            Some(TagValue::Float(f)) => *f,
            _ => return false,
        };
        let cond_num = match condition_value {
            serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
            _ => return false,
        };
        cmp(task_num, cond_num)
    }

    /// 文字列を比較
    fn compare_string<F>(task_value: Option<&TagValue>, condition_value: &serde_json::Value, cmp: F) -> bool
    where
        F: Fn(&str, &str) -> bool,
    {
        let task_str = match task_value {
            Some(TagValue::String(s)) => s.as_str(),
            _ => return false,
        };
        let cond_str = match condition_value {
            serde_json::Value::String(s) => s.as_str(),
            _ => return false,
        };
        cmp(task_str, cond_str)
    }

    /// タスクから数値を抽出
    fn extract_numeric_value(task: &Task, tag_key: &str) -> Option<f64> {
        task.front_matter.tags.get(tag_key).and_then(|v| match v {
            TagValue::Number(n) => Some(*n as f64),
            TagValue::Float(f) => Some(*f),
            _ => None,
        })
    }
}





