---
status: in_progress
priority: high
assignee: BE/FE
start_date: 2025-10-26
end_date: 
tags: ["Phase 3", "タグシステム", "R-4.8", "型付きタグ", "進行中"]
depends_on: ["task-ph3-12-タグ順序のドラッグ&ドロップ機能.md"]
---

# Task-PH3-13: Tag Attribute System (R-4.8)

## 概要

Tag Attribute System (R-4.8) の実装状況を追跡します。型付きタグシステムにより、タグに対して9種類の属性タイプ（String, Number, Boolean, Datetime, Select, MultiSelect, Currency, Image, Hyperlink）を定義でき、型安全なタグ管理が可能になります。

**関連Phase:** Phase 3: タグシステム実装  
**ステータス:** ⏳ 進行中

## タスク詳細

### 実装済み項目 ✅

**1. TypeScript型定義 ✅**
- **File**: `src/types/task.ts`
- Tag Attribute Systemの包括的なTypeScript型定義
- `TagAttributeType`: 全属性タイプのユニオン型
- `TagSchema`: スキーマ定義インターフェース

**2. Rustバックエンド実装 ✅**
- **Files**: 
  - `src-tauri/src/commands/tag_schema_commands.rs`
  - `src-tauri/src/service/tag_schema_service.rs`
- **Tauri Commands**:
  - `load_tag_schema`, `save_tag_schema`, `get_dynamic_default_value`
- **Features**:
  - `.hienmark/tag_schema.json` からのスキーマ読み込み/保存
  - 動的デフォルト値の計算（例: `=[TODAY]+30`）

**3. フロントエンドサービス ✅**
- **Files**:
  - `src/services/tagSchemaService.ts`
  - `src/hooks/useTagSchema.ts`

**4. 動的入力コンポーネント（部分実装） ✅**
- **Implemented**: BooleanInput, SelectInput, MultiSelectInput, NumberInput, DateInput
- **Remaining**: CurrencyInput, ImageInput, HyperlinkInput

### 未実装項目 ⏳

**1. 追加の動的入力コンポーネント ⏳**
- CurrencyInput.tsx: 通貨入力とフォーマットサポート
- ImageInput.tsx: 画像選択とプレビュー
- HyperlinkInput.tsx: URLとテキスト入力

**2. TagConfigEditorの更新 ⏳**
- 属性タイプ選択UIの追加
- 各属性タイプのオプションエディタ追加
- 9種類の属性タイプのサポート

**3. TagEditorPanelの更新 ⏳**
- `useTagSchema`フックを使用したタグスキーマの読み込み
- スキーマに基づく動的入力のレンダリング
- スキーマが定義されていない場合の既存動作へのフォールバック

**4. フィルター/ソート統合 ⏳**
- フィルタリング/ソート前にタグスキーマを読み込み
- 型認識の比較の実装（Datetime, Number/Currency, Boolean, Select）

**5. スキーマファイル管理 ⏳**
- `.hienmark/tag_schema.json`がGitで追跡されることを確認

### アーキテクチャ決定

**スキーマストレージ**
- タグスキーマは`.hienmark/tag_schema.json`にJSON形式で保存
- 既存の`TagConfig`システムと協調して動作

### 次のステップ

1. 動的入力コンポーネントの完成（Currency, Image, Hyperlink）
2. TagConfigEditorの更新（属性タイプ選択UI）
3. TagEditorPanelの更新（スキーマ統合）
4. フィルター/ソート統合の実装
5. テスト（全属性タイプのテスト）

### 参照

- **要件**: 仕様書のR-4.8.1からR-4.8.6
- **実装仕様**: セクション3（データモデル）、セクション4（Rustバックエンド）、セクション5（Reactフロントエンド）

## 完了記録

**開始日:** 2025-10-26  
**開発者:** Claude Code + User  
**ステータス:** ⏳ 進行中

**次のステップ:** Phase 4: 分析ダッシュボード（並行して進行可能）

