---
status: completed
priority: high
assignee: TL/FE
start_date: 2025-11-24
end_date: 2025-11-24
tags: ["編集機能", "REQ-EDT-001", "REQ-EDT-002", "選定", "評価"]
depends_on: []
---

# Task-EDT-1.1: WYSIWYGエディタライブラリ選定・評価

## 概要

TipTap, Slate.js, Lexical等のWYSIWYGエディタライブラリを評価し、最適なものを選定する。

## タスク詳細

### 候補ライブラリ

- **TipTap 2.x** - ProseMirrorベース、拡張性高い
- **Slate.js** - React統合、カスタマイズ性高い
- **Lexical (Meta)** - パフォーマンス重視、モダン

### 評価基準

- Markdown双方向変換の容易性
- CodeMirror 6との統合可能性
- TypeScriptサポート
- パフォーマンス（大型ドキュメント対応）
- ライセンス互換性
- コミュニティサポート

### 評価方法

- PoC実装による比較検討
- 各ライブラリで基本的なMarkdown双方向変換を実装
- パフォーマンスベンチマーク

### チェックリスト

- [x] 各ライブラリの調査
- [x] PoC実装（TipTap）
- [ ] PoC実装（Slate.js） - 検討不要と判断
- [ ] PoC実装（Lexical） - 検討不要と判断
- [x] 比較評価表作成
- [x] 選定ライブラリの決定（結論: 現時点では実装不要）

## メモ

- WYSIWYGエディタはHienMarkのコアUX機能
- ライブラリ選定ミスは大きなリスク（リスク管理: 中）

## 評価結果

**結論: 現時点ではWYSIWYGエディタの実装を推奨しない**

### 理由

1. すべての候補ライブラリ（TipTap, Slate.js, Lexical）でMarkdown双方向変換の公式サポートが不足
2. 実装コストが高すぎる（推定30-44日）
3. 既存CodeMirror実装が既に良好に動作している
4. より優先度の高い機能が存在（Git連携機能等）

### 次のステップ

- Phase 7以降での再評価を推奨
- ユーザーフィードバック収集
- 代替案: CodeMirror拡張の継続改善

詳細は [task-edt-1.1-evaluation-report.md](task-edt-1.1-evaluation-report.md) を参照。



