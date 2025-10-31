# 高度な機能

## 4.8. タグ属性システム (Typed Tagging System) ⏳ 60% 実装完了

タスクのタグ（カテゴリ）に対して、`status`や`priority`といったキーごとに厳密なデータ型（属性）を定義できるようにする。これにより、データの一貫性を保証し、入力UIを最適化し、高度なフィルタリングと分析を可能にする。

### R-4.8.1 (タグ管理モードへの統合) ✅ 部分的実装

「R-4.3.6 (タグ管理モード)」を拡張し、ユーザーが新しいタグカテゴリを定義する際、必ず以下のいずれかの属性タイプを選択できるようにすること。

**実装状況:**
- ✅ TypeScript型定義完了
- ✅ Rustバックエンド完了
- ⏳ UI統合未完了

---

### R-4.8.2 (属性タイプの定義) ✅ バックエンド完了

以下の9つの属性タイプを実装すること。

| 属性タイプ | Front Matter保存形式 (例) | 説明 | 実装状況 |
|:---|:---|:---|:---:|
| **文字列 (String)** | `employeeId: "A-105"` | 汎用的なテキストデータ | ✅ |
| **数値 (Number)** | `progress: 75` | 計算対象となる数値（通貨以外） | ✅ |
| **はい/いいえ (Boolean)** | `completed: true` | `true` / `false` の二値 | ✅ |
| **日付と時刻 (Datetime)** | `dueDate: "2025-10-30T15:00:00"` | ISO 8601形式で保存される日付/時刻 | ✅ |
| **選択肢 (Select)** | `priority: "high"` | 定義済みリストから単一の値を選択 | ✅ |
| **複数選択肢 (MultiSelect)** | `tags: ["bug", "ui"]` | 定義済みリストから複数の値を選択（配列） | ✅ |
| **通貨 (Currency)** | `cost: 15000.00` | 高精度な財務計算用の数値 | ⏳ |
| **画像 (Image)** | `thumbnail: "./assets/img_01.png"` | ワークスペースからの相対パス | ⏳ |
| **ハイパーリンク (Hyperlink)** | `link: { url: "...", text: "..." }` | URLと説明テキストをオブジェクトとして保存 | ⏳ |

**実装済み:**
- TypeScript型定義（全9タイプ）
- Rustバックエンド（スキーマ管理、動的デフォルト値計算）
- 基本的な動的入力コンポーネント（Boolean, Select, MultiSelect, Number, Date）

**未実装:**
- Currency, Image, Hyperlink入力コンポーネント
- TagConfigEditorへの統合
- TagEditorPanelへの統合

---

### R-4.8.3 (属性ごとのカスタマイズオプション) ✅ バックエンド完了

タグ管理モードにおいて、属性タイプごとに以下のカスタマイズオプションを設定できること。

#### 文字列 (String)
- `maxLength` (文字数制限)
- `defaultValue` (既定値)

#### 数値 (Number)
- `min` (最小値), `max` (最大値)
- `decimalPlaces` (小数点以下の桁数)
- `defaultValue` (既定値)
- `formatAsPercentage` (パーセンテージとして表示)

#### はい/いいえ (Boolean)
- `defaultValue` (チェックの有無, `true`/`false`)

#### 日付と時刻 (Datetime)
- `format` (日付のみ / 日付と時刻)
- `defaultValue` (既定値。`static` (特定の値), `dynamic` (計算値, 例: `=[TODAY]+30`))

**実装状況:**
- ✅ Rustバックエンドで動的デフォルト値計算をサポート
  - `=[TODAY]` - 今日の日付
  - `=[TODAY]+7` - 7日後
  - `=[TODAY]-30` - 30日前

#### 選択肢 (Select / MultiSelect)
- `optionsList` (選択肢リストの定義)
- `allowManualEntry` (リスト外の値の手動入力を許可)
- `defaultValue` (既定値)
- `displayFormat` (ドロップダウン / ラジオボタン)
- `allowMultiple` (複数選択を許可するか。`true`ならMultiSelect, `false`ならSelect)

#### 通貨 (Currency)
- `min` (最小値), `max` (最大値)
- `decimalPlaces` (小数点以下の桁数)
- `defaultValue` (既定値)
- `currencyFormat` (通貨形式の選択, 例: JPY, USD)

