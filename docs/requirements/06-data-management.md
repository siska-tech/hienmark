# データ管理要件

## 6. データ管理要件

### R-6.1 (ワークスペース設定) ✅ 100% 実装完了

ワークスペースごとの設定を適切に管理すること。

#### 設定ファイルの配置
- **要件:** ワークスペースごとの設定を `.hienmark.json` ファイルに保存すること。
- **実装状況:** ✅ 完了
  - `.hienmark.json`をワークスペースルートに配置
  - JSON形式でのタグ設定、テーマ設定等を保存

#### Git管理対象
- **要件:** 設定ファイルはワークスペースルートディレクトリに配置すること。Git管理対象とすることで、チームでの設定共有を可能にすること。
- **実装状況:** ✅ 完了
  - `.hienmark.json`はGit管理可能
  - チームでの設定共有に対応

#### R-6.1.1 (設定の永続化) ✅ 実装済み

- **要件:**
  - タグ許容値設定を含む全てのワークスペース設定が確実に保存されること。
  - 設定変更は即座にディスクに書き込まれること。
  - アプリケーション再起動後も設定が保持されること。

- **実装状況:** ✅ 完了
  - Rustバックエンドによる確実なファイル書き込み
  - エラーハンドリング実装
  - 再起動後の設定保持確認済み

---

### R-6.2 (テンプレート管理) ✅ 100% 実装完了

タグテンプレートを適切に管理すること。

#### テンプレートストレージ
- **要件:** テンプレートは `.hienmark/templates/` ディレクトリにYAML形式で保存すること。
- **実装状況:** ✅ 完了
  - `.hienmark/templates/`ディレクトリ構造
  - YAML形式でのテンプレート保存

#### チーム共有
- **要件:** チームでのテンプレート共有を可能にすること。
- **実装状況:** ✅ 完了
  - Git管理可能な形式
  - ワークスペース間での共有に対応

#### R-6.2.1 (テンプレートの永続化) ✅ 実装済み

- **要件:**
  - テンプレートの作成・編集・削除操作が確実にファイルに反映されること。
  - テンプレートに含まれるタグ設定が正確に保存されること。

- **実装状況:** ✅ 完了
  - CRUD操作の完全実装
  - タグ設定の正確な保存
  - エラーハンドリング実装

---

## データ構造詳細

### ワークスペース設定 (.hienmark.json)

```json
{
  "version": "1.0",
  "tagConfig": {
    "status": {
      "alias": "ステータス",
      "allowedValues": {
        "type": "List",
        "values": ["todo", "doing", "done", "pending"]
      },
      "sortSettings": {
        "customOrder": ["todo", "doing", "pending", "done"]
      }
    },
    "priority": {
      "alias": "優先度",
      "allowedValues": {
        "type": "List",
        "values": ["very high", "high", "medium", "low", "very low"]
      }
    }
  },
  "theme": "dark",
  "language": "ja"
}
```

### タグスキーマ (.hienmark/tag_schema.json)

```json
{
  "status": {
    "type": "Select",
    "options": {
      "optionsList": ["todo", "doing", "done", "pending"],
      "defaultValue": "todo",
      "displayFormat": "dropdown"
    }
  },
  "dueDate": {
    "type": "Datetime",
    "options": {
      "format": "dateOnly",
      "defaultValue": {
        "type": "dynamic",
        "formula": "=[TODAY]+7"
      }
    }
  },
  "completed": {
    "type": "Boolean",
    "options": {
      "defaultValue": false
    }
  }
}
```

### テンプレート (.hienmark/templates/bug-fix.yaml)

```yaml
name: "Bug Fix"
description: "Template for bug fix tasks"
tags:
  status: "todo"
  priority: "high"
  type: "bug"
  assignee: ""
mergeMode: "merge"
```

---

## ディレクトリ構造

```
workspace-root/
├── .hienmark.json              # ワークスペース設定
├── .hienmark/
│   ├── tag_schema.json         # タグ属性スキーマ
│   ├── templates/              # テンプレートディレクトリ
│   │   ├── bug-fix.yaml
│   │   ├── feature.yaml
│   │   └── meeting.yaml
│   └── app-settings.json       # アプリケーション固有設定
├── task-001.md                 # タスクファイル
├── task-002.md
└── task-003.md
```

---

## ファイル操作フロー

### 設定保存フロー

```
1. UI変更（React State）
   ↓
2. Tauri Command呼び出し
   ↓
3. Rust Service Layer
   ↓
4. JSON/YAML Serialization
   ↓
5. File System Write
   ↓
6. 確認レスポンス
```

### テンプレート適用フロー

```
1. テンプレート選択（UI）
   ↓
2. テンプレート読み込み（Tauri Command）
   ↓
3. Rust Template Service
   ↓
4. YAML Parse
   ↓
5. マージモード適用（Overwrite / Merge）
   ↓
6. React State更新
   ↓
7. UI反映
```

---

## エラーハンドリング

### ファイル書き込みエラー
- **対策:** Rustバックエンドで適切なエラーメッセージを返す
- **実装:** `Result<(), String>` 型でエラー詳細を返却
- **UI:** エラーダイアログ表示

### 不正なJSON/YAML
- **対策:** パース時のバリデーション
- **実装:** `serde_json` / `serde_yaml` のエラーハンドリング
- **UI:** ユーザーへの通知とロールバック

### ファイル権限エラー
- **対策:** 適切な権限確認
- **実装:** Tauri FSの権限チェック
- **UI:** 権限エラーの明確な通知

---

## バックアップ戦略

### 推奨事項
1. **Git管理:** `.hienmark.json` と `.hienmark/templates/` をGit管理
2. **定期バックアップ:** ワークスペース全体の定期バックアップ
3. **エクスポート機能:** 設定・テンプレートのエクスポート機能（将来実装予定）

---

## 実装状況サマリー

| データ管理要件 | 完成度 | 備考 |
|--------------|--------|------|
| R-6.1: ワークスペース設定 | 100% | 完全実装、永続化確認済み |
| R-6.1.1: 設定永続化 | 100% | エラーハンドリング実装済み |
| R-6.2: テンプレート管理 | 100% | YAML形式、Git管理対応 |
| R-6.2.1: テンプレート永続化 | 100% | CRUD操作完全実装 |

**全体平均:** 100%

---

## 参照

- [システムアーキテクチャ](01-architecture.md)
- [機能要件](02-functional-requirements.md)
- [高度な機能](04-advanced-features.md)
