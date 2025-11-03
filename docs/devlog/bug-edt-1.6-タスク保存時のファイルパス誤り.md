---
status: completed
priority: critical
assignee: FE
start_date: 2025-01-30
end_date: 2025-01-30
tags: ["バグ修正", "エディタ", "保存", "マルチタブ", "ファイルパス"]
depends_on: []
---

# BUG-EDT-1.6: 開いているタスクによって他のタブのファイルが書き換えられる

## 概要

複数のタブで異なるタスクを開いている状態で、一つのタスクを保存すると、別のタブのファイルの内容で上書きされてしまう致命的なバグが発生していました。

## バグ詳細

### 症状

- 例：READMEを編集している場合、関係ないバグ修正レポートがREADMEの内容で上書きされてしまう
- 複数のタブを開いている状態で、あるタスクを保存すると、別のタスクのファイルに保存される
- ファイルの内容が完全に上書きされるため、データ損失が発生する可能性がある

### 原因

1. **TaskEditorのhandleSave関数の実装ミス**
   - `handleSave`関数内で`updatedTask`を生成する際、`currentTask`ステートからファイルパス（`filePath`）を取得していた
   - `currentTask`は編集中のFront Matter情報を保持するステートだが、初期化後は更新されない
   - タスクの切り替え時、`currentTask`の初期化は`task.id`が変化した場合のみ行われる（useEffectの依存配列が`[task.id]`のみ）

2. **具体的な問題の発生シーケンス**
   ```
   1. タブA（task-001.md）を開く → currentTaskにtask-001の情報が設定される
   2. タブB（README.md）を開く → currentTaskは更新されない（task.idが同じ場合）
      → または、currentTaskは更新されるが、編集中にtask propが変更される
   3. タブBで保存処理を実行
   4. handleSave関数でcurrentTaskからfilePathを取得
   5. currentTaskのfilePathが古いまま（task-001.md）なので、間違ったファイルに保存される
   ```

3. **コードの問題箇所**
   ```typescript
   // 問題のあるコード（修正前）
   const updatedTask: Task = {
     ...currentTask,  // currentTaskからfilePathを取得（古い可能性がある）
     content: bodyContent,
     frontMatter,
     tagOrder,
   };
   ```

### 影響範囲

- すべてのタスク保存処理（手動保存、自動保存を含む）
- 複数のタブを開いている場合のすべてのファイル
- データ損失のリスク

## 修正内容

### 修正ファイル

- `src/components/TaskEditor/TaskEditor.tsx`

### 修正内容

1. **updatedTask生成時の修正**
   ```typescript
   // 修正後のコード
   const updatedTask: Task = {
     ...task,           // 最新のtaskから基本情報を取得（特にfilePathとid）
     content: bodyContent,  // 本文のみを保持
     frontMatter,      // 編集中のFront Matter
     tagOrder,         // 編集中のタグ順序
   };
   ```
   
   - `currentTask`ではなく、propsとして渡される最新の`task`オブジェクトから基本情報（特に`filePath`と`id`）を取得するように変更
   - `frontMatter`と`tagOrder`は編集中の情報を使用するため、`currentTask`から取得（変更なし）
   - `content`はエディタから取得した本文を使用（変更なし）

### 修正後の動作

- 正しいファイルに正しい内容が保存される
- 複数のタブを開いている状態でも、各タスクが正しく保存される
- データ損失のリスクが解消される

## テスト項目

- [x] 単一タブでタスクを開いて編集・保存
- [x] 複数タブで異なるタスクを開いて、それぞれ編集・保存
- [x] 複数タブでタスクを切り替えながら編集・保存
- [x] 自動保存が正しく動作することの確認
- [x] 各タスクが正しいファイルに保存されることの確認

## 関連ファイル

- `src/components/TaskEditor/TaskEditor.tsx`
  - `handleSave`関数 (898-946行目): 保存処理のロジック
  - `currentTask`ステート (141-145行目): Front Matterの真実の源
  - `task`プロップ: 最新のタスク情報

## メモ

- `currentTask`は編集中のFront Matter情報を保持するためのステート
- `task`プロップは常に最新の状態を表す
- ファイル保存時は、必ず最新の`task`プロップからファイルパスを取得すべき
- このバグは非常に深刻で、データ損失につながる可能性があった
- マルチタブ対応の実装時には、各タブが独立した状態を持っていることが重要

