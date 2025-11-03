# HienMark ドキュメント

このディレクトリには、HienMarkプロジェクトの各種ドキュメントが含まれています。

## 📚 ドキュメント一覧

### ユーザー向けドキュメント

#### 使い方ガイド
- **[ワークスペース管理ガイド](guides/workspace-management.md)** - ワークスペースの基本操作と設定
- **[タグ管理機能ガイド](guides/tag-management.md)** - タグの管理、リネーム、削除、設定
- **[タグテンプレート機能](guides/tag-templates.md)** - タグテンプレート機能の使い方と詳細仕様
- **[分析ダッシュボードガイド](guides/analysis-dashboard.md)** - タスクデータの可視化と分析機能

### 開発者向けドキュメント

#### 要件・仕様
- **[要件定義書](requirements/README.md)** - プロジェクトの詳細な要件定義（日本語）
  - [システムアーキテクチャ](requirements/01-architecture.md)
  - [機能要件](requirements/02-functional-requirements.md)
  - [UI/UX要件](requirements/03-ui-ux-requirements.md)
  - [高度な機能](requirements/04-advanced-features.md)
  - [非機能要件](requirements/05-non-functional-requirements.md)
  - [データ管理要件](requirements/06-data-management.md)
  - [設計原則](requirements/07-design-principles.md)

#### 開発ログ
- **[開発記録インデックス](devlog/README.md)** - Phase別開発記録と開発ガイド
- **[簡潔な開発ログ](devlog/DEVLOG.md)** - 日次開発ログの簡潔版

## 📋 実装フェーズ

### Phase 1: Foundation（基盤構築）✅ 100%
- Tauri + React + TypeScript環境構築
- Rustバックエンド基盤実装
- データモデル・パースエンジン実装
- セキュリティ基盤（XSS対策）

### Phase 2: Core Features（コア機能）✅ 100%
- ワークスペース管理
- タスクエディタ（CodeMirror 6 + Markdown + Mermaid）
- タスクCRUD操作
- ファイル監視機能（リアルタイム更新）
- 自動保存機能

### Phase 3: Tag System（タグシステム）✅ 100%
- タグ解析・集約
- タグ選択UI（オートコンプリート）
- タグ管理機能
- タグリネーム・削除機能
- タグ設定システム
- タグテンプレート機能
- UIリサイザー機能

### Phase 4: Analysis Dashboard（分析ダッシュボード）✅ 100%
- ECharts統合（ガントチャート、パイチャート、バーチャート、折れ線グラフ）
- 依存関係の循環検出
- 日付範囲フィルター
- タスク詳細モーダル
- インタラクティブなチャート表示

### Additional Features（追加機能）
- ✅ 国際化（i18n）- 日本語/英語/ベトナム語サポート
- ✅ カラーテーマ - ダーク/ライトモード
- ✅ レスポンシブUI
- ✅ タスク並べ替え・フィルタ機能
- ✅ グラフエクスポート機能（PNG/SVG）
- ✅ タグ逆引き機能
- ✅ タグ管理の検索・フィルタ機能
- ✅ フィルター/ソート機能とタグ属性システムの連携

## 📖 開発ログ

詳細な開発記録は [devlog/](devlog/) ディレクトリを参照してください：

- **[開発記録インデックス](devlog/README.md)** - Phase別開発記録と開発コマンド
- [Phase 1: Foundation](devlog/phase1-foundation.md)
- [Phase 2: Core Features](devlog/phase2-core-features.md)
- [Phase 3: Tag System](devlog/phase3-tag-system.md)
- [Phase 4: Analysis Dashboard](devlog/phase4-analysis-dashboard.md)
- [簡潔な開発ログ](devlog/DEVLOG.md) - 日次開発ログの簡潔版

## 🎯 プロジェクトステータス

**バージョン:** 0.2.0  
**完成度:** 97%（実用レベル達成）  
**最終更新:** 2025-10-31

### 主要な成果

Phase 1-4の実装により、HienMarkは実用的なタスク管理ツールとして機能しています：

- ✅ **完全なタスク管理機能** - CRUD操作、ファイル監視、自動保存
- ✅ **強力なタグシステム** - 型付きタグ、テンプレート、オートコンプリート
- ✅ **ECharts分析ダッシュボード** - 4種類のチャート、依存関係分析
- ✅ **国際化対応** - 日本語・英語・ベトナム語
- ✅ **セキュリティ** - XSS対策、DOMPurify統合
- ✅ **パフォーマンス** - Tauriベースの高速・軽量アプリ

### 最近実装完了

以下の機能が実装完了しました：

- ✅ タスク並べ替え・フィルタ機能
- ✅ タグ逆引き機能
- ✅ タグ管理の検索・フィルタ機能
- ✅ グラフエクスポート機能（PNG/SVG）
- ✅ フィルター/ソート機能とタグ属性システムの連携

### 今後の予定

以下の機能は優先度低として実装予定：

- データエクスポート機能（CSV/JSON）
- 高度なタグ属性タイプ（Currency, Image, Hyperlink）のUI実装

## 🤝 貢献

貢献方法については、リポジトリルートの [CONTRIBUTING.md](../CONTRIBUTING.md) を参照してください。

## 📄 ライセンス

MIT License - 詳細は [LICENSE](../LICENSE) を参照してください。
