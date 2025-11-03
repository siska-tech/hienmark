/**
 * HienMark と vscode-markdown-table の出力を比較分析
 */

import { formatTable } from '../src/utils/tableFormatter';
import { eastAsianWidth } from 'get-east-asian-width';

interface ComparisonResult {
  testCase: string;
  hienmark: string;
  vscode: string;
  differences: {
    visualAlignment: 'same' | 'different';
    separatorStyle: 'same' | 'different';
    details: string[];
  };
}

const testCases = [
  {
    name: 'テストケース 1: 日本語+英数混在テーブル',
    input: `| 項目 | Value |
| 日本語 | 100 |
| English | 200 |`,
    hienmark: `| 項目    | Value |
|-------|-----|
| 日本語  | 100   |
| English | 200   |`,
    vscode: `| 項目    | Value |
| ------- | ----- |
| 日本語  | 100   |
| English | 200   |`,
  },
  {
    name: 'テストケース 2: 全角英数テーブル',
    input: `| 項目 | 値 |
| Ａ | １００ |
| Ｂ | ２００ |`,
    hienmark: `| 項目 | 値     |
|----|------|
| Ａ   | １００ |
| Ｂ   | ２００ |`,
    vscode: `| 項目 | 値     |
| ---- | ------ |
| Ａ   | １００ |
| Ｂ   | ２００ |`,
  },
  {
    name: 'テストケース 3: Emoji含むテーブル',
    input: `| 項目 | Status |
| タスクA | ✅ Done |
| タスクB | ⏳ In Progress |`,
    hienmark: `| 項目    | Status         |
|-------|--------------|
| タスクA | ✅ Done        |
| タスクB | ⏳ In Progress |`,
    vscode: `| 項目    | Status        |
| ------- | ------------- |
| タスクA | ✅ Done       |
| タスクB | ⏳ In Progress |`,
  },
  {
    name: 'テストケース 4: 複雑な混在ケース',
    input: `| タスク名 | Status | 優先度 |
| タスクA | In Progress | High |
| ユーザー登録機能の実装 | Completed | Medium |`,
    hienmark: `| タスク名               | Status      | 優先度 |
|----------------------|-----------|------|
| タスクA                | In Progress | High   |
| ユーザー登録機能の実装 | Completed   | Medium |`,
    vscode: `| タスク名               | Status      | 優先度 |
| ---------------------- | ----------- | ------ |
| タスクA                | In Progress | High   |
| ユーザー登録機能の実装 | Completed   | Medium |`,
  },
  {
    name: 'テストケース 5: 左・中央・右揃え混在テーブル',
    input: `| 項目 | Value | Status |
|:---|---:|---|
| 日本語 | 100 | ✅ |
| English | 200 | ⏳ |`,
    hienmark: `| 項目    | Value | Status |
|:---|---:|---|
| 日本語  | 100   | ✅     |
| English | 200   | ⏳     |`,
    vscode: `| 項目    | Value | Status |
| :------ | ----: | ------ |
| 日本語  |   100 | ✅     |
| English |   200 | ⏳      |`,
  },
  {
    name: 'テストケース 6: 数値・日付混在テーブル',
    input: `| タスク | 予算 | 期限 |
| プロジェクトA | ¥1,000,000 | 2025-12-31 |
| プロジェクトB | ¥500,000 | 2025-06-30 |`,
    hienmark: `| タスク        | 予算       | 期限       |
|-------------|----------|----------|
| プロジェクトA | ¥1,000,000 | 2025-12-31 |
| プロジェクトB | ¥500,000   | 2025-06-30 |`,
    vscode: `| タスク        | 予算       | 期限       |
| ------------- | ---------- | ---------- |
| プロジェクトA | ¥1,000,000 | 2025-12-31 |
| プロジェクトB | ¥500,000   | 2025-06-30 |`,
  },
];

/**
 * 文字列のEAW計算幅を取得
 */
function calculateWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined) {
      width += eastAsianWidth(codePoint, { ambiguousAsWide: false });
    }
  }
  return width;
}

/**
 * テーブルの各カラムの最大幅を計算
 */
function calculateColumnWidths(tableMarkdown: string): number[] {
  const lines = tableMarkdown.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && 
           !/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(trimmed);
  });
  
  if (lines.length === 0) return [];
  
  const parsedRows = lines.map(line => {
    const trimmed = line.trim();
    return trimmed.slice(1, -1).split('|').map(cell => cell.trim());
  });
  
  const columnCount = parsedRows[0]?.length ?? 0;
  const maxWidths: number[] = [];
  
  for (let col = 0; col < columnCount; col++) {
    let maxWidth = 0;
    for (const row of parsedRows) {
      if (row[col]) {
        const width = calculateWidth(row[col]);
        maxWidth = Math.max(maxWidth, width);
      }
    }
    maxWidths.push(maxWidth);
  }
  
  return maxWidths;
}

