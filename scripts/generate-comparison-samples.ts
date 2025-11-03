/**
 * vscode-markdown-table比較検証用のMarkdownサンプルファイルを生成
 */

import { formatTable } from '../src/utils/tableFormatter';
import { writeFileSync } from 'fs';

interface TestCase {
  name: string;
  input: string;
}

const testCases: TestCase[] = [
  {
    name: '日本語+英数混在テーブル',
    input: `| 項目 | Value |
| 日本語 | 100 |
| English | 200 |`,
  },
  {
    name: '全角英数テーブル',
    input: `| 項目 | 値 |
| Ａ | １００ |
| Ｂ | ２００ |`,
  },
  {
    name: 'Emoji含むテーブル',
    input: `| 項目 | Status |
| タスクA | ✅ Done |
| タスクB | ⏳ In Progress |`,
  },
  {
    name: '複雑な混在ケース',
    input: `| タスク名 | Status | 優先度 |
| タスクA | In Progress | High |
| ユーザー登録機能の実装 | Completed | Medium |`,
  },
  {
    name: '左・中央・右揃え混在テーブル',
    input: `| 項目 | Value | Status |
|:---|---:|---|
| 日本語 | 100 | ✅ |
| English | 200 | ⏳ |`,
  },
  {
    name: '数値・日付混在テーブル',
    input: `| タスク | 予算 | 期限 |
| プロジェクトA | ¥1,000,000 | 2025-12-31 |
| プロジェクトB | ¥500,000 | 2025-06-30 |`,
  },
];

function main() {
  let output = '# HienMark フォーマット結果サンプル\n\n';
  output += '**生成日:** 2025-11-05\n';
  output += '**目的:** vscode-markdown-tableとの比較検証用\n\n';
  output += '---\n\n';

  testCases.forEach((tc, i) => {
    output += `## テストケース ${i + 1}: ${tc.name}\n\n`;
    output += '### フォーマット前\n\n';
    output += '```markdown\n';
    output += tc.input;
    output += '\n```\n\n';
    output += '### HienMark フォーマット後\n\n';
    output += '```markdown\n';
    output += formatTable(tc.input);
    output += '\n```\n\n';
    output += '---\n\n';
  });

  // ファイルに書き出し
  const filePath = 'docs/devlog/hienmark-format-samples.md';
  writeFileSync(filePath, output, 'utf-8');
  console.log(`✅ サンプルファイルを生成しました: ${filePath}`);
  console.log(`   テストケース数: ${testCases.length}`);
}

main();

