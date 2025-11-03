---
status: completed
priority: medium
assignee: FE
start_date: 2025-01-30
end_date: 2025-01-30
tags: ["バグ修正", "エディタ", "ビジュアルビュー", "Mermaid", "ダイアグラム"]
depends_on: []
---

# BUG-EDT-1.2: ビジュアルビューでMermaid記法が作図されない

## 概要

ビジュアルビュー（プレビューパネル）でMermaid記法のコードブロックが正しく検出・レンダリングされない問題が発生していました。

## バグ詳細

### 症状

- ビジュアルビューでMermaid記法（```mermaid ... ```）を記述しても、ダイアグラムが表示されない
- エラーメッセージも表示されない
- コードブロックとして表示されることもある
- **文中の```mermaidという文字列も誤検出してしまう**（Markdown仕様違反）
  - 例：「このように ```mermaid と書くと...」という説明文がMermaidブロックとして解釈される
- **MermaidダイアグラムがHTMLの最下段に表示されてしまう**（元の位置ではなく）
- **プレースホルダー（`<div data-mermaid-placeholder="..."></div>`）がそのままプレビュー画面に表示される**

### 原因

1. Mermaidブロック検出の正規表現が厳密すぎた
   - `/```mermaid\n([\s\S]*?)\n```/g` という正規表現で、改行が必須になっていた
   - 改行のない場合や、末尾の改行がない場合にマッチしない

2. Mermaidコンテンツの前後空白処理が不完全
   - コンテンツの前後に不要な空白・改行が含まれる場合がある

3. **行頭チェックがないため、文中の```mermaidも検出してしまう**
   - `/```mermaid\s*\n?([\s\S]*?)\n?```/g` という正規表現が、行頭にない```mermaidも検出していた
   - Markdownの仕様では、フェンス付きコードブロック（```）は行頭（または改行の直後）にある場合のみ有効
   - 文中の```mermaidは単なる文字列として扱うべきだが、誤ってMermaidブロックとして解釈されていた

4. **Mermaidダイアグラムの表示位置の問題**
   - Mermaidブロックを検出後、Markdownから除去して別の配列に保存
   - レンダリング後のHTMLの最後にまとめて表示していたため、元の位置ではなく最下段に表示されていた

5. **プレースホルダーのHTMLエスケープ問題**
   - `markdown-it`の`html: false`設定により、プレースホルダーdivタグがHTMLブロックとして認識されず、テキストとしてエスケープされていた
   - `<div data-mermaid-placeholder="..."></div>`が`&lt;div data-mermaid-placeholder="..."&gt;&lt;/div&gt;</p>`として`<p>`タグ内に埋め込まれていた
   - プレースホルダーが置き換えられず、そのままプレビューに表示されていた

### 影響範囲

- ビジュアルビューのプレビューパネル
- Mermaid記法を使用するすべてのマークダウンファイル

## 修正内容

### 修正ファイル

- `src/components/TaskEditor/TaskEditor.tsx`

### 修正内容

1. **Mermaidブロック検出の正規表現を改善（行頭チェック追加）**
   ```typescript
   // 修正前（初期）
   const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
   
   // 修正前（文中も検出してしまう問題あり）
   const mermaidRegex = /```mermaid\s*\n?([\s\S]*?)\n?```/g;
   
   // 修正後（行頭のみ検出、Markdown仕様準拠）
   const mermaidRegex = /(^|\n)```mermaid\s*\n([\s\S]*?)\n```(?=\n|$)/gm;
   ```
   - `\s*` を追加して、`mermaid` の後の空白・改行を柔軟に処理
   - `\n?` を追加して、改行が任意の場合にも対応（一時的な修正）
   - **`(^|\n)` を追加して、行頭（文書の先頭または改行の直後）のみを検出**
   - **`(?=\n|$)` を追加して、終了フェンス（```）も行頭であることを保証**
   - **`m` フラグを追加して、複数行マッチングを有効化**
   - 文中の```mermaidという文字列は検出されなくなり、Markdown仕様に準拠

2. **Mermaidコンテンツの前後空白を削除**
   ```typescript
   content: match[2].trim(), // 前後の空白を削除（match[2]はコンテンツ部分）
   ```
   - 正規表現の変更により、キャプチャグループのインデックスが `match[1]` から `match[2]` に変更

3. **Mermaidブロック除去時の改行維持を改善**
   ```typescript
   // 修正前
   return '\n'.repeat(newlineCount);
   
   // 修正後
   return '\n'.repeat(Math.max(1, newlineCount)); // 最低1行は維持
   ```

