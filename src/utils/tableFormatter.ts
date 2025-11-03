/**
 * TR-001: Markdownテーブルの文字幅計算とアラインメント
 * 
 * このモジュールは、East Asian Width (EAW) プロパティに基づいて
 * Markdownテーブルをフォーマットする機能を提供します。
 * 
 * 参照: docs/requirements/09-technical-requirements.md#tr-001
 */

import { eastAsianWidth } from 'get-east-asian-width';

/**
 * 文字列の表示幅を計算する
 * TR-001に基づき、EAWプロパティに応じて幅を計算（N/Na/H=1, W/F=2, A=1）
 */
function calculateStringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined) {
      // ambiguousAsWide: false で TR-001要件（A=1）に準拠
      width += eastAsianWidth(codePoint, { ambiguousAsWide: false });
    }
  }
  return width;
}

/**
 * Markdownテーブルの行をパースする
 * 
 * @param line - テーブル行（例: "| 項目 | Value |"）
 * @returns セル内容の配列（前後の空白は削除）
 */
function parseTableRow(line: string): string[] {
  // 先頭と末尾の | を除去し、セルに分割
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return [];
  }
  
  // 先頭と末尾の | を除去してから分割
  const cells = trimmed.slice(1, -1).split('|');
  // 各セルの前後空白を削除
  return cells.map(cell => cell.trim());
}

/**
 * Markdownテーブル行をフォーマットする
 * 
 * @param cells - セル内容の配列
 * @param columnWidths - 各カラムの最大幅（EAW計算幅）
 * @returns フォーマットされたテーブル行
 */
function formatTableRow(cells: string[], columnWidths: number[]): string {
  const formattedCells = cells.map((cell, index) => {
    const cellWidth = calculateStringWidth(cell);
    const maxWidth = columnWidths[index] ?? 0;
    const padding = maxWidth - cellWidth;
    
    // セル内容の後にパディング用のスペースを追加
    return cell + (padding > 0 ? ' '.repeat(padding) : '');
  });
  
  return '| ' + formattedCells.join(' | ') + ' |';
}

/**
 * セパレーター行（|:---|:---:| など）をフォーマットする
 * 
 * @param originalSeparator - 元のセパレーター行
 * @param columnWidths - 各カラムの最大幅
 * @returns フォーマットされたセパレーター行
 */
function formatSeparatorRow(originalSeparator: string, columnWidths: number[]): string {
  const cells = parseTableRow(originalSeparator);
  
  // セパレーターの形式を保持（:---:, :---, ---: など）
  // vscode-markdown-tableと同様に、カラム幅に応じたハイフン数を使用
  const formattedCells = cells.map((cell, index) => {
    const maxWidth = columnWidths[index] ?? 0;
    // 既存のアラインメント記号を保持（なければ記号なし）
    const hasLeftAlign = cell.startsWith(':');
    const hasRightAlign = cell.endsWith(':');
    
    // vscode-markdown-tableと同様に、カラム幅に応じたハイフン数を使用
    // 最低3文字は維持（Markdownの仕様）
    const hyphenCount = Math.max(3, maxWidth);
    let separator = '-'.repeat(hyphenCount);
    
    // 既存のアラインメント記号がある場合のみ追加
    if (hasLeftAlign) separator = ':' + separator;
    if (hasRightAlign) separator = separator + ':';
    // アラインメント記号がない場合は記号なし（vscode-markdown-tableと同様）
    
    return separator;
  });
  
  // vscode-markdown-tableと同様に、セル前後にスペースを追加
  return '| ' + formattedCells.join(' | ') + ' |';
}

/**
 * Markdownテーブル文字列をフォーマットする
 * 
 * TR-001に基づき、EAWプロパティを使用してテーブルを桁揃えします。
 * 
 * @param tableMarkdown - フォーマット前のMarkdownテーブル文字列
 * @returns フォーマット後のMarkdownテーブル文字列
 * 
 * @example
 * ```typescript
 * const input = `| 項目 | Value |
 * | 日本語 | 100 |
 * | English | 200 |`;
 * 
 * const output = formatTable(input);
 * // => `| 項目    | Value |
 * //     | 日本語  | 100   |
 * //     | English | 200   |`
 * ```
 */
export function formatTable(tableMarkdown: string): string {
  const lines = tableMarkdown.split('\n').map(line => line.trimEnd());
  
  if (lines.length === 0) {
    return tableMarkdown;
  }
  
  // テーブル行とセパレーター行を分離
  const tableRows: string[] = [];
  let separatorRow: string | null = null;
  let separatorIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      continue; // 空行はスキップ
    }
    
    // セパレーター行の判定（|:---| や |---| など）
    if (/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(line)) {
      separatorRow = line;
      separatorIndex = tableRows.length; // テーブル行の中でのインデックス
    } else if (line.trim().startsWith('|')) {
      tableRows.push(line);
    }
  }
  
  if (tableRows.length === 0) {
    return tableMarkdown; // テーブル行がなければそのまま返す
  }
  
  // 各セルをパース
  const parsedRows = tableRows.map(parseTableRow);
  
  // セル数が一致するか確認
  const cellCount = parsedRows[0]?.length ?? 0;
  if (cellCount === 0) {
    return tableMarkdown;
  }
  
  // 全ての行が同じ数のセルを持っているか確認
  if (!parsedRows.every(row => row.length === cellCount)) {
    // セル数が一致しない場合はそのまま返す（不正なテーブル）
    return tableMarkdown;
  }
  
  // 各カラムの最大幅を計算
  const columnWidths: number[] = [];
  for (let col = 0; col < cellCount; col++) {
    let maxWidth = 0;
    for (const row of parsedRows) {
      const cellWidth = calculateStringWidth(row[col] ?? '');
      maxWidth = Math.max(maxWidth, cellWidth);
    }
    columnWidths.push(maxWidth);
  }
  
  // 各行をフォーマット
  const formattedRows = parsedRows.map(cells => formatTableRow(cells, columnWidths));
  
  // セパレーター行があればフォーマット、なければ生成
  let formattedSeparator: string;
  if (separatorRow) {
    formattedSeparator = formatSeparatorRow(separatorRow, columnWidths);
  } else {
    // セパレーター行がなければ生成（vscode-markdown-tableと同様に記号なし、スペース付き）
    formattedSeparator = '| ' + columnWidths.map(width => '-'.repeat(Math.max(3, width))).join(' | ') + ' |';
  }
  
  // 結果を組み立て
  const result: string[] = [];
  if (separatorIndex >= 0 && separatorIndex < formattedRows.length) {
    // セパレーター行がある場合、その位置に挿入
    result.push(...formattedRows.slice(0, separatorIndex));
    result.push(formattedSeparator);
    result.push(...formattedRows.slice(separatorIndex));
  } else {
    // セパレーター行がない、または位置が不正な場合（最初の行の後に挿入）
    result.push(formattedRows[0] ?? '');
    result.push(formattedSeparator);
    result.push(...formattedRows.slice(1));
  }
  
  return result.join('\n');
}

