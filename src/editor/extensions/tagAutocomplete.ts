/**
 * タグオートコンプリート拡張
 * Front Matter内でタグのキーと値を自動補完する
 */

import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { TagIndex } from '../../types/task';

/**
 * タグオートコンプリート拡張を作成
 * @param getTagIndex - タグインデックスを取得する関数
 * @returns CodeMirror拡張
 */
export function tagAutocomplete(getTagIndex: () => TagIndex | null) {
  return autocompletion({
    override: [
      async (context: CompletionContext): Promise<CompletionResult | null> => {
        // Front Matter内かどうかをチェック
        if (!isInFrontMatter(context)) {
          return null;
        }

        // カーソル位置の行を取得
        const line = context.state.doc.lineAt(context.pos);
        const textBefore = line.text.slice(0, context.pos - line.from);

        // キー: の後に値を補完する場合
        const keyMatch = textBefore.match(/^(\w+):\s*(\w*)$/);
        if (keyMatch) {
          const category = keyMatch[1];
          const partial = keyMatch[2];

          // タグインデックスから候補を取得
          const tagIndex = getTagIndex();
          if (!tagIndex) return null;

          const categoryData = tagIndex.categories[category];
          if (categoryData) {
            const options = Object.keys(categoryData.values)
              .filter(v => v.toLowerCase().startsWith(partial.toLowerCase()))
              .map(value => ({
                label: value,
                type: 'keyword',
                info: `使用回数: ${categoryData.values[value]}`,
              }));

            if (options.length > 0) {
              return {
                from: context.pos - partial.length,
                options,
              };
            }
          }
        }

        // キーを補完する場合（行の先頭）
        const keyOnlyMatch = textBefore.match(/^(\w*)$/);
        if (keyOnlyMatch) {
          const partial = keyOnlyMatch[1];
          const tagIndex = getTagIndex();
          if (!tagIndex) return null;

          const options = Object.keys(tagIndex.categories)
            .filter(k => k.toLowerCase().startsWith(partial.toLowerCase()))
            .map(key => ({
              label: key,
              type: 'variable',
              info: `${tagIndex.categories[key].taskIds.length}個のタスクで使用`,
              apply: `${key}: `,
            }));

          if (options.length > 0) {
            return {
              from: context.pos - partial.length,
              options,
            };
          }
        }

        return null;
      },
    ],
  });
}

/**
 * カーソルがFront Matter内にあるかチェック
 * @param context - 補完コンテキスト
 * @returns Front Matter内ならtrue
 */
function isInFrontMatter(context: CompletionContext): boolean {
  const doc = context.state.doc;
  const text = doc.toString();

  // Front Matter範囲を検出 (先頭の --- ... --- 間)
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return false;

  const fmEnd = match[0].length;
  return context.pos >= 4 && context.pos < fmEnd; // "---\n" の後から終了の "---" の前まで
}