#### 画像 (Image)
- (特になし。UI側でアップロード/置換/削除を実装)

#### ハイパーリンク (Hyperlink)
- (特になし。UI側でURLと説明テキストを入力)

---

### R-4.8.4 (入力UIの動的変更) ⏳ 部分的実装

GUIによるタグ編集時（`TagEditorPanel`）、タグの属性タイプに応じて入力コンポーネントを動的に変更すること。

| タイプ | 入力コンポーネント | 実装状況 |
|:---|:---|:---:|
| `String` | テキスト入力フィールド | ✅ |
| `Number` | 数値入力フィールド | ✅ |
| `Currency` | 数値入力フィールド（通貨記号付き） | ⏳ |
| `Boolean` | チェックボックス | ✅ |
| `Datetime` | 日付/時刻ピッカー | ✅ |
| `Select` | ドロップダウン または ラジオボタン | ✅ |
| `MultiSelect` | 複数選択ドロップダウン または チェックボックス群 | ✅ |
| `Image` | 画像アップロード/プレビュー/削除ボタン | ⏳ |
| `Hyperlink` | URLと説明テキストの入力フィールド | ⏳ |

**実装済みコンポーネント:**
- `BooleanInput.tsx`
- `SelectInput.tsx`
- `MultiSelectInput.tsx`
- `NumberInput.tsx`
- `DateInput.tsx`

**未実装コンポーネント:**
- `CurrencyInput.tsx`
- `ImageInput.tsx`
- `HyperlinkInput.tsx`

---

### R-4.8.5 (配列 (Array) 属性の除外) ✅ 設計決定

独立した「配列 (Array)」属性は実装しない。

**理由:**
- 「複数選択肢 (MultiSelect)」属性が、YAML形式の配列（例: `tags: [A, B, C]`）としてデータを保存する役割を担うため、機能が重複する。
- `MultiSelect`として定義することで、データ構造とUI機能を統一。

---

### R-4.8.6 (フィルター/ソート機能との連携) ⏳ 未実装

「R-4.2.5 (タスクフィルタ機能)」「R-4.2.4 (タスク並べ替え機能)」を本属性システムと連携させること。

**要件:**
- フィルター/ソート設定UIは、タグの属性タイプを認識すること。
- `Datetime`型には `>` `<` 演算子で日付比較（例: `dueDate >= [TODAY]`）を可能にする。
- `Number`/`Currency`型には `>` `<` 演算子で数値比較を可能にする。
- `Boolean`型は `true`/`false` での絞り込みを可能にする（また、集計時に `1`/`0` として扱う）。
- `Select`型はカスタム順序での並べ替えを可能にする。

**実装状況:** ⏳ 未実装（優先度: 低）

---

## 実装状況サマリー

| タグ属性システム | 完成度 | 備考 |
|----------------|--------|------|
| R-4.8.1: タグ管理統合 | 50% | 型定義・バックエンド完了、UI未統合 |
| R-4.8.2: 属性タイプ定義 | 66% | 9タイプ中6タイプのUI実装完了 |
| R-4.8.3: カスタマイズオプション | 70% | バックエンド完了、UI未統合 |
| R-4.8.4: 入力UI動的変更 | 66% | 基本タイプ実装済み |
| R-4.8.5: 配列属性除外 | 100% | 設計決定済み |
| R-4.8.6: フィルタ/ソート連携 | 0% | 未実装 |

**全体平均:** 60%

## 技術詳細

### データ保存形式

タグスキーマは `.hienmark/tag_schema.json` に保存：

```json
{
  "priority": {
    "type": "Select",
    "options": {
      "optionsList": ["very high", "high", "medium", "low", "very low"],
      "allowManualEntry": false,
      "defaultValue": "medium",
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
  }
}
```

### Tauri Commands

実装済みコマンド：
- `load_tag_schema(workspace_path: String) -> Result<String, String>`
- `save_tag_schema(workspace_path: String, schema_json: String) -> Result<(), String>`
- `get_dynamic_default_value(formula: String) -> Result<String, String>`

## 参照

- [機能要件](02-functional-requirements.md)
- [実装状況](../devlog/phase3-tag-system.md#313-tag-attribute-system-r-48-実装状況-進行中)
- [データ管理要件](06-data-management.md)
