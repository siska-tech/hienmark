/**
 * フィルター式評価器
 * CustomFilterの式を評価してタスクをフィルタリングする
 */

import type { Task, FilterExpression, FilterCondition, ComparisonOperator, TagConfig } from '../../types/task';

/**
 * フィルター式を評価してタスクをフィルタリング
 */
export function evaluateFilterExpression(
  tasks: Task[],
  expression: FilterExpression,
  tagConfigs: Record<string, TagConfig>
): Task[] {
  // 式が未定義の場合は全タスクを返す
  if (!expression) {
    console.warn('Filter expression is undefined');
    return tasks;
  }

  try {
    return tasks.filter((task) => evaluateExpression(task, expression, tagConfigs));
  } catch (error) {
    console.error('Error evaluating filter expression:', error);
    return tasks; // エラー時は全タスクを返す
  }
}

/**
 * 式を評価
 */
function evaluateExpression(
  task: Task,
  expression: FilterExpression,
  tagConfigs: Record<string, TagConfig>
): boolean {
  // 式が未定義の場合はtrueを返す（フィルタリングしない）
  if (!expression) {
    return true;
  }

  // シンプルな条件
  if (expression.condition) {
    return evaluateCondition(task, expression.condition);
  }

  // 複合式
  if (expression.expressions && expression.expressions.length > 0) {
    const results = expression.expressions.map((expr) => evaluateExpression(task, expr, tagConfigs));

    if (!expression.logicalOperator) {
      return results[0]; // デフォルトはAND
    }

    switch (expression.logicalOperator) {
      case 'AND':
        return results.every((r) => r);
      case 'OR':
        return results.some((r) => r);
      case 'NOT':
        return !results[0];
      default:
        return false;
    }
  }

  return true;
}

/**
 * 条件を評価
 */
function evaluateCondition(task: Task, condition: FilterCondition): boolean {
  const value = task.frontMatter[condition.tagKey];
  const conditionValue = condition.value;

  if (value === undefined) {
    return false;
  }

  return compareValues(value, condition.operator, conditionValue);
}

/**
 * 値を比較
 */
function compareValues(
  value: any,
  operator: ComparisonOperator,
  conditionValue: string | number | boolean | Date
): boolean {
  const valueStr = String(value).toLowerCase();
  const conditionStr = String(conditionValue).toLowerCase();

  switch (operator) {
    case '==':
      return valueStr === conditionStr;

    case '!=':
      return valueStr !== conditionStr;

    case '>':
      return compareNumeric(value, conditionValue, (a, b) => a > b);

    case '<':
      return compareNumeric(value, conditionValue, (a, b) => a < b);

    case '>=':
      return compareNumeric(value, conditionValue, (a, b) => a >= b);

    case '<=':
      return compareNumeric(value, conditionValue, (a, b) => a <= b);

    case 'contains':
      return valueStr.includes(conditionStr);

    case 'starts_with':
      return valueStr.startsWith(conditionStr);

    case 'ends_with':
      return valueStr.endsWith(conditionStr);

    case 'regex': {
      try {
        const regex = new RegExp(String(conditionValue), 'i');
        return regex.test(String(value));
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}

/**
 * 数値比較
 */
function compareNumeric(
  value: any,
  conditionValue: string | number | boolean | Date,
  compareFn: (a: number, b: number) => boolean
): boolean {
  const numA = parseFloat(String(value));
  const numB = parseFloat(String(conditionValue));

  if (isNaN(numA) || isNaN(numB)) {
    return false;
  }

  return compareFn(numA, numB);
}


