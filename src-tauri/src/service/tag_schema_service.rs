use chrono::Local;
use regex::Regex;
use std::ops::Add;
use chrono::Duration;

/// タグスキーマサービス
/// タグスキーマの読み込み、保存、検証、動的デフォルト値の計算を担当
pub struct TagSchemaService;

impl TagSchemaService {
    pub fn new() -> Self {
        Self
    }

    /// 動的デフォルト値を計算
    /// 
    /// # Arguments
    /// * `formula` - 計算式（例: `=[TODAY]+30`）
    /// 
    /// # Returns
    /// * `Result<String, String>` - 計算結果のISO 8601形式の文字列
    /// 
    /// # Examples
    /// * `=[TODAY]+7` → 今日から7日後の日付
    /// * `=[TODAY]` → 今日の日付
    /// * `=[TODAY]+365` → 今日から365日後（1年後）
    pub fn calculate_dynamic_default_value(&self, formula: &str) -> Result<String, String> {
        // 式から `=` を除去
        let expression = formula.trim_start_matches('=').trim();
        
        // `[TODAY]` を現在の日時に置き換え
        let base_date = Local::now();
        
        // `+N` または `-N` の形式のオフセットをパース
        let result = if expression.contains("[TODAY]") {
            let offset_regex = Regex::new(r"\[TODAY\]\s*([\+\-])\s*(\d+)")
                .map_err(|e| format!("Failed to create regex: {}", e))?;
            
            if let Some(captures) = offset_regex.captures(expression) {
                let sign = &captures[1];
                let days: i64 = captures[2].parse()
                    .map_err(|e| format!("Failed to parse days offset: {}", e))?;
                
                let duration = if sign == "+" {
                    Duration::days(days)
                } else {
                    Duration::days(-days)
                };
                
                let result_date = base_date.add(duration);
                result_date.to_rfc3339()
            } else if expression.trim() == "[TODAY]" {
                // 今日の日付のみ
                base_date.to_rfc3339()
            } else {
                return Err("Invalid formula format. Supported format: `=[TODAY]+N` or `=[TODAY]-N`".to_string());
            }
        } else {
            return Err("Formula must contain [TODAY]".to_string());
        };
        
        Ok(result)
    }
}

impl Default for TagSchemaService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_today_plus_7() {
        let service = TagSchemaService::new();
        let result = service.calculate_dynamic_default_value("=[TODAY]+7");
        assert!(result.is_ok());
        
        let result_str = result.unwrap();
        // ISO 8601形式の文字列であることを確認
        assert!(result_str.contains("T"));
        assert!(result_str.contains("+") || result_str.contains("-"));
    }

    #[test]
    fn test_calculate_today() {
        let service = TagSchemaService::new();
        let result = service.calculate_dynamic_default_value("=[TODAY]");
        assert!(result.is_ok());
        
        let result_str = result.unwrap();
        // ISO 8601形式の文字列であることを確認
        assert!(result_str.contains("T"));
        assert!(result_str.contains("+") || result_str.contains("-"));
    }

    #[test]
    fn test_invalid_formula() {
        let service = TagSchemaService::new();
        let result = service.calculate_dynamic_default_value("invalid");
        assert!(result.is_err());
    }
}
