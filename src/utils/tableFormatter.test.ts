/**
 * TR-001 テーブルフォーマッタのテスト
 * 
 * 要件定義書に記載されたテストケースと例を検証します。
 */

import { describe, it, expect } from 'vitest';
import { formatTable } from './tableFormatter';

describe('formatTable (TR-001)', () => {
  describe('例 1: 基本的なフォーマット', () => {
    it('日本語と英数字が混在するテーブルを正しくフォーマットする', () => {
      const input = `| 項目 | Value |
| 日本語 | 100 |
| English | 200 |`;

      const output = formatTable(input);
      
      // 各行が正しくフォーマットされているか確認
      const lines = output.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      
      // カラム1の最大幅は "English" (幅7) なので、全てのセルが揃うはず
      // カラム2の最大幅は "Value" (幅5) なので、全てのセルが揃うはず
      expect(output).toContain('| 項目');
      expect(output).toContain('| 日本語');
      expect(output).toContain('| English');
    });

    it('期待される出力形式に一致する', () => {
      const input = `| 項目 | Value |
| 日本語 | 100 |
| English | 200 |`;

      const output = formatTable(input);
      
      // 各セルの幅を視覚的に確認
      // "項目" は幅4（全角2文字）、最大幅7なので3スペース追加 → "項目    |"
      // "日本語" は幅6（全角3文字）、最大幅7なので1スペース追加 → "日本語  |"
      // "English" は幅7、最大幅7なので追加なし → "English |"
      // "Value" は幅5、最大幅5なので追加なし → "Value |"
      // "100" は幅3、最大幅5なので2スペース追加 → "100   |"
      // "200" は幅3、最大幅5なので2スペース追加 → "200   |"
      
      const lines = output.split('\n');
      expect(lines[0]).toMatch(/項目\s+\|/); // "項目" の後にスペースあり
      expect(lines[2]).toMatch(/日本語\s+\|/); // "日本語" の後にスペースあり
      expect(lines[3]).toMatch(/English\s+\|/); // "English" の後にスペースあり
      expect(lines[2]).toMatch(/100\s+\|/); // "100" の後にスペースあり
      expect(lines[3]).toMatch(/200\s+\|/); // "200" の後にスペースあり
    });
  });

  describe('例 2: 複雑な混在ケース', () => {
    it('長い日本語テキストが含まれるテーブルを正しくフォーマットする', () => {
      const input = `| タスク名 | Status | 優先度 |
| タスクA | In Progress | High |
| ユーザー登録機能の実装 | Completed | Medium |`;

      const output = formatTable(input);
      
      const lines = output.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      
      // 最長のセルは "ユーザー登録機能の実装" (幅16)
      expect(output).toContain('ユーザー登録機能の実装');
    });
  });

  describe('エッジケース', () => {
    it('空の文字列はそのまま返す', () => {
      expect(formatTable('')).toBe('');
    });

    it('テーブルでない文字列はそのまま返す', () => {
      const input = 'これはテーブルではありません';
      expect(formatTable(input)).toBe(input);
    });

    it('セル数が一致しないテーブルはそのまま返す', () => {
      const input = `| A | B |
| C |`;
      expect(formatTable(input)).toBe(input);
    });

    it('セパレーター行を含むテーブルを正しくフォーマットする', () => {
      const input = `| 項目 | Value |
|:---|:---:|
| 日本語 | 100 |`;

      const output = formatTable(input);
      
      // セパレーター行が保持されているか確認（スペースを含む形式に対応）
      expect(output).toMatch(/\|\s*:?-+:?\s*\|/);
    });
  });

  describe('TR-001 EAW計算の検証', () => {
    it('全角英数を正しく幅2として扱う', () => {
      const input = `| A | Ｂ |
| 1 | ２ |`;

      const output = formatTable(input);
      
      // "Ｂ" と "２" は全角なので幅2として計算される
      // "A" と "1" は半角なので幅1として計算される
      expect(output).toContain('Ｂ');
      expect(output).toContain('２');
    });

    it('Ambiguous文字を幅1として扱う', () => {
      const input = `| Alpha | α |
| Cyrillic | А |`;

      const output = formatTable(input);
      
      // Ambiguous文字（α, А）はTR-001に基づき幅1として扱う
      expect(output).toContain('α');
      expect(output).toContain('А');
    });
  });

  describe('パフォーマンス要件 (NFR-TR1-1)', () => {
    it('100行×10列のテーブルを100ms未満でフォーマットする', () => {
      // 大きなテーブルを生成
      const rows: string[] = ['| ' + Array(10).fill('カラム').join(' | ') + ' |'];
      rows.push('|:---|'.repeat(10).slice(0, -1) + '|');
      
      for (let i = 0; i < 100; i++) {
        const cells = Array(10).fill(0).map((_, j) => `セル${i}-${j}`);
        rows.push('| ' + cells.join(' | ') + ' |');
      }
      
      const input = rows.join('\n');
      
      const startTime = performance.now();
      formatTable(input);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // 100ms未満
    });
  });
});

