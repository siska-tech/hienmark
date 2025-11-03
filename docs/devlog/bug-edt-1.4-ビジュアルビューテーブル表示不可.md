---
status: in_progress
priority: high
assignee: FE
start_date: 2025-01-30
tags: ["バグ修正", "エディタ", "ビジュアルビュー", "テーブル", "CSS"]
depends_on: []
---

# BUG-EDT-1.4: ビジュアルビューでMarkdownテーブルが表示されない

## 概要

ビジュアルビュー（プレビューパネル）でMarkdownで記述したテーブルが表示されない問題が発生しています。

## バグ詳細

### 症状

- ビジュアルビューでMarkdownテーブル記法（例: `| 列1 | 列2 |`）を記述しても、テーブルが表示されない
- テーブルのHTMLタグ（`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`）はレンダリングされているが、スタイルが適用されていない
- セル間の境界線が見えない
- テーブルの背景色やレイアウトが適用されていない

### 原因

1. **テーブル用CSSの欠如**
   - `TaskEditor.css`にMarkdownテーブル表示用のCSSスタイルが定義されていない
   - `preview-content`内の`table`, `th`, `td`要素に対するスタイルが存在しない
   - デフォルトブラウザスタイルのみが適用されているため、可読性が低い

2. **Markdown-itのレンダリング**
   - Markdown-itは正しくテーブルをHTMLに変換している
   - DOMPurifyもテーブル用タグを許可している（TaskEditor.tsx:428行目）
   - 問題はCSS側にある

### 影響範囲

- ビジュアルビューのプレビューパネル
- Markdownテーブルを含むすべてのドキュメント
- 既存のREADME.mdやドキュメント内のテーブル

## 修正内容

### 修正ファイル

- `src/components/TaskEditor/TaskEditor.css`

### 修正内容

1. **テーブルスタイルの追加**
   - `.preview-content table` に対する基本スタイルを追加
   - 境界線、パディング、幅、背景色を設定
   - レスポンシブ対応（横スクロール）を実装

2. **テーブルヘッダースタイルの追加**
   - `.preview-content th` に対するスタイルを追加
   - 背景色、太字、境界線を設定

3. **テーブルセルスタイルの追加**
   - `.preview-content td` に対するスタイルを追加
   - パディング、境界線、縦方向の配置を設定

4. **テーブル行の交互色の追加**
   - `.preview-content tbody tr:nth-child(odd)` に対するスタイルを追加
   - 可読性向上のため、奇数の行に背景色を設定

### 修正後の動作

- Markdownテーブルが正しく表示される
- 境界線、背景色、パディングが適用される
- レスポンシブ対応により、横スクロールが可能になる
- テーブルの可読性が大幅に向上する

## テスト項目

- [x] 基本的なMarkdownテーブルの表示
- [x] ヘッダー行（`| 列1 | 列2 |`）の表示
- [x] データ行の表示
- [x] 境界線の表示
- [x] 背景色と交互色の適用
- [x] 横スクロールの動作
- [x] 複数テーブルの表示
- [x] テーブル内のリンクやコードの表示

## 関連ファイル

- `src/components/TaskEditor/TaskEditor.css` (294行目以降に追加)
  - `.preview-content table`, `th`, `td` のスタイル定義
- `src/components/TaskEditor/TaskEditor.tsx` (420-432行目): DOMPurifyの設定（テーブル用タグは許可済み）

## メモ

- Markdown-itとDOMPurifyは正しく設定されている
- 問題はCSS側のスタイル定義の欠如
- 他のコンポーネント（TemplateEditor.css）には`.tags-table`用のスタイルが存在するため、それを参考に実装
- ダークテーマとライトテーマの両方に対応する必要がある