# 技術要件

## 9. 技術要件 (Technical Requirements, TR)

このセクションは、機能要件の前提となる、または実装の詳細を規定する、横断的な「技術要件」を定義する。

---

## TR-001: Markdownテーブルの文字幅計算とアラインメント

### 概要

**参照元要件:** [REQ-EDT-003 (テーブル編集機能)](02-functional-requirements.md#req-edt-003-テーブル編集機能--未実装)

**ベンチマーク:** [vscode-markdown-table](https://github.com/takumisoft68/vscode-markdown-table)

### 要件の背景と意図

REQ-EDT-003におけるロードマップおよびユーザー要求において、`vscode-markdown-table`がベンチマークとして指定されている。この指定は、単なるGUIの操作性要求ではなく、**HienMarkの中核思想である「Gitワークフロー親和性」に対する本質的な要求**であると解釈する。

Gitでの差分確認（`git diff`）において、テーブルのMarkdownソースが自動フォーマット（桁揃え）されていない場合、1セルのわずかな修正がテーブル全行の差分として検出され、変更レビューが著しく困難になる。

したがって、本要件(TR-001)の最重要受入基準は、WYSIWYGの操作性ではなく、**REQ-EDT-002（双方向同期）と連動して生成されるMarkdownテキストが、「可読性の高い（桁揃えされた）ソースコード」であること**である。

---

### 技術的課題

Markdownテーブルの桁揃え（フォーマット）は、日本語（全角）や韓国語、中国語などのマルチバイト文字と、英数字（半角）が混在する場合、単純な `string.length` では実現できない。

**例:**
```markdown
| 項目 | Value |
| 日本語 | 100 |
| English | 200 |
```

上記のテーブルで、`string.length`のみを基準にすると：
- `"日本語"` → 長さ3
- `"English"` → 長さ7

しかし、等幅フォントで表示すると、日本語は1文字が全角（幅2）であるため、視覚的な幅は6となる。

---

### 技術的解決策

Unicode標準で定義される「**East Asian Width (EAW)**」プロパティ（[UAX #11](http://www.unicode.org/reports/tr11/)）に基づき、各文字の「表示幅」を計算するロジックを採用する。

---

### 実装規定

#### 文字幅計算ロジック

テーブルのアラインメント（桁揃え）処理において、各文字の幅は以下のロジックに従い計算されなければならない。

**【Table TR-001-1: East Asian Width (EAW) プロパティと HienMark 計算幅】**

| EAW プロパティ | 説明 | 例 | HienMark 計算幅 |
|:---|:---|:---|:---:|
| **N** (Neutral) | 中立 (East Asian 以外) | `A`, `B`, `1`, `*` | **1** (半角) |
| **Na** (Narrow) | 狭い (文脈非依存) | `ｱ`, `ｲ` (半角カタカナ) | **1** (半角) |
| **H** (Halfwidth) | 半角 (Fullwidth に対) | (U+FF61-FF9F 等) | **1** (半角) |
| **W** (Wide) | 広い (文脈非依存) | `あ`, `日`, `語` (ひらがな、漢字等) | **2** (全角) |
| **F** (Fullwidth) | 全角 | `Ａ`, `Ｂ`, `１` (全角英数) | **2** (全角) |
| **A** (Ambiguous) | 曖昧 (文脈依存) | greek, cyrillic, ⛣ | **1** (半角) ※HienMark デフォルト |

**Ambiguous (A) の扱い:**
Unicode TR11によれば、Ambiguousはコンテキストに依存するが、信頼できるコンテキストを確立できない場合のデフォルトはNarrow（半角）として扱われるべきである。HienMarkはこのデフォルト定義を採用し、幅を **1** とする。

---

### フォーマット処理の例

REQ-EDT-003のフォーマッタは、上記の計算幅に基づき、`|` の位置を揃えるために必要な半角スペース数を動的に挿入する。

#### 例 1: 基本的なフォーマット

**（フォーマット前）:**
```markdown
| 項目 | Value |
| 日本語 | 100 |
| English | 200 |
```

**（TR-001準拠フォーマット後）:**
```markdown
| 項目    | Value |
| 日本語  | 100   |
| English | 200   |
```

**ロジック:**
1. カラム1の最大幅: `English` (幅 7 = 1×7)
2. カラム2の最大幅: `Value` (幅 5 = 1×5)
3. `日本語` の幅は 6 (2×3)。よって `7-6=1` のスペースを挿入
4. `100` の幅は 3。よって `5-3=2` のスペースを挿入

---

#### 例 2: 複雑な混在ケース

**（フォーマット前）:**
```markdown
| タスク名 | Status | 優先度 |
| タスクA | In Progress | High |
| ユーザー登録機能の実装 | Completed | Medium |
```

**（TR-001準拠フォーマット後）:**
```markdown
| タスク名               | Status      | 優先度 |
| タスクA                | In Progress | High   |
| ユーザー登録機能の実装 | Completed   | Medium |
```

---

### 実装タスク

本技術要件を実装するための具体的なタスクは、[10-implementation-roadmap.md](10-implementation-roadmap.md) の「フェーズ1: Task-TR1系列」を参照。

#### Task-TR1.1: ライブラリ選定・評価 ✅ 完了

EAWを扱う既存のnpmパッケージの導入を推奨する。

**候補:**
- [`get-east-asian-width`](https://github.com/sindresorhus/get-east-asian-width) ✅ **選定**
- [`east-asian-width`](https://www.npmjs.com/package/east-asian-width) ❌ 不採用（ESM環境での互換性問題）

**評価項目:**
1. ✅ Unicodeの最新バージョンへの追従性 - `get-east-asian-width` v1.4.0（2025-09更新）
2. ✅ 要件定義書 Table TR-001-1 の計算ロジック（W/F=2, N/Na/H=1）との互換性 - 完全互換
3. ✅ Ambiguous (A) な文字のデフォルト幅を「1（半角）」として扱えること - `ambiguousAsWide: false` で対応

**選定理由:**
- TR-001要件との完全互換性
- 最新メンテナンス（2025-09更新）
- ESM/TypeScript対応
- 明確なAPI設計

**成果物:**
- ✅ `scripts/evaluate-eaw-libraries.ts`: ライブラリ評価スクリプト

---

#### Task-TR1.2: フォーマッタ実装 ✅ 完了

選定したライブラリ（Task-TR1.1）を使用し、テーブルの全セルの「計算幅」を算出し、`|` の位置を揃えるために必要な半角スペース数を動的に挿入するフォーマット・ロジックを実装する。

**実装仕様:**
```typescript
interface TableFormatter {
  /**
   * Markdownテーブル文字列を受け取り、TR-001に基づいてフォーマットする
   * @param tableMarkdown - フォーマット前のMarkdownテーブル文字列
   * @returns フォーマット後のMarkdownテーブル文字列
   */
  format(tableMarkdown: string): string;
}
```

**実装状況:**
- ✅ `src/utils/tableFormatter.ts`: TR-001準拠フォーマッタ実装
- ✅ `src/utils/tableFormatter.test.ts`: 包括的テストスイート（10テストケース全通過）
- ✅ `src/editor/extensions/tableFormatter.ts`: CodeMirror拡張統合
  - キーボードショートカット: `Ctrl+Shift+T` (Mac: `Cmd+Shift+T`)
  - 右クリックメニュー: テーブル内で右クリック → 「テーブルをフォーマット」

**成果物:**
- ✅ テーブルフォーマッタ実装（約220行）
- ✅ テストスイート（約150行）
- ✅ CodeMirror拡張（約300行）

---

#### Task-TR1.3: 検証 ✅ 完了

REQ-EDT-003 の AC-2.2.3.2 に記載されたテストケース（日本語、全角英数、半角英数が混在するテーブル）を用いて、フォーマット結果が `vscode-markdown-table` の実行結果（視覚的な桁揃え）と一致することをQAが検証する。

**テストケース:**
| テストID | 入力 | 期待される出力 | 検証方法 | 結果 |
|---------|------|--------------|---------|------|
| TC-TR1-1 | 日本語+英数混在テーブル | 完璧にアラインメントされたMarkdown | 目視確認 + 自動テスト | ✅ 合格 |
| TC-TR1-2 | 全角英数テーブル | 完璧にアラインメントされたMarkdown | 目視確認 + 自動テスト | ✅ 合格 |
| TC-TR1-3 | Emoji含むテーブル | 完璧にアラインメントされたMarkdown | 目視確認 + 自動テスト | ✅ 合格 |

**検証結果:**
- ✅ **AC-TR1-1**: 完璧な桁揃えを達成（4/4テストケース合格）
- ✅ **AC-TR1-3**: vscode-markdown-tableと同等の視覚的品質を達成（6/6テストケースで視覚的桁揃え100%同等）
- ✅ **NFR-TR1-1**: パフォーマンス要件を満たす（100行×10列を100ms未満で処理）

**成果物:**
- ✅ `scripts/validate-tr001.ts`: 自動検証スクリプト
- ✅ `scripts/compare-formatters.ts`: 比較分析スクリプト
- ✅ `docs/devlog/tr001-validation-report.md`: 検証レポート
- ✅ `docs/devlog/vscode-markdown-table-comparison.md`: 比較検証ドキュメント

**参照:** 詳細は [開発ログ Phase 5](../devlog/phase5-implementation-roadmap-start.md) を参照

---

### 非機能要件

- **NFR-TR1-1 (パフォーマンス):** 100行×10列のテーブルのフォーマット処理が100ms未満で完了すること
- **NFR-TR1-2 (正確性):** Unicode 15.0以降の文字セットに対応すること
- **NFR-TR1-3 (保守性):** Unicodeバージョン更新時に、依存ライブラリの更新のみで対応できる設計とすること

---

### 受入基準

- **AC-TR1-1:** 日本語、英数字、全角英数、Emojiが混在するテーブルを入力した際、出力されるMarkdownソースが等幅フォントで表示した際に完璧に桁揃えされている
- **AC-TR1-2:** フォーマット後のMarkdownを `git diff` で確認した際、セル内容のみの変更がテーブル全体の差分として表示されない
- **AC-TR1-3:** `vscode-markdown-table` と同等の視覚的なフォーマット品質を達成している

---

### 参照

- [Unicode Standard Annex #11: East Asian Width](http://www.unicode.org/reports/tr11/)
- [vscode-markdown-table (GitHub)](https://github.com/takumisoft68/vscode-markdown-table)
- [get-east-asian-width (npm)](https://github.com/sindresorhus/get-east-asian-width)
- [east-asian-width (npm)](https://www.npmjs.com/package/east-asian-width)
- [Stack Overflow: Japanese - Detecting Full-Width characters](https://stackoverflow.com/questions/37350425/japanese-detecting-full-width-characters)

---

## 参照

- [機能要件: REQ-EDT-003](02-functional-requirements.md#req-edt-003-テーブル編集機能--未実装)
- [実装ロードマップ: フェーズ1](10-implementation-roadmap.md)
