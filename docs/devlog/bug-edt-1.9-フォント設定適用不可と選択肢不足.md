---
status: pending
priority: medium
assignee: FE
start_date: 
end_date: 
tags: ["バグ修正", "エディタ", "フォント", "設定"]
depends_on: []
---

# BUG-EDT-1.9: フォント設定が適用されない、フォント選択肢が少ない

## 概要

エディタのフォント設定が実際のエディタに適用されていない問題と、フォント選択肢が非常に少ない問題が発生しています。

## バグ詳細

### 症状

1. **フォント設定が適用されない**
   - 設定画面（エディタ > フォント設定）でフォントを変更しても、実際のエディタに反映されない
   - 設定は保存されているが、エディタは固定のフォント（Consolas, Monaco, Courier New）を使用し続ける

2. **フォント選択肢が少ない**
   - 設定画面のフォント選択肢が8種類しかない
     - システムフォント
     - Consolas
     - Monaco
     - Courier New
     - Times New Roman
     - Arial
     - Helvetica
     - Georgia
   - 一般的なエディタで使用されるフォント（例：Fira Code, JetBrains Mono, Source Code Pro, Inconsolata など）が選択できない

### 原因

1. **フォント設定がエディタに適用されていない**
   - `TaskEditor.tsx`の`createEditorExtensions()`関数で`createCustomTheme()`を呼び出しているが、フォント設定（`editorFontFamily`, `editorFontSize`）を渡していない
   - `customTheme.ts`では固定のフォントが設定されている：
     ```typescript
     '.cm-scroller': {
       fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
       fontSize: '14px',
     }
     ```
   - `TaskEditor.css`でも固定のフォントが設定されている（223-226行目）

2. **フォント選択肢が少ない**
   - `SettingsDetailPanel.tsx`のフォント選択UI（1092-1106行目）に限られた選択肢しか実装されていない
   - システムフォントとして利用可能なフォントのリストを動的に取得する機能がない
   - 一般的なプログラミング用フォントが含まれていない

### 影響範囲

- エディタのフォント設定機能全体
- ユーザーのフォントカスタマイズ体験
- アクセシビリティ（視認性を改善したいユーザー）

## 修正内容

### 修正ファイル

- `src/editor/extensions/customTheme.ts`
- `src/components/TaskEditor/TaskEditor.tsx`
- `src/components/TagManagement/SettingsDetailPanel.tsx`
- `src/components/TaskEditor/TaskEditor.css`

### 修正内容

1. **フォント設定をエディタに適用する**
   - `createCustomTheme()`関数を`editorFontFamily`と`editorFontSize`を受け取れるように修正
   - `TaskEditor.tsx`の`createEditorExtensions()`で、propsの`editorFontFamily`と`editorFontSize`を`createCustomTheme()`に渡す
   - `customTheme.ts`で動的にフォントを設定するように変更
   - `TaskEditor.css`の固定フォント設定を削除、または動的に適用されるように変更

2. **フォント選択肢を拡充する**
   - システムフォント一覧を取得する機能を追加
   - 一般的なプログラミング用フォントを追加：
     - Fira Code
     - JetBrains Mono
     - Source Code Pro
     - Inconsolata
     - Cascadia Code
     - Menlo
     - その他、一般的なエディタで使用されるフォント
   - カスタムフォントを直接入力できる機能を追加（オプション）

### 修正後の動作

- 設定で選択したフォントがエディタに即座に反映される
- より多くのフォント選択肢から選択できる
- フォントサイズも設定通りに適用される

## テスト項目

- [ ] 設定でフォントを変更した際に、エディタに即座に反映されること
- [ ] 設定でフォントサイズを変更した際に、エディタに即座に反映されること
- [ ] 各フォント選択肢が正しく動作すること
- [ ] フォントが存在しない場合のフォールバックが正しく動作すること
- [ ] 複数のタブで異なるフォント設定が適用されること（設定はワークスペース単位）
- [ ] 設定を保存して再起動後もフォント設定が保持されること

## 関連ファイル

- `src/editor/extensions/customTheme.ts` (22-24行目): 固定フォント設定
- `src/components/TaskEditor/TaskEditor.tsx` (405-411行目): エディタ拡張機能の作成
- `src/components/TaskEditor/TaskEditor.css` (223-226行目): 固定フォント設定
- `src/components/TagManagement/SettingsDetailPanel.tsx` (1092-1106行目): フォント選択UI
- `src/components/TaskEditor/TaskEditor.tsx` (38-39行目): フォント設定props
- `src/App.tsx` (514行目): フォント設定のprops受け渡し

## メモ

- フォント設定はワークスペース単位で保存される（`WorkspaceConfig`）
- フォント設定が未設定の場合は、デフォルトフォントを使用
- システムフォントの一覧取得は、OSごとに異なるAPIを使用する必要がある可能性がある
- Tauriアプリケーションの場合、システムフォント一覧の取得には特別な処理が必要かもしれない



