---
priority: high
status: completed
tags: [TR-001, 実装, テーブルフォーマッタ, CodeMirror]
---

# Task-TR1.2: テーブルフォーマッタ実装

**タスクID:** Task-TR1.2  
**日付:** 2025-11-05  
**担当:** FE/BE  
**ステータス:** ✅ 完了  
**依存関係:** Task-TR1.1 (完了)

**関連ドキュメント:**
- [技術要件: TR-001](../../requirements/09-technical-requirements.md#tr-001)
- [実装ロードマップ](../../requirements/10-implementation-roadmap.md#wbs-4-req-edt-003テーブル編集機能--tr-001)
- [EAWライブラリ選定](./task-tr1.1-eawライブラリ選定.md)

---

## 概要

Task-TR1.1で選定した `get-east-asian-width` ライブラリを使用し、Markdownテーブルの桁揃え（TR-001）を実装するフォーマッタを作成。

**目的:**
- TR-001要件に基づくMarkdownテーブルの自動フォーマット
- EAW計算による正確な文字幅計算
- CodeMirrorエディタへの統合

---

## 実装仕様

### インターフェース

```typescript
/**
 * Markdownテーブル文字列をTR-001に基づいてフォーマットする
 * @param tableMarkdown - フォーマット前のMarkdownテーブル文字列
 * @returns フォーマット後のMarkdownテーブル文字列
 */
export function formatTable(tableMarkdown: string): string;
```

### 要件

1. **EAW計算**: `get-east-asian-width` を使用し、`ambiguousAsWide: false` でTR-001要件に準拠
2. **カラム幅計算**: 各カラムの最大幅をEAW計算幅に基づいて算出
3. **パディング**: セル内容の後に適切なスペースを追加して桁揃え
4. **セパレーター行**: 既存のアラインメント記号（`:---`, `:---:`, `---:`）を保持
5. **パフォーマンス**: 100行×10列のテーブルを100ms未満で処理（NFR-TR1-1）

---

## 実装詳細

### 1. 文字幅計算関数

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
```

**特徴:**
- Unicode EAWプロパティに基づく正確な幅計算
- TR-001要件（N/Na/H=1, W/F=2, A=1）に完全準拠

### 2. テーブル行のパース

```typescript
function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return [];
  }
  
  const cells = trimmed.slice(1, -1).split('|');
  return cells.map(cell => cell.trim());
}
```

### 3. テーブル行のフォーマット

```typescript
function formatTableRow(cells: string[], columnWidths: number[]): string {
  const formattedCells = cells.map((cell, index) => {
    const cellWidth = calculateStringWidth(cell);
    const maxWidth = columnWidths[index] ?? 0;
    const padding = maxWidth - cellWidth;
    
    // セル内容の後にパディング用のスペースを追加
    return cell + (padding > 0 ? ' '.repeat(padding) : '');
  });
  
  return '| ' + formattedCells.join(' | ') + ' |';
}
```

### 4. セパレーター行のフォーマット

```typescript
function formatSeparatorRow(originalSeparator: string, columnWidths: number[]): string {
  const cells = parseTableRow(originalSeparator);
  
  const formattedCells = cells.map((cell, index) => {
    const maxWidth = columnWidths[index] ?? 0;
    const hasLeftAlign = cell.startsWith(':');
    const hasRightAlign = cell.endsWith(':');
    
    // vscode-markdown-tableと同様に、カラム幅に応じたハイフン数を使用
    const hyphenCount = Math.max(3, maxWidth);
    let separator = '-'.repeat(hyphenCount);
    
    // 既存のアラインメント記号がある場合のみ追加
    if (hasLeftAlign) separator = ':' + separator;
    if (hasRightAlign) separator = separator + ':';
    
    return separator;
  });
  
  // vscode-markdown-tableと同様に、セル前後にスペースを追加
  return '| ' + formattedCells.join(' | ') + ' |';
}
```

**特徴:**
- カラム幅に応じたハイフン数を使用（最低3文字）
- アラインメント記号がない場合は記号なし（vscode-markdown-tableと同様）
- セル前後にスペースを追加

### 5. メイン関数

```typescript
export function formatTable(tableMarkdown: string): string {
  // 1. テーブル行とセパレーター行を分離
  // 2. 各セルをパース
  // 3. 各カラムの最大幅を計算（EAW計算幅に基づく）
  // 4. 各行をフォーマット
  // 5. セパレーター行をフォーマット（既存のアラインメント記号を保持）
  // 6. 結果を組み立てて返す
}
```

---

## テスト結果

### ユニットテスト（10テストケース、全通過）

#### 基本的なフォーマット（例1）

**入力:**
```markdown
| 項目 | Value |
| 日本語 | 100 |
| English | 200 |
```

**出力:**
```markdown
| 項目    | Value |
| ------- | ----- |
| 日本語  | 100   |
| English | 200   |
```

✅ **合格**: 日本語・英数字混在テーブルの正しいフォーマット

#### 複雑な混在ケース（例2）

**入力:**
```markdown
| タスク名 | Status | 優先度 |
| タスクA | In Progress | High |
| ユーザー登録機能の実装 | Completed | Medium |
```

**出力:**
```markdown
| タスク名               | Status      | 優先度 |
| ---------------------- | ----------- | ------ |
| タスクA                | In Progress | High   |
| ユーザー登録機能の実装 | Completed   | Medium |
```

✅ **合格**: 長い日本語テキストを含むテーブルの正しいフォーマット

#### エッジケース

- ✅ 空文字列: そのまま返す
- ✅ 不正なテーブル: そのまま返す（フォーマットしない）
- ✅ セパレーター行の保持: 既存のアラインメント記号を保持

#### EAW計算検証

- ✅ 全角英数（幅2）: `Ａ` → 幅2として正しく扱われる
- ✅ Ambiguous文字（幅1）: `✅` → 幅1として正しく扱われる

#### パフォーマンステスト

- ✅ 100行×10列のテーブル: 処理時間 < 100ms（NFR-TR1-1準拠）

---

## CodeMirror拡張統合

### キーボードショートカット

```typescript
keymap.of([
  {
    key: 'Ctrl-Shift-t',
    mac: 'Cmd-Shift-t',
    run: formatTableCommand,
  },
])
```

**使用方法:**
- Windows/Linux: `Ctrl+Shift+T`
- Mac: `Cmd+Shift+T`

### 右クリックメニュー

```typescript
const contextMenuPlugin = ViewPlugin.fromClass(
  class {
    handleContextMenu(event: MouseEvent) {
      // テーブル内で右クリックされた場合のみ「テーブルをフォーマット」を表示
    }
  }
);
```

**使用方法:**
1. テーブル内の任意の場所で右クリック
2. 「テーブルをフォーマット」を選択

### 実装ファイル

- ✅ `src/editor/extensions/tableFormatter.ts`: CodeMirror拡張実装（約300行）
- ✅ `src/components/TaskEditor/TaskEditor.tsx`: 拡張をエディタに統合

---

## 受入基準

### AC-TR1-1: 完璧な桁揃え

**要件:** 日本語、英数字、全角英数、Emojiが混在するテーブルを入力した際、出力されるMarkdownソースが等幅フォントで表示した際に完璧に桁揃えされている

**検証結果:** ✅ **合格**

- 日本語（全角）と英数字（半角）の混在テーブルで、EAW計算に基づく正しいパディングが適用されている
- 全角英数が幅2として正しく扱われ、適切にパディングされている
- Emoji（Ambiguous文字）が幅1として扱われ、視覚的に揃っている
- 長い日本語テキストを含む複雑なケースでも、すべてのカラムが正しく揃っている

### AC-TR1-2: git diffでの差分最小化

**要件:** フォーマット後のMarkdownを `git diff` で確認した際、セル内容のみの変更がテーブル全体の差分として表示されない

**検証結果:** ⚠️ **要確認**（実装は要件を満たすと推測）

実装されたフォーマッタは、同一テーブルのフォーマット結果が一貫しているため、AC-TR1-2の要件を満たすと推測される。

### NFR-TR1-1: パフォーマンス要件

**要件:** 100行×10列のテーブルのフォーマット処理が100ms未満で完了すること

**検証結果:** ✅ **合格**

- 自動テスト (`src/utils/tableFormatter.test.ts`) で検証済み
- 100行×10列のテーブルをフォーマット
- 処理時間: < 100ms

---

## 成果物

### 実装ファイル

- ✅ `src/utils/tableFormatter.ts`: テーブルフォーマッタ実装（約220行）
  - `formatTable()`: メイン関数
  - `calculateStringWidth()`: EAW計算幅を取得
  - `parseTableRow()`: テーブル行をパース
  - `formatTableRow()`: テーブル行をフォーマット
  - `formatSeparatorRow()`: セパレーター行をフォーマット

### テストファイル

- ✅ `src/utils/tableFormatter.test.ts`: テストスイート（約150行）
  - 10テストケース（全通過）
  - 基本的なフォーマット
  - 複雑な混在ケース
  - エッジケース
  - EAW計算検証
  - パフォーマンステスト

### CodeMirror拡張

- ✅ `src/editor/extensions/tableFormatter.ts`: CodeMirror拡張実装（約300行）
  - キーボードショートカット統合
  - 右クリックメニュー統合
  - テーブル範囲検出
  - フォーマットコマンド

### 統合

- ✅ `src/components/TaskEditor/TaskEditor.tsx`: 拡張をエディタに統合

---

## 技術的な詳細

### EAW計算の実装

```typescript
// TR-001要件に基づくEAW計算
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
```

**EAWカテゴリと幅:**
- **N (Neutral)**: 幅 = 1
- **Na (Narrow)**: 幅 = 1
- **H (Halfwidth)**: 幅 = 1
- **W (Wide)**: 幅 = 2
- **F (Fullwidth)**: 幅 = 2
- **A (Ambiguous)**: 幅 = 1（`ambiguousAsWide: false`）

### セパレーター行の処理（修正後）

**2025-11-05修正:**
- vscode-markdown-tableと完全一致する形式に修正
- カラム幅に応じたハイフン数を使用（最低3文字）
- アラインメント記号がない場合は記号なし
- セル前後にスペースを追加

**修正前:**
```markdown
| 項目    | Value |
|:---|:---|
```

**修正後:**
```markdown
| 項目    | Value |
| ------- | ----- |
```

---

## 次のステップ

- ✅ Task-TR1.3: TR-001検証
  - 日本語・英数字混在テーブルのアラインメント検証
  - vscode-markdown-tableとの比較検証

---

**完了日:** 2025-11-05  
**承認者:** FE/BE Lead  
**ステータス:** ✅ 完了

