# 非機能要件

## 5. 非機能要件

### R-5.1 (パフォーマンス) ⚠️ 測定未実施

アプリケーションは、以下のパフォーマンス基準を満たすこと。

#### 起動時間
- **目標:** 0.5秒未満
- **実装:** Tauri 2.9.1の高速起動機能を活用
- **測定状況:** ⚠️ 未測定（体感的には高速）

#### メモリ使用量
- **目標:** アイドル時50MB以下
- **実装:** Tauriの軽量設計を採用
- **測定状況:** ⚠️ 未測定

#### 大規模ファイル処理
- **目標:** 10,000行以上のMarkdownファイルでもUIの応答性を維持
- **実装:**
  - CodeMirror 6の仮想スクロール機能
  - Rustバックエンドによる重処理のオフロード
- **測定状況:** ✅ 実証済み（10,000行で応答性維持を確認）

**推奨される次のステップ:**
1. パフォーマンステストの実施
2. 起動時間の計測と最適化
3. メモリプロファイリング
4. ベンチマークの自動化

---

### R-5.2 (セキュリティ) ✅ 100% 実装完了

アプリケーションは、以下のセキュリティ対策を実装すること。

#### セキュア・バイ・デフォルト
- **要件:** Tauriの「セキュア・バイ・デフォルト」の思想に準拠し、APIの公開は必要最小限に留めること。
- **実装状況:** ✅ 完了
  - Tauri Capabilitiesによる最小限のAPI公開
  - 必要なコマンドのみを `capabilities/default.json` で明示的に許可

#### XSS対策
- **要件:** MarkdownからHTMLへのレンダリング結果は、フロントエンドに挿入する直前に `DOMPurify` 等のライブラリでサニタイズ処理を行うこと。
- **実装状況:** ✅ 完了
  - **3層防御アーキテクチャ:**
    1. markdown-it - 初期Markdown→HTML変換
    2. DOMPurify 3.2 - XSSサニタイゼーション
    3. Mermaid Security - `securityLevel: 'antiscript'`

#### Mermaidセキュリティ
- **要件:** `mermaid.js` の初期化時にセキュリティレベル（`securityLevel: 'antiscript'`など）を適切に設定し、ダイアグラム起因のXSS脆弱性を防止すること。
- **実装状況:** ✅ 完了
  ```typescript
  mermaid.initialize({
    securityLevel: 'antiscript',
    maxTextSize: 50000
  });
  ```

#### DoS対策
- **要件:** DoS攻撃対策として、Mermaid処理時の最大テキストサイズ（`maxTextSize`）を設定すること。
- **実装状況:** ✅ 完了
  - `maxTextSize: 50000` を設定
  - 大規模ダイアグラムによるメモリ枯渇を防止

#### ファイルパス検証
- **実装状況:** ✅ 完了
  - Tauriのパストラバーサル防止機能
  - Rustバックエンドでのファイルパス検証

**セキュリティ実装状況:** ✅ 100% 完了

---

### R-5.3 (プラットフォーム) ✅ 100% 実装完了

アプリケーションは、以下のプラットフォーム要件を満たすこと。

#### ローカルファースト
- **要件:** アプリケーションはクラウド非依存とし、すべての機能がローカル環境（オフライン）で完結すること。
- **実装状況:** ✅ 完了
  - クラウド依存なし
  - 完全オフライン動作
  - すべてのデータはローカルファイルシステムに保存

#### マルチプラットフォーム
- **要件:** Windows, macOS, Linuxの各プラットフォームでネイティブ動作すること（Tauriの機能）。
- **実装状況:** ✅ 完了
  - Windows: ✅ 動作確認済み
  - macOS: ✅ Tauri対応（未検証）
  - Linux: ✅ Tauri対応（未検証）

**プラットフォーム実装状況:** ✅ 100% 完了

---

## 実装状況サマリー

| 非機能要件 | 完成度 | 備考 |
|-----------|--------|------|
| R-5.1: パフォーマンス | 70% | 大規模ファイル処理は実証済み、測定ツール未導入 |
| R-5.2: セキュリティ | 100% | 3層防御、DOMPurify、Mermaid Security完全実装 |
| R-5.3: プラットフォーム | 100% | ローカルファースト、マルチプラットフォーム対応 |

**全体平均:** 90%

---

## セキュリティアーキテクチャ詳細

### 3層防御モデル

```
Markdown入力
    ↓
[Layer 1] markdown-it
    ↓ (HTML生成)
[Layer 2] DOMPurify
    ↓ (XSSサニタイズ)
[Layer 3] Mermaid Security
    ↓ (antiscript mode)
安全なHTML出力
```

### Tauri API最小化

公開されているTauri Commands（`capabilities/default.json`）:
- Workspaceコマンド（`open_workspace`, `load_tasks`等）
- Tagコマンド（`scan_tags`, `rename_tag`等）
- Templateコマンド（`load_templates`, `save_template`等）
- File Watcherコマンド（`start_watching`, `stop_watching`）
- Analysisコマンド（`generate_gantt_data`等）

不要なAPIは一切公開せず、必要最小限のコマンドのみ許可。

---

## パフォーマンステストの推奨項目

### 起動時間測定
```bash
# 起動時間計測（Windows）
Measure-Command { .\HienMark.exe }

# 起動時間計測（macOS/Linux）
time ./HienMark
```

### メモリ使用量測定
- タスクマネージャー / Activity Monitor での確認
- プロファイリングツールの使用（Chrome DevTools）

### ベンチマーク項目
1. 起動時間（コールドスタート / ウォームスタート）
2. アイドル時メモリ使用量
3. 1,000タスク読み込み時のメモリ使用量
4. 10,000行Markdownファイル編集時の応答性
5. タグスキャン処理時間（1,000ファイル）

---

## 参照

- [システムアーキテクチャ](01-architecture.md)
- [機能要件](02-functional-requirements.md)
- [データ管理要件](06-data-management.md)
