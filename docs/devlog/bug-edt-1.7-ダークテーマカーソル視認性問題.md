---
status: open
priority: high
assignee: FE
start_date: 2025-01-09
end_date: 
tags: ["バグ修正", "エディタ", "ダークテーマ", "カーソル", "UX"]
depends_on: []
---

# BUG-EDT-1.7: ダークテーマの時にタスクエディタ画面でキャリッジが黒くて視認性が非常に悪い

## 概要

ダークテーマ（HienMark Dark）を使用している際に、タスクエディタのコードエディタ（CodeMirror）でカーソル（キャリッジ）が黒く表示され、背景色と同じ色になって視認性が非常に悪い問題が発生しています。

## バグ詳細

### 症状

- **発生条件**: HienMark Dark（ダークテーマ）を使用している状態でタスクエディタを開く
- **問題の動作**: CodeMirrorエディタでカーソルが黒く表示される
- **期待される動作**: カーソルが明るい色（例: アクセントカラー）で表示される

### 原因

`src/styles/global.css` でダークテーマには `--app-cursor-color: #646cff` が定義されているが、ライトテーマには `--app-cursor-color` が定義されていなかった。

`src/editor/extensions/customTheme.ts` で `.cm-cursor` の `borderLeftColor` に以下のように設定されている:

```typescript
'.cm-cursor': {
  borderLeftColor: 'var(--app-cursor-color, var(--app-text-main))',
}
```

`--app-cursor-color` が未定義の場合、フォールバックとして `var(--app-text-main)` が使用される。ダークテーマでは `--app-text-main` が `#ffffff` (白) なので、カーソルは正しく表示されるが、ライトテーマでは未定義変数の扱いが不明確で、意図した動作にならない可能性がある。

### 影響範囲

- タスクエディタのCodeMirrorエディタペイン
- HienMark Darkテーマを使用しているすべてのユーザー
- エディタでの編集作業の生産性

## 修正内容

### 修正ファイル

- `src/styles/global.css`
- `src/editor/extensions/customTheme.ts`

### 修正内容

1. **`src/styles/global.css`**: HienMark White（ライトテーマ）にも `--app-cursor-color` CSS変数を追加（58行目）

2. **`src/editor/extensions/customTheme.ts`**: 
   - `isDarkTheme()` 関数を追加してテーマを動的に判定（11-14行目）
   - `EditorView.theme()` の `dark` オプションを `isDarkTheme()` の結果に設定（161行目）
   - `.cm-cursor` スタイルに `!important` フラグと必要なプロパティを追加（44-50行目）

```typescript
function isDarkTheme(): boolean {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'hienmark-dark';
}

// ...

'.cm-cursor': {
  borderLeftColor: 'var(--app-cursor-color, var(--app-text-main)) !important',
  borderLeftWidth: '2px !important',
  borderLeftStyle: 'solid !important',
  backgroundColor: 'transparent !important',
  transition: 'border-left-color 0.2s ease',
},

// ...

}, { dark: isDarkTheme() });
```

## テスト項目

- [x] HienMark Darkテーマでカーソルが明るく表示されることを確認 ✅
- [x] HienMark Whiteテーマでカーソルが適切に表示されることを確認 ✅
- [x] エディタのフォーカス状態でカーソルが正しく表示されることを確認 ✅
- [x] 複数行の編集時にカーソルの視認性が十分であることを確認 ✅
- [ ] `--app-cursor-color` CSS変数がカーソル色に反映されることを確認 ⚠️

## 関連ファイル

- `src/styles/global.css` (35行目: ダークテーマの `--app-cursor-color`, 58行目: ライトテーマの `--app-cursor-color`)
- `src/editor/extensions/customTheme.ts` (11-14行目: `isDarkTheme()` 関数, 44-50行目: `.cm-cursor` スタイル, 161行目: `dark` オプション)

## メモ

- カーソルカラーはアクセントカラーと統一することで、UIの一貫性を保つ
- ダークテーマとライトテーマの両方で十分なコントラストを確保することが重要

## 修正の状況

**2025-01-09 (初回対応)**: ライトテーマに `--app-cursor-color` を追加したが、問題は解決していない。

ダークテーマでは `--app-cursor-color: #646cff` が定義されているが、実際にはカーソルが黒く表示される現象が発生していた。

**2025-01-09 (根本原因特定)**: 
実際の原因は `src/editor/extensions/customTheme.ts` で `EditorView.theme()` の第2引数に `dark: true` を固定していたことでした。これにより、ライトテーマでもダークテーマとして扱われ、カーソルの色が正しく表示されていませんでした。

**2025-01-09 (修正完了)**: 
以下の修正を実施しました：
1. `isDarkTheme()` 関数を追加し、`data-theme` 属性から現在のテーマを動的に判定
2. `EditorView.theme()` の `dark` オプションを `isDarkTheme()` の結果に設定
3. `.cm-cursor` スタイルに `!important` フラグと必要なプロパティを追加

**結果**:
- ✅ **視認性問題は解決**: ダークテーマ・ライトテーマの両方でカーソルが適切に表示されるようになりました
- ⚠️ **未解決の問題**: `--app-cursor-color` CSS変数が反映されず、デフォルトの色（白/黒）で表示される可能性があります

### 残存する問題

`--app-cursor-color` 変数がカーソル色に反映されない問題が残っています。現在の実装では、`var(--app-cursor-color, var(--app-text-main))` のフォールバックとして `--app-text-main` が使用されているため、カーソルはテキストと同じ色で表示されています。CSS変数の解決タイミングやスコープの問題が原因の可能性があります。

### 次の対応

`--app-cursor-color` が正しく適用されるようにするには、以下のいずれかの対応が必要です：
1. CodeMirrorのテーマ拡張でCSS変数の解決方法を確認
2. インラインスタイルやカスタムCSSによる直接的な色指定を検討
3. CodeMirrorのテーマシステムとCSS変数の統合方法を再検討

