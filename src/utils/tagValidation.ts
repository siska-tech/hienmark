/**
 * タグ値のバリデーション機能
 * 許容値設定に基づいてタグ値を検証する
 */

import type { TagValue, AllowedValueType } from '../types/task';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * タグ値を許容値設定に基づいて検証
 */
export function validateTagValue(
  value: TagValue,
  allowedValueType?: AllowedValueType
): ValidationResult {
  if (!allowedValueType) {
    return { isValid: true };
  }

  switch (allowedValueType.type) {
    case 'DirectInput':
      return { isValid: true };

    case 'List':
      if (Array.isArray(value)) {
        // 配列の場合、すべての要素がリストに含まれているかチェック
        const invalidValues = value.filter(v => !allowedValueType.values.includes(v));
        if (invalidValues.length > 0) {
          return {
            isValid: false,
            error: `許可されていない値: ${invalidValues.join(', ')}`
          };
        }
      } else {
        // 単一値の場合、リストに含まれているかチェック
        if (!allowedValueType.values.includes(String(value))) {
          return {
            isValid: false,
            error: `許可されていない値: ${value}。許可される値: ${allowedValueType.values.join(', ')}`
          };
        }
      }
      return { isValid: true };

    case 'Pattern':
      const regex = new RegExp(allowedValueType.pattern);
      if (Array.isArray(value)) {
        // 配列の場合、すべての要素がパターンに一致するかチェック
        const invalidValues = value.filter(v => !regex.test(String(v)));
        if (invalidValues.length > 0) {
          return {
            isValid: false,
            error: `パターンに一致しない値: ${invalidValues.join(', ')}`
          };
        }
      } else {
        // 単一値の場合、パターンに一致するかチェック
        if (!regex.test(String(value))) {
          return {
            isValid: false,
            error: `パターンに一致しません: ${value}`
          };
        }
      }
      return { isValid: true };

    case 'Range':
      if (typeof value === 'number') {
        if (value < allowedValueType.min || value > allowedValueType.max) {
          return {
            isValid: false,
            error: `範囲外の値: ${value}。許可される範囲: ${allowedValueType.min} - ${allowedValueType.max}`
          };
        }
      } else if (Array.isArray(value)) {
        // 配列の場合、すべての数値要素が範囲内かチェック
        const invalidValues = value.filter(v => {
          const num = parseFloat(String(v));
          return isNaN(num) || num < allowedValueType.min || num > allowedValueType.max;
        });
        if (invalidValues.length > 0) {
          return {
            isValid: false,
            error: `範囲外の値: ${invalidValues.join(', ')}。許可される範囲: ${allowedValueType.min} - ${allowedValueType.max}`
          };
        }
      } else {
        // 文字列を数値に変換してチェック
        const num = parseFloat(String(value));
        if (isNaN(num)) {
          return {
            isValid: false,
            error: `数値に変換できません: ${value}`
          };
        }
        if (num < allowedValueType.min || num > allowedValueType.max) {
          return {
            isValid: false,
            error: `範囲外の値: ${num}。許可される範囲: ${allowedValueType.min} - ${allowedValueType.max}`
          };
        }
      }
      return { isValid: true };

    default:
      return { isValid: true };
  }
}

/**
 * 複数のタグ値を一括検証
 */
export function validateTagValues(
  tags: Record<string, TagValue>,
  tagConfigs: Record<string, { allowedValueType?: AllowedValueType }>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const [tagKey, value] of Object.entries(tags)) {
    const config = tagConfigs[tagKey];
    results[tagKey] = validateTagValue(value, config?.allowedValueType);
  }

  return results;
}

/**
 * バリデーション結果にエラーがあるかチェック
 */
export function hasValidationErrors(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).some(result => !result.isValid);
}

/**
 * エラーメッセージを取得
 */
export function getValidationErrors(results: Record<string, ValidationResult>): string[] {
  return Object.entries(results)
    .filter(([_, result]) => !result.isValid)
    .map(([tagKey, result]) => `${tagKey}: ${result.error}`);
}
