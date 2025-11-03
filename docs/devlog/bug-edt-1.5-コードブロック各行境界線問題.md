---
status: completed
priority: high
end_date: 2025-01-30
assignee: FE
start_date: 2025-01-30
tags: ["バグ修正", "エディタ", "ビジュアルビュー", "コードブロック", "CSS"]
depends_on: []
---

# BUG-EDT-1.5: コードブロック内の各行に境界線が引かれて見栄えが悪い

## 概要

ビジュアルビューでコードブロック（`<code>` ブロック）を表示すると、各行の上下に境界線が引かれて見栄えが悪い問題が発生しています。

## バグ詳細

### 症状

- コードブロック（`<pre><code>`）内の複数行にわたるコードを表示すると、各行の上下に境界線が引かれている
- SQLコードブロックなどで特に目立つ
- コードブロック全体には問題ないが、内部の各コード行に不要な境界線が表示される

### 原因

1. **CSSスタイルの継承問題**
   - `.preview-content code` のスタイルに `border: 1px solid var(--code-inline-border)` が設定されている（TaskEditor.css:276行目）
   - `.preview-content pre code` のスタイルでは `border` をリセットしていない（TaskEditor.css:292-295行目）
   - コードブロック内の各コード行がインラインコード用の境界線スタイルを継承してしまう

2. **スタイルの優先順位**
   - `.preview-content pre code` が設定されているが、`border` プロパティがないため、親要素の `.preview-content code` のスタイルが適用される

### 影響範囲

- ビジュアルビューのプレビューパネル
- コードブロックを含むすべてのドキュメント
- SQL、JavaScript、TypeScriptなどの複数行コードブロック

## 修正内容

### 修正ファイル

- `src/components/TaskEditor/TaskEditor.css`

### 修正内容

1. **`.preview-content pre code` に `border: none` を追加**
   - コードブロック内のコード要素から境界線を削除
   - インラインコードとブロックコードを明確に区別

### 修正後の動作

- コードブロック内の各行に境界線が引かれなくなる
- コードブロック全体の境界線のみが表示される
- インラインコードの境界線は引き続き正常に表示される

## テスト項目

- [x] コードブロック内の各行に境界線が引かれないこと
- [x] インラインコードの境界線が引き続き表示されること
- [x] SQL、JavaScript、TypeScript、Pythonなどの複数行コードブロックで正常に表示されること
- [x] コードブロック全体の背景色とパディングが正常に表示されること

## 関連ファイル

- `src/components/TaskEditor/TaskEditor.css` (292-295行目): `.preview-content pre code` のスタイル定義

## メモ

- インラインコード（`<code>`）とブロックコード（`<pre><code>`）は別々の用途で使用されるため、スタイルを分離する必要がある
- `.preview-content code` はインラインコード用
- `.preview-content pre code` はブロックコード用で、インラインコードのスタイルをリセットする必要がある

