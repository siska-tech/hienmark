---
priority: high
status: completed
tags: [TR-001, ライブラリ選定, EAW, East-Asian-Width]
---

# Task-TR1.1: EAWライブラリ選定・評価

**タスクID:** Task-TR1.1  
**日付:** 2025-11-05  
**担当:** TL  
**ステータス:** ✅ 完了  
**依存関係:** なし

**関連ドキュメント:**
- [技術要件: TR-001](../../requirements/09-technical-requirements.md#tr-001)
- [実装ロードマップ](../../requirements/10-implementation-roadmap.md#wbs-4-req-edt-003テーブル編集機能--tr-001)

---

## 概要

Markdownテーブルの桁揃え（TR-001）実装のため、East Asian Width (EAW) プロパティを扱うライブラリの選定・評価を実施。

**目的:**
- Unicode EAWプロパティに基づく文字幅計算をサポートするライブラリの選定
- TR-001要件（Table TR-001-1）との互換性確認
- ESM環境での動作確認

---

## 評価対象

### 候補ライブラリ

1. **`get-east-asian-width`** (v1.4.0)
   - GitHub: https://github.com/sindresorhus/get-east-asian-width
   - メンテナー: sindresorhus
   - 最新更新: 2025-09-09

2. **`eastasianwidth`** (v0.3.0)
   - npm: https://www.npmjs.com/package/eastasianwidth
   - メンテナー: komagata
   - 最新更新: 2024-04-21

---

## 評価項目

### 1. Unicodeの最新バージョンへの追従性

| ライブラリ | 最新更新 | 追従性 |
|-----------|---------|--------|
| `get-east-asian-width` | 2025-09-09 | ✅ 良好（約1ヶ月前） |
| `eastasianwidth` | 2024-04-21 | ⚠️ やや古い（約1年前） |

### 2. TR-001要件との互換性

**TR-001要件（Table TR-001-1）:**
- **N/Na/H**: 幅 = 1
- **W/F**: 幅 = 2
- **A (Ambiguous)**: 幅 = 1（`ambiguousAsWide: false` で対応）

#### `get-east-asian-width` の評価

**API:**
```typescript
import { eastAsianWidth } from 'get-east-asian-width';

eastAsianWidth(codePoint: number, options?: { ambiguousAsWide?: boolean }): 1 | 2
```

**テスト結果:**
- ✅ N (Neutral): 幅 = 1 ✅ 合格
- ✅ Na (Narrow): 幅 = 1 ✅ 合格
- ✅ H (Halfwidth): 幅 = 1 ✅ 合格
- ✅ W (Wide): 幅 = 2 ✅ 合格
- ✅ F (Fullwidth): 幅 = 2 ✅ 合格
- ✅ A (Ambiguous): 幅 = 1（`ambiguousAsWide: false`）✅ 合格

**評価:** ✅ **完全互換**

#### `eastasianwidth` の評価

**API:**
```typescript
// @ts-ignore - CommonJS module
import eaw from 'eastasianwidth';
const { characterLength } = eaw;

characterLength(char: string): 1 | 2
```

**テスト結果:**
- ✅ N (Neutral): 幅 = 1 ✅ 合格
- ✅ Na (Narrow): 幅 = 1 ✅ 合格
- ✅ H (Halfwidth): 幅 = 1 ✅ 合格
- ✅ W (Wide): 幅 = 2 ✅ 合格
- ✅ F (Fullwidth): 幅 = 2 ✅ 合格
- ❌ A (Ambiguous): 幅 = 2（デフォルト）→ カスタムロジックで対応可能だが...

**問題点:**
- ❌ ESM環境での互換性問題: CommonJSモジュールで`this`コンテキストエラー発生
- ⚠️ Ambiguous文字の扱い: デフォルトで幅2として扱うため、TR-001要件（幅1）に合わせるにはカスタムロジックが必要

**評価:** ❌ **互換性問題あり**

### 3. 文字列幅計算テスト

#### `get-east-asian-width` のテスト結果

| テストケース | 入力 | 期待値 | 実際値 | 結果 |
|-------------|------|--------|--------|------|
| 日本語文字列 | "項目" | 4 | 4 | ✅ 合格 |
| 英数字文字列 | "Value" | 5 | 5 | ✅ 合格 |
| 混在文字列 | "項目Value" | 9 | 9 | ✅ 合格 |
| 全角英数 | "Ａ" | 2 | 2 | ✅ 合格 |
| Emoji | "✅" | 1 | 1 | ✅ 合格 |

**評価:** ✅ **全テストケース通過**

#### `eastasianwidth` のテスト結果

**問題:**
- ESM環境での実行時に `TypeError: this.eastAsianWidth is not a function` エラーが発生
- `this`コンテキストが正しく設定されない

**評価:** ❌ **ESM環境で動作しない**

---

## 選定結果

### ✅ 選定: `get-east-asian-width`

**選定理由:**
1. ✅ **TR-001要件との完全互換性**: 全テストケース通過
2. ✅ **最新メンテナンス**: 2025-09更新（約1ヶ月前）
3. ✅ **ESM/TypeScript対応**: 完全対応
4. ✅ **明確なAPI設計**: `ambiguousAsWide` オプションでTR-001要件に準拠
5. ✅ **文字列幅計算**: 日本語・英数字混在テーブルに対応

### ❌ 不採用: `eastasianwidth`

**不採用理由:**
1. ❌ **ESM環境での互換性問題**: CommonJSモジュールでESM環境での使用に問題
2. ⚠️ **メンテナンス状況**: 最新更新が約1年前
3. ⚠️ **Ambiguous文字の扱い**: デフォルトで幅2（TR-001要件は幅1）

---

## 実装例

### `get-east-asian-width` の使用例

```typescript
import { eastAsianWidth } from 'get-east-asian-width';

function calculateStringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined) {
      // ambiguousAsWide: false で TR-001要件（A=1）に準拠
      width += eastAsianWidth(codePoint, { ambiguousAsWide: false });
    }
  }
  return width;
}

// 使用例
calculateStringWidth("項目");    // => 4
calculateStringWidth("Value");   // => 5
calculateStringWidth("✅");      // => 1 (Ambiguous文字)
```

---

## 成果物

- ✅ `scripts/evaluate-eaw-libraries.ts`: ライブラリ評価スクリプト
  - 両ライブラリのTR-001互換性テスト
  - 文字列幅計算テスト
  - 最終的な推奨結果を出力

**評価スクリプトの実行結果:**
```
========================================
EAWライブラリ評価結果
========================================

get-east-asian-width (v1.4.0):
  ✅ TR-001互換性: 完全互換（全テストケース通過）
  ✅ 文字列幅計算: 全テストケース通過
  ✅ ESM環境: 完全対応
  推奨: ✅ YES

eastasianwidth (v0.3.0):
  ⚠️ TR-001互換性: カスタムロジックで対応可能
  ❌ ESM環境: 互換性問題あり
  推奨: ❌ NO

========================================
最終推奨: get-east-asian-width
========================================
```

---

## 依存関係

**package.json への追加:**
```json
{
  "dependencies": {
    "get-east-asian-width": "^1.4.0"
  }
}
```

---

## 次のステップ

- ✅ Task-TR1.2: テーブルフォーマッタ実装
  - 選定ライブラリを使用したテーブルフォーマッタの実装
  - TR-001要件に基づく桁揃えロジックの実装

---

**完了日:** 2025-11-05  
**承認者:** TL  
**ステータス:** ✅ 完了

