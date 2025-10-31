/**
 * Front Matterパース・シリアライズユーティリティ
 * Front Matterと本文の分離・結合を担当
 */

import type { FrontMatter } from '../types/task';

export interface ParsedContent {
  frontMatter: FrontMatter;
  body: string;
  tagOrder: string[];
}

/**
 * Markdownコンテンツを Front Matter と本文に分離
 */
export function parseMarkdownContent(content: string): ParsedContent {
  // 改行コードを正規化（\r\n → \n）
  const normalizedContent = content.replace(/\r\n/g, '\n');

  // Front Matterのパターン：
  // - 最初に --- で始まる
  // - Front Matter本体（非貪欲マッチ）
  // - --- で終わる
  // - その後1個以上の改行
  // - 残りの本文
  const frontMatterMatch = normalizedContent.match(/^---\n([\s\S]*?)\n---\n+([\s\S]*)$/);

  if (!frontMatterMatch) {
    // Front Matterが存在しない場合は、全体を本文として返す
    return {
      frontMatter: {},
      body: content,
      tagOrder: [],
    };
  }

  const frontMatterText = frontMatterMatch[1];
  const body = frontMatterMatch[2];

  const frontMatter: FrontMatter = {};
  const tagOrder: string[] = [];
  const lines = frontMatterText.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  lines.forEach((line, index) => {
    // 配列アイテム（`- item`形式）
    const arrayItemMatch = line.match(/^-\s+(.+)$/);
    if (arrayItemMatch && currentKey) {
      currentArray.push(arrayItemMatch[1]);
      // 次の行が配列アイテムでない場合、配列を確定
      const nextLine = lines[index + 1];
      if (!nextLine || !nextLine.match(/^-\s+/)) {
        frontMatter[currentKey] = currentArray;
        currentKey = null;
        currentArray = [];
      }
      return;
    }

    // 通常のキー:値形式
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      tagOrder.push(key);

      // 値が空の場合、次の行が配列アイテムかチェック
      if (value === '' || value.trim() === '') {
        const nextLine = lines[index + 1];
        if (nextLine && nextLine.match(/^-\s+/)) {
          currentKey = key;
          currentArray = [];
          return;
        }
      }

      // インライン配列の場合 [item1, item2]
      if (value.startsWith('[') && value.endsWith(']')) {
        frontMatter[key] = value.slice(1, -1).split(',').map((v) => v.trim());
      } else if (value === 'null') {
        frontMatter[key] = null;
      } else if (value === 'true' || value === 'false') {
        frontMatter[key] = value === 'true';
      } else {
        // 数値の場合
        const numValue = Number(value);
        if (!isNaN(numValue) && value.trim() === String(numValue)) {
          frontMatter[key] = numValue;
        } else {
          frontMatter[key] = value;
        }
      }
    }
  });

  return {
    frontMatter,
    body,
    tagOrder,
  };
}

/**
 * Front Matterオブジェクトを YAML文字列に変換
 */
export function serializeFrontMatter(frontMatter: FrontMatter, tagOrder?: string[]): string {
  const keys = tagOrder || Object.keys(frontMatter);

  if (keys.length === 0) {
    return '';
  }

  const lines = keys
    .filter(key => frontMatter[key] !== undefined)
    .map(key => {
      const value = frontMatter[key];
      if (Array.isArray(value)) {
        return `${key}: [${value.join(', ')}]`;
      }
      if (value === null) {
        return `${key}: null`;
      }
      return `${key}: ${value}`;
    });

  return lines.join('\n');
}

/**
 * Front MatterとBodyを結合してMarkdownコンテンツを生成
 */
export function combineMarkdownContent(frontMatter: FrontMatter, body: string, tagOrder?: string[]): string {
  const fmText = serializeFrontMatter(frontMatter, tagOrder);

  if (fmText === '') {
    // Front Matterが空の場合は本文のみ
    return body;
  }

  return `---\n${fmText}\n---\n\n${body}`;
}
