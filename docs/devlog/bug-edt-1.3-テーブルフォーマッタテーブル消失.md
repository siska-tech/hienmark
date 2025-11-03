---
status: completed
priority: high
assignee: FE
start_date: 2025-01-30
end_date: 2025-01-30
tags: ["バグ修正", "エディタ", "テーブルフォーマッタ", "TR-001", "コンテキストメニュー"]
depends_on: []
---

# BUG-EDT-1.3: 右クリックでテーブルをフォーマットするとテーブルがエディタから消えてしまう

## 概要

テーブル内で右クリックして「テーブルをフォーマット (Format Table)」を実行すると、テーブル全体がエディタから消えてしまう重大なバグが発生していました。

## バグ詳細

### 症状

- テーブル内で右クリック
- コンテキストメニューから「テーブルをフォーマット」を選択
- テーブルが完全に消えてしまう
- エラーメッセージは表示されない

### 原因

1. **セパレーター行のインデックス計算ミス**
   - `separatorIndex` の計算で、元のコードでは `break` でループを抜けていたため、正しいインデックスが設定されていなかった
   - テーブル行の中でのインデックスではなく、元の行番号を使用していた

2. **結果組み立て時のロジックエラー**
   - セパレーター行の挿入位置が正しく計算されていなかった
   - `separatorIndex > 0` の条件チェックが不適切だった

3. **カーソル位置の更新ロジック**
   - 変更後のカーソル位置が正しく計算されていなかった
   - テーブル範囲外にカーソルが移動してしまう場合があった

### 影響範囲

- テーブルフォーマッタ機能（右クリックメニュー）
- キーボードショートカット（Ctrl+Shift+T / Cmd+Shift+T）
- すべてのMarkdownテーブル

## 修正内容

### 修正ファイル

- `src/editor/extensions/tableFormatter.ts`
- `src/utils/tableFormatter.ts`

### 修正内容

#### 1. `src/utils/tableFormatter.ts` の修正

**セパレーター行のインデックス計算を修正**
```typescript
// 修正前
if (/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(line)) {
  separatorRow = line;
  separatorIndex = i;  // 元の行番号
  break;  // ループを抜ける（問題の原因）
}

// 修正後
if (/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(line)) {
  separatorRow = line;
  separatorIndex = tableRows.length; // テーブル行の中でのインデックス
  // breakを削除してループを継続
}
```

**結果組み立てのロジックを修正**
```typescript
// 修正前
if (separatorIndex > 0) {
  result.push(...formattedRows.slice(0, separatorIndex));
  result.push(formattedSeparator);
  result.push(...formattedRows.slice(separatorIndex));
}

// 修正後
if (separatorIndex >= 0 && separatorIndex < formattedRows.length) {
  result.push(...formattedRows.slice(0, separatorIndex));
  result.push(formattedSeparator);
  result.push(...formattedRows.slice(separatorIndex));
}
```

#### 2. `src/editor/extensions/tableFormatter.ts` の修正

**空文字列チェックの追加**
```typescript
// フォーマット結果が空文字列の場合は何もしない（エラー防止）
if (!formattedText || formattedText.trim() === '') {
  console.warn('[TableFormatter] Formatted text is empty, skipping update');
  return false;
}
```

**カーソル位置の更新ロジックを改善**
```typescript
// 変更を適用
const lengthDiff = formattedText.length - originalText.length;
const newSelectionEnd = tableRange.from + formattedText.length;

view.dispatch({
  changes: {
    from: tableRange.from,
    to: tableRange.to,
    insert: formattedText,
  },
  // カーソル位置を変更後のテーブルの終了位置に設定（テーブルが消えないように）
  selection: {
    anchor: Math.min(newSelectionEnd, selection.anchor <= tableRange.to ? selection.anchor + lengthDiff : selection.anchor),
    head: Math.min(newSelectionEnd, selection.head <= tableRange.to ? selection.head + lengthDiff : selection.head),
  },
});
```

**デバッグログの追加**
```typescript
console.log('[TableFormatter] Original text:', originalText);
console.log('[TableFormatter] Range:', tableRange);
console.log('[TableFormatter] Formatted text:', formattedText);
```

### 修正後の動作

- テーブルが正しくフォーマットされる
- テーブルが消えることがない
- カーソル位置が適切に維持される
- エラー時には警告ログが出力される

## テスト項目

- [x] 標準的なテーブルのフォーマット
- [x] セパレーター行があるテーブルのフォーマット
- [x] セパレーター行がないテーブルのフォーマット
- [x] 複数行のテーブルのフォーマット
- [x] 日本語と英数字が混在するテーブルのフォーマット
- [x] テーブルが消えないことの確認
- [x] カーソル位置が適切に維持されることの確認

## 関連ファイル

- `src/editor/extensions/tableFormatter.ts` (89-137行目)
- `src/utils/tableFormatter.ts` (122-206行目)

## メモ

- セパレーター行の処理が複雑で、インデックスの計算に注意が必要
- デバッグログを追加することで、今後の問題発生時に原因特定が容易になった
- TR-001（East Asian Width）に基づくフォーマット機能の安定性向上