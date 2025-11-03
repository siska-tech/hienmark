---
status: in_progress
priority: critical
assignee: FE
start_date: 2025-01-30
end_date: 
tags: ["バグ修正", "エディタ", "保存", "マルチタブ", "ファイルパス", "ビジュアルビュー", "ハイパーリンク"]
depends_on: ["bug-edt-1.6-タスク保存時のファイルパス誤り"]
---

# BUG-EDT-1.8: ビジュアルビューからハイパーリンクで別タスクへ遷移した際のタスク選択追随問題

## 概要

ビジュアルビューからハイパーリンクで別のタスクへ遷移した際に、タスクの選択が正しく追随できておらず、保存処理で間違ったファイルパスが使用される問題が再発しました。

## バグ詳細

### 症状

- ビジュアルビューでハイパーリンクをクリックして別のタスクへ遷移した際、タスクの選択が正しく追随できない
- 遷移後に保存処理を実行すると、間違ったファイルパスが使用される
- 結果として、別のタスクのファイルに保存されてしまう

### 原因

1. **handleSave関数の実装不備**
   - `handleSave`関数（940行目）で`...currentTask`を使用している
   - `currentTask`ステートは、`task.id`が変わった場合のみ更新される（209-227行目）
   - ビジュアルビューからハイパーリンクで遷移した際、`task` propは更新されるが、`currentTask`の更新タイミングがずれる可能性がある

2. **タスク遷移時の状態更新のタイミング問題**
   - ハイパーリンククリック時（812行目）で`onOpenTask?.(taskId)`が呼ばれる
   - `App.tsx`の`handleOpenTab`が実行され、`setActiveTabId(taskId)`と`setSelectedTaskId(taskId)`が設定される
   - しかし、`TaskEditor`コンポーネントの`task` propが更新されても、`currentTask`の更新は`useEffect`内で非同期に実行される
   - 保存処理が`currentTask`更新前に実行されると、古いファイルパスが使用される

3. **BUG-EDT-1.6の修正が不完全**
   - バグレポートでは修正済みとされているが、実際のコード（940行目）では`...currentTask`を使用している
   - `...task`を使用すべき

### 影響範囲

- ビジュアルビューからハイパーリンクで遷移した後の保存処理
- すべてのタスク保存処理（手動保存、自動保存を含む）
- データ損失のリスク

## 修正内容

### 修正ファイル

- `src/components/TaskEditor/TaskEditor.tsx`

### 修正内容

1. **handleSave関数の修正（940行目）**
   ```typescript
   // 修正前
   const updatedTask: Task = {
     ...currentTask,  // 古いファイルパスが含まれる可能性がある
     content: bodyContent,
     frontMatter,
     tagOrder,
   };

   // 修正後
   const updatedTask: Task = {
     ...task,         // 最新のtaskから基本情報を取得（特にfilePathとid）
     content: bodyContent,  // 本文のみを保持
     frontMatter,     // 編集中のFront Matter（currentTaskから取得）
     tagOrder,        // 編集中のタグ順序（currentTaskから取得）
   };
   ```
   
   - `currentTask`ではなく、propsとして渡される最新の`task`オブジェクトから基本情報（特に`filePath`と`id`）を取得するように変更
   - `frontMatter`と`tagOrder`は編集中の情報を使用するため、`currentTask`から取得（変更なし）
   - `content`はエディタから取得した本文を使用（変更なし）

2. **タスク遷移時の状態更新の確認**
   - ハイパーリンククリック処理（732-817行目）は正しく実装されている
   - `onOpenTask`が正しく呼ばれている
   - `task` propの更新は`App.tsx`で管理されている

### 修正後の動作

- ビジュアルビューからハイパーリンクで遷移した後も、正しいファイルに正しい内容が保存される
- 複数のタブを開いている状態でも、各タスクが正しく保存される
- データ損失のリスクが解消される

## テスト項目

- [ ] ビジュアルビューでハイパーリンクをクリックして別のタスクへ遷移
- [ ] 遷移後に編集して保存
- [ ] 正しいファイルに保存されることを確認
- [ ] 複数タブで異なるタスクを開いて、ハイパーリンクで遷移
- [ ] 遷移後に編集して保存
- [ ] 各タスクが正しいファイルに保存されることを確認
- [ ] 自動保存が正しく動作することの確認

## 関連ファイル

- `src/components/TaskEditor/TaskEditor.tsx`
  - `handleSave`関数 (912-960行目): 保存処理のロジック
  - ハイパーリンククリック処理 (732-817行目): プレビュー内のリンククリックをインターセプト
  - `currentTask`ステート (141-145行目): Front Matterの真実の源
  - `task`プロップ: 最新のタスク情報
- `src/App.tsx`
  - `handleOpenTab`関数 (63-87行目): タブを開く処理
  - `onOpenTask`プロップ: TaskEditorから呼ばれる

## メモ

- `currentTask`は編集中のFront Matter情報を保持するためのステート
- `task`プロップは常に最新の状態を表す
- ファイル保存時は、必ず最新の`task`プロップからファイルパスを取得すべき
- このバグはBUG-EDT-1.6の修正が不完全だったために再発した
- ビジュアルビューからの遷移時にも同様の問題が発生することを考慮する必要がある


