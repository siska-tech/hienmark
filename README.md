# HienMark

> HienMark is a modern and powerful task editor that runs on your local file system.

**ローカルファースト タスク管理エディタ**

Markdownファイルをタスクとして扱い、YAML Front Matterによるタグベースの管理と、EChartsによる視覚的な分析を統合したタスク管理エディタです。

![HienMark Screenshot](docs/HienMark.png)

## 特徴

- 📝 **Markdown編集** - 1ファイル = 1タスクのシンプルな管理
- 🏷️ **強力なタグシステム** - 型付きタグによる高度なメタデータ管理
- 📊 **視覚的分析** - EChartsによるガントチャート、円グラフ、棒グラフなど
- 🔒 **ローカルファースト** - クラウド不要、完全オフライン動作
- ⚡ **高速・軽量** - Tauri採用で高速起動、低メモリ消費
- 🔐 **セキュア** - XSS対策、DOMPurify、Mermaid セキュリティレベル設定
- 🌍 **多言語対応** - 日本語、英語、ベトナム語をサポート
- 🎨 **カラーテーマ** - ダークモード/ライトモードの切り替え

## プロジェクトステータス

**バージョン:** 0.1.0
**完成度:** 78%（基本機能実装完了）

主要機能は実装済みで、実際に使用可能な状態です。詳細は[完成度評価レポート](docs/COMPLETENESS_EVALUATION.md)を参照してください。

## 技術スタック

- **フレームワーク:** Tauri 2.9.1
- **フロントエンド:** React 18.3 + Vite 6.4 + TypeScript 5.7
- **バックエンド:** Rust 1.90
- **エディタ:** CodeMirror 6
- **Markdownパーサー:** comrak 0.33
- **ダイアグラム:** ECharts 5.5 + mermaid.js 11.4
- **セキュリティ:** DOMPurify 3.2
- **国際化:** i18next 24.2

## セットアップ

### 必要な環境

- Node.js 20.x以上
- Rust 1.77以上
- Visual Studio Build Tools（Windows）/ Xcode（macOS）/ GCC（Linux）

### インストール

```bash
# リポジトリクローン
git clone https://github.com/yourusername/hienmark.git
cd hienmark

# 依存関係インストール
npm install

# 開発サーバー起動
npm run tauri dev
```

### ビルド

```bash
# 本番ビルド
npm run tauri build
```

生成されたバイナリは `src-tauri/target/release/` に出力されます。

## クイックスタート

### 1. ワークスペースを開く
初回起動時に、タスクファイルを保存するディレクトリを選択します。

### 2. タスクを作成
「新規タスク」ボタンで新しいMarkdownファイルを作成できます。テンプレートを選択して、事前定義されたタグを適用することも可能です。

### 3. タグを編集
右パネルのタグエディタで、タスクのメタデータ（ステータス、優先度、期限など）を設定します。タグは型付きで、適切な入力UIが自動生成されます。

### 4. Markdown編集
CodeMirror 6エディタで本文を編集します。Mermaidダイアグラムも記述可能で、リアルタイムでプレビューされます。

### 5. 分析ダッシュボード
「分析」タブで、タスク全体の進捗をガントチャートや円グラフで可視化できます。

### タスクファイル例

```markdown
---
status: in_progress
priority: high
due_date: 2025-11-15
start_date: 2025-11-01
assignee: developer
---

# HienMark v1.0リリース準備

## 概要
初回リリースに向けた最終調整とドキュメント整備を行う。

## タスク
- [x] バグ修正
- [x] ドキュメント作成
- [ ] パフォーマンステスト
- [ ] リリースノート作成

## 依存関係
```mermaid
graph LR
    A[バグ修正] --> B[テスト]
    B --> C[リリース]
```
```

## 主要機能

### ✅ 実装済み

- **タスクエディタ**
  - CodeMirror 6による高機能Markdown編集
  - リアルタイムプレビュー（分割表示）
  - Mermaidダイアグラムのレンダリング
  - 自動保存（3秒デバウンス）

- **タグシステム**
  - 型付きタグ（String, Number, Boolean, Date, Select, MultiSelect等）
  - タグテンプレート機能
  - タグ管理UI（リネーム、削除、統計）
  - ドラッグ&ドロップによる順序変更

- **分析ダッシュボード**
  - ガントチャート（依存関係表示付き）
  - 円グラフ（タグ値分布）
  - 棒グラフ（カテゴリ統計）
  - 折れ線グラフ（時系列分析）

- **その他**
  - ファイルウォッチャー（外部変更のリアルタイム検出）
  - 多言語対応（日本語/英語/ベトナム語）
  - カラーテーマ（ダーク/ライト）
  - レスポンシブUI

### 🚧 実装予定（優先度順）

1. タスクのソート・フィルタ機能
2. タグ逆引き機能
3. グラフのエクスポート機能（PNG/SVG）
4. パフォーマンス最適化

詳細は[実装状況](docs/IMPLEMENTATION_STATUS.md)を参照してください。

## ドキュメント

- **ユーザー向け**
  - [完成度評価レポート](docs/COMPLETENESS_EVALUATION.md) - プロジェクトの完成度と評価
  - [テンプレートクイックスタート](docs/guides/template-quick-start.md) - テンプレート機能の使い方

- **開発者向け**
  - [要件定義書](docs/requirements.md) - 日本語の詳細仕様
  - [実装状況](docs/IMPLEMENTATION_STATUS.md) - 現在の実装進捗
  - [開発ガイド](docs/DEVELOPMENT.md) - 開発環境のセットアップと貢献方法
  - [CLAUDE.md](CLAUDE.md) - AI開発支援用ガイド

## ライセンス

このプロジェクトは [MIT License](LICENSE) でライセンスされています。

Copyright (c) 2025 Shion Watanabe

## 貢献

Issue、Pull Requestを歓迎します。

大きな変更の場合は、まずIssueで議論してください。

## 謝辞

このプロジェクトは以下のOSSに支えられています：

- [Tauri](https://tauri.app/)
- [React](https://react.dev/)
- [comrak](https://github.com/kivikakk/comrak)
- [CodeMirror](https://codemirror.net/)
- [Mermaid](https://mermaid.js.org/)