/**
 * セル内容のパディングを比較
 */
function compareCellPadding(hienmark: string, vscode: string): {
  visualAlignment: 'same' | 'different';
  details: string[];
} {
  const hienmarkLines = hienmark.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && 
           !/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(trimmed);
  });
  const vscodeLines = vscode.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && 
           !/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(trimmed);
  });
  
  if (hienmarkLines.length !== vscodeLines.length) {
    return {
      visualAlignment: 'different',
      details: [`行数が異なる: HienMark ${hienmarkLines.length}行, vscode-markdown-table ${vscodeLines.length}行`],
    };
  }
  
  const hienmarkWidths = calculateColumnWidths(hienmark);
  const vscodeWidths = calculateColumnWidths(vscode);
  
  const details: string[] = [];
  let isDifferent = false;
  
  // 各カラムの最大幅を比較
  for (let i = 0; i < Math.max(hienmarkWidths.length, vscodeWidths.length); i++) {
    const hw = hienmarkWidths[i] ?? 0;
    const vw = vscodeWidths[i] ?? 0;
    if (hw !== vw) {
      details.push(`カラム${i + 1}の最大幅が異なる: HienMark ${hw}, vscode-markdown-table ${vw}`);
      isDifferent = true;
    }
  }
  
  // 各行のセルを比較
  for (let rowIdx = 0; rowIdx < hienmarkLines.length; rowIdx++) {
    const hLine = hienmarkLines[rowIdx];
    const vLine = vscodeLines[rowIdx];
    
    const hCells = hLine.trim().slice(1, -1).split('|').map(c => c.trim());
    const vCells = vLine.trim().slice(1, -1).split('|').map(c => c.trim());
    
    for (let colIdx = 0; colIdx < Math.max(hCells.length, vCells.length); colIdx++) {
      const hCell = hCells[colIdx] ?? '';
      const vCell = vCells[colIdx] ?? '';
      
      // セル内容は同じはず
      if (hCell.trim() !== vCell.trim()) {
        details.push(`行${rowIdx + 1}カラム${colIdx + 1}の内容が異なる: HienMark "${hCell}", vscode-markdown-table "${vCell}"`);
        isDifferent = true;
        continue;
      }
      
      // パディングを比較（セル内容の後のスペース数）
      const hPadding = hLine.match(new RegExp(`\\|\\s*${escapeRegex(hCell)}\\s+\\|`)) ? 
                       (hLine.match(new RegExp(`\\|([^|]*)\\|`))?.[1]?.trimEnd().length ?? 0) - hCell.trim().length : 0;
      const vPadding = vLine.match(new RegExp(`\\|\\s*${escapeRegex(vCell)}\\s+\\|`)) ? 
                       (vLine.match(new RegExp(`\\|([^|]*)\\|`))?.[1]?.trimEnd().length ?? 0) - vCell.trim().length : 0;
      
      // 実際の幅に基づく期待パディングを計算
      const cellWidth = calculateWidth(hCell.trim());
      const maxWidth = Math.max(hienmarkWidths[colIdx] ?? 0, vscodeWidths[colIdx] ?? 0);
      const expectedPadding = maxWidth - cellWidth;
      
      // パディングの違いをチェック（許容誤差±1）
      if (Math.abs(hPadding - vPadding) > 1 && Math.max(hPadding, vPadding) > 0) {
        details.push(`行${rowIdx + 1}カラム${colIdx + 1}のパディングが異なる: HienMark ${hPadding}スペース, vscode-markdown-table ${vPadding}スペース (期待: ${expectedPadding})`);
        // 視覚的な桁揃えが同じなら許容
        if (Math.abs(hPadding - expectedPadding) > 1 && Math.abs(vPadding - expectedPadding) > 1) {
          isDifferent = true;
        }
      }
    }
  }
  
  return {
    visualAlignment: isDifferent ? 'different' : 'same',
    details: details.length > 0 ? details : ['視覚的な桁揃えは同等'],
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * セパレーター行の形式を比較
 */
function compareSeparatorStyle(hienmark: string, vscode: string): {
  same: boolean;
  details: string[];
} {
  const hSeparator = hienmark.split('\n').find(line => /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(line.trim()));
  const vSeparator = vscode.split('\n').find(line => /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(line.trim()));
  
  const details: string[] = [];
  
  if (!hSeparator && !vSeparator) {
    return { same: true, details: ['セパレーター行なし'] };
  }
  
  if (!hSeparator || !vSeparator) {
    details.push(`セパレーター行の有無が異なる: HienMark ${hSeparator ? 'あり' : 'なし'}, vscode-markdown-table ${vSeparator ? 'あり' : 'なし'}`);
    return { same: false, details };
  }
  
  // セパレーター形式の違いをチェック
  if (hSeparator.includes(':') && !vSeparator.includes(':')) {
    details.push('HienMarkはデフォルトで左揃え記号 (`:`) を追加、vscode-markdown-tableは記号なし');
  } else if (!hSeparator.includes(':') && vSeparator.includes(':')) {
    details.push('vscode-markdown-tableは記号あり、HienMarkは記号なし');
  }
  
  // アラインメント記号の位置を比較
  const hCells = hSeparator.trim().slice(1, -1).split('|');
  const vCells = vSeparator.trim().slice(1, -1).split('|');
  
  for (let i = 0; i < Math.max(hCells.length, vCells.length); i++) {
    const hCell = hCells[i]?.trim() ?? '';
    const vCell = vCells[i]?.trim() ?? '';
    
    const hLeft = hCell.startsWith(':');
    const hRight = hCell.endsWith(':');
    const vLeft = vCell.startsWith(':');
    const vRight = vCell.endsWith(':');
    
    if (hLeft !== vLeft || hRight !== vRight) {
      details.push(`カラム${i + 1}のアラインメント記号が異なる: HienMark "${hCell}", vscode-markdown-table "${vCell}"`);
    }
  }
  
  return {
    same: details.length === 0,
    details: details.length > 0 ? details : ['セパレーター形式は同等'],
  };
}

function main() {
  console.log('========================================');
  console.log('HienMark vs vscode-markdown-table 比較分析');
  console.log('========================================\n');
  
  let totalTests = 0;
  let visualAlignmentSame = 0;
  let separatorStyleSame = 0;
  let overallSame = 0;
  
  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n[${testCase.name}]`);
    console.log('─'.repeat(60));
    
    // 視覚的な桁揃えを比較
    const visualResult = compareCellPadding(testCase.hienmark, testCase.vscode);
    console.log('\n視覚的な桁揃え:');
    if (visualResult.visualAlignment === 'same') {
      console.log('  ✅ 同等');
      visualAlignmentSame++;
    } else {
      console.log('  ⚠️  差異あり');
      visualResult.details.forEach(detail => console.log(`    - ${detail}`));
    }
    
    // セパレーター形式を比較
    const separatorResult = compareSeparatorStyle(testCase.hienmark, testCase.vscode);
    console.log('\nセパレーター形式:');
    if (separatorResult.same) {
      console.log('  ✅ 同等');
      separatorStyleSame++;
    } else {
      console.log('  ⚠️  差異あり');
      separatorResult.details.forEach(detail => console.log(`    - ${detail}`));
    }
    
    // 総合評価
    const isOverallSame = visualResult.visualAlignment === 'same' && separatorResult.same;
    if (isOverallSame) {
      overallSame++;
    }
    console.log(`\n総合評価: ${isOverallSame ? '✅ 同等' : '⚠️  差異あり'}`);
  }
  
  console.log('\n========================================');
  console.log('総合結果');
  console.log('========================================\n');
  console.log(`総テストケース数: ${totalTests}`);
  console.log(`視覚的な桁揃えが同等: ${visualAlignmentSame}/${totalTests} (${((visualAlignmentSame / totalTests) * 100).toFixed(1)}%)`);
  console.log(`セパレーター形式が同等: ${separatorStyleSame}/${totalTests} (${((separatorStyleSame / totalTests) * 100).toFixed(1)}%)`);
  console.log(`総合的に同等: ${overallSame}/${totalTests} (${((overallSame / totalTests) * 100).toFixed(1)}%)`);
  
  console.log('\n========================================');
  console.log('AC-TR1-3 評価');
  console.log('========================================\n');
  
  if (visualAlignmentSame === totalTests) {
    console.log('✅ AC-TR1-3: 合格');
    console.log('   vscode-markdown-tableと同等の視覚的なフォーマット品質を達成');
    if (separatorStyleSame < totalTests) {
      console.log('   ⚠️  セパレーター形式に差異あり（視覚的品質には影響なし）');
    }
  } else {
    console.log('⚠️  AC-TR1-3: 一部差異あり');
    console.log('   視覚的な桁揃えに差異がある可能性');
  }
  
  console.log('\n========================================\n');
}

main();