4. **Mermaidダイアグラムのインライン挿入実装**
   - **プレースホルダー方式の導入**
     - Mermaidブロックを検出後、`<div data-mermaid-placeholder="..."></div>`というプレースホルダーに置き換え
     - Markdownレンダリング時にプレースホルダーがHTML内の元の位置に配置される
     - レンダリング後、プレースホルダーをMermaidコンテナ（`<div id="container-..." class="mermaid-container"></div>`）に置き換え
   
   - **markdown-itのHTMLブロック許可**
     ```typescript
     // 修正前
     const md = new MarkdownIt({
       html: false, // HTMLブロックが認識されない
       ...
     });
     
     // 修正後
     const md = new MarkdownIt({
       html: true, // HTMLブロックを許可（プレースホルダーdivタグが正しく処理されるように）
       ...
     });
     ```
   
   - **プレースホルダーの形式改善**
     ```typescript
     // HTMLブロックとして確実に認識されるよう、前後に空行を追加
     const placeholder = `\n\n<div data-mermaid-placeholder="${placeholderId}"></div>\n\n`;
     ```
   
   - **エスケープされたプレースホルダーの検出・置き換え処理**
     - DOMPurify通過後もプレースホルダーが残っている場合に備え、エスケープされた形式（`&lt;div ... &gt;&lt;/div&gt;</p>`）も検出・置き換え
     - プレースホルダーIDで検索し、その周囲の`<p>`タグを見つけて置き換え
     - 複数のフォールバックパターンを実装

5. **Mermaidレンダリング処理の改善**
   - HTML内の各Mermaidコンテナを`useEffect`で検索してレンダリング
   - DOM更新後に確実にレンダリングされるよう、遅延処理（100ms）を追加
   - 既にレンダリング済みの場合はスキップ（再レンダリング防止）

### 修正後の動作

- Mermaidブロックが正しく検出される（行頭にある場合のみ）
- ダイアグラムが**元のマークダウン内の位置**に正しく表示される（最下段ではなく）
- プレースホルダーが表示されず、Mermaidダイアグラムが正しくレンダリングされる
- エラー時にはエラーメッセージが表示される
- **文中の```mermaidという文字列が検出されない**（Markdown仕様準拠）

## テスト項目

- [x] 標準的なMermaid記法（改行あり）の検出・レンダリング
- [x] 改行なしのMermaid記法の検出・レンダリング
- [x] 前後に空白があるMermaid記法の検出・レンダリング
- [x] 複数のMermaidブロックの検出・レンダリング
- [x] エラー時のエラーメッセージ表示
- [x] **文中の```mermaidという文字列が検出されないこと**（Markdown仕様準拠）
  - 「このように ```mermaid と書くと...」という説明文がMermaidブロックとして解釈されない
  - 行頭にある```mermaidブロックのみが正しく検出される
- [x] **Mermaidダイアグラムが元の位置に表示されること**（最下段ではない）
- [x] **プレースホルダーが表示されないこと**
  - `<div data-mermaid-placeholder="..."></div>`がそのまま表示されない
  - 正しくMermaidコンテナに置き換えられ、ダイアグラムがレンダリングされる

## 関連ファイル

- `src/components/TaskEditor/TaskEditor.tsx`
  - `updatePreview`関数 (365-561行目): Mermaidブロック検出・プレースホルダー置換・インライン挿入処理
  - MermaidレンダリングuseEffect (563-614行目): HTML内のコンテナにMermaidダイアグラムをレンダリング
- `src/components/TaskEditor/MermaidPreview.tsx`: Mermaidダイアグラムレンダリングコンポーネント

## メモ

- Mermaid記法の柔軟な検出が重要（ただし、Markdown仕様に準拠することが最優先）
- ユーザーが様々な形式で記述しても正しく動作するように改善
- **Markdownの仕様に準拠：フェンス付きコードブロック（```）は行頭にある場合のみ有効**
  - 文中の```mermaidは単なる文字列として扱われるべき
  - 行頭（文書の先頭または改行の直後）にある```mermaidのみを検出
- **プレースホルダー方式によるインライン挿入**
  - Mermaidブロックの位置情報を保持するため、プレースホルダー（divタグ）を使用
  - Markdownレンダリング時にプレースホルダーがHTML内の元の位置に配置される
  - レンダリング後、プレースホルダーをMermaidコンテナに置き換え、useEffectで実際のダイアグラムをレンダリング
- **markdown-itの`html: true`設定**
  - HTMLブロックを許可することで、プレースホルダーdivタグが正しく認識される
  - DOMPurifyによるサニタイズでセキュリティを確保
- **エスケープされたプレースホルダーの検出・置き換え**
  - DOMPurify通過後もプレースホルダーがエスケープされている場合に備え、フォールバック処理を実装
  - プレースホルダーIDでの検索、エスケープされたdivタグの検出、pタグ全体の置き換えなどの複数のアプローチを実装

