# 設計原則・アーキテクチャ要件

## 7. 設計原則・アーキテクチャ要件

### R-7.1 (機能の配置原則) ✅ 実装済み

アプリケーションのアーキテクチャは、以下の原則に従うこと。

#### タグ許容値設定の配置
- **要件:** タグ許容値設定機能は、タグ管理機能の一部として実装すること。
- **実装状況:** ✅ 完了
  - タグ管理画面（TagManager）にタグ許容値設定UIを統合
  - TagConfigEditorによる一元管理

#### テンプレート編集画面の役割
- **要件:** テンプレート編集画面では、タグ管理で設定された許容値を参照するのみとし、設定機能自体は持たないこと。
- **実装状況:** ✅ 完了
  - TemplateEditorはタグ設定を読み取り専用で参照
  - 設定機能はTagManagerに集約

#### 機能重複の回避
- **要件:** 同一機能は同一コードで実現し、機能の重複実装を避けること。
- **実装状況:** ✅ 完了
  - サービス層の共通化（`tagService.ts`）
  - Reactカスタムフックの活用（`useTags.ts`, `useTemplates.ts`）

---

### R-7.2 (UI表記の統一) ✅ 実装済み

#### タグ型の表記統一
- **要件:** タグ型の表記は全画面で統一すること。
- **標準表記:**
  - 文字列型（String）
  - 数値型（Number）
  - 真偽値型（Boolean）
  - 日付型（Datetime）
  - 選択型（Select）
  - 複数選択型（MultiSelect）
  - 通貨型（Currency）
  - 画像型（Image）
  - ハイパーリンク型（Hyperlink）

- **実装状況:** ✅ 完了
  - TypeScript型定義による統一
  - i18n翻訳キーの統一

#### 制約とタグ型の区別
- **要件:** 「選択（単一）」「選択（複数）」は許容値設定の制約として扱い、タグ型とは区別すること。
- **実装状況:** ✅ 完了
  - `allowedValues`制約として実装
  - タグ型（`type`）とは分離

---

### R-7.3 (データ整合性) ✅ 実装済み

#### Front Matter双方向同期
- **要件:** エディタとタグ編集パネル間でFront Matterの双方向同期を保証すること。
- **実装状況:** ✅ 完了
  - **単一真実源:** React State（`currentTask.frontMatter`）
  - **CodeMirror:** 本文のみ編集
  - **TagEditorPanel:** Front Matter専用編集

#### 即座の反映
- **要件:** 一方で変更した内容は、即座に他方に反映されること。
- **実装状況:** ✅ 完了
  - タグ編集 → React State更新 → UI即座反映
  - 本文編集 → CodeMirror更新 → React State更新

#### 整合性維持
- **要件:** タスク切り替え時、保存時、表示切り替え時のいずれにおいてもデータの整合性を維持すること。
- **実装状況:** ✅ 完了
  - タスク切り替え時: 前タスクの保存確認 → 新タスク読み込み
  - 保存時: Front Matter（YAML） + 本文（Markdown）の同時保存
  - 表示切り替え時: React State → UI反映

---

## アーキテクチャパターン

### レイヤードアーキテクチャ

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (React Components + Hooks)       │
├─────────────────────────────────────┤
│         Service Layer               │
│  (TypeScript Services + Tauri IPC)  │
├─────────────────────────────────────┤
│         Business Logic Layer        │
│        (Rust Services)              │
├─────────────────────────────────────┤
│         Data Access Layer           │
│     (File System + Parsers)         │
└─────────────────────────────────────┘
```

### 責務の分離

#### Presentation Layer
- **責務:** UI表示、ユーザー入力処理
- **実装:** React Components, React Hooks
- **例:** `TaskBrowser`, `TaskEditor`, `TagManager`

#### Service Layer
- **責務:** ビジネスロジックの呼び出し、データ変換
- **実装:** TypeScript Services, Tauri Command呼び出し
- **例:** `workspaceService.ts`, `tagService.ts`

#### Business Logic Layer
- **責務:** ビジネスルール実装、データ処理
- **実装:** Rust Services
- **例:** `workspace_service.rs`, `tag_service.rs`

#### Data Access Layer
- **責務:** ファイルI/O、パース処理
- **実装:** Rust Parsers, File System API
- **例:** `markdown.rs`, `frontmatter.rs`

---

## データフローパターン

### Front Matter編集フロー（単一真実源）

```
[User Input]
    ↓
[TagEditorPanel]
    ↓
[onTagChange()]
    ↓
[React State Update]
 (currentTask.frontMatter)
    ↓
[UI Re-render]
    ↓
[onDirtyChange(true)]
    ↓
[Save to File]
 (YAML + Markdown)
```

### 本文編集フロー

```
[User Input]
    ↓
[CodeMirror Editor]
    ↓
[updateListener]
    ↓
[onDirtyChange(true)]
    ↓
[Save to File]
 (YAML + Markdown)
```

### タスク切り替えフロー

```
[Task Selection]
    ↓
[Check Dirty State]
    ↓ (if dirty)
[Save Confirmation Dialog]
    ↓ (if save)
[Save Current Task]
    ↓
[Load New Task]
    ↓
[Parse Front Matter]
    ↓
[Update React State]
 (currentTask.frontMatter + body)
    ↓
[Render UI]
 (TagEditorPanel + CodeMirror)
```

---

## 設計決定事項

### 1. Front Matter管理の単一真実源

**決定:** React Stateを唯一の真実源とする

**理由:**
- CodeMirrorとの同期問題を回避
- UIの即座な反映を保証
- データ競合を防止

**実装:**
- CodeMirrorは本文（`# Task Title`以降）のみ編集
- TagEditorPanelがFront Matterを完全管理

### 2. タグ型と制約の分離

**決定:** タグ型（`type`）と許容値（`allowedValues`）を分離

**理由:**
- 柔軟な制約設定
- 型システムの一貫性
- UI生成の簡素化

**実装:**
```typescript
interface TagConfig {
  alias?: string;
  allowedValues?: AllowedValueConstraint;
  sortSettings?: SortSettings;
  filterSettings?: FilterSettings;
}

interface TagSchema {
  [key: string]: {
    type: TagAttributeType;  // String, Number, Boolean等
    options: TagOptions;      // 型固有のオプション
  };
}
```

### 3. サービス層の共通化

**決定:** 共通ロジックをサービス層に集約

**理由:**
- コード重複の削減
- テスト容易性の向上
- 保守性の向上

**実装:**
- `tagService.ts` - タグCRUD操作
- `templateService.ts` - テンプレート管理
- `workspaceService.ts` - ワークスペース管理

---

## 実装状況サマリー

| 設計原則 | 完成度 | 備考 |
|---------|--------|------|
| R-7.1: 機能配置原則 | 100% | タグ管理一元化完了 |
| R-7.2: UI表記統一 | 100% | 型定義・i18n完了 |
| R-7.3: データ整合性 | 100% | 単一真実源実装完了 |

**全体平均:** 100%

---

## ベストプラクティス

### React Component設計
- 単一責任の原則（SRP）
- 小さなコンポーネントに分割
- Propsの型定義を徹底

### Rust Service設計
- エラーハンドリングを徹底（`Result<T, E>`）
- 非同期処理の適切な使用（`async/await`）
- 所有権システムの活用

### TypeScript型定義
- `any`の使用を避ける
- ジェネリクスの活用
- Union型による型安全性の向上

---

## 参照

- [システムアーキテクチャ](01-architecture.md)
- [機能要件](02-functional-requirements.md)
- [データ管理要件](06-data-management.md)
