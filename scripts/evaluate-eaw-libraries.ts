/**
 * EAW (East Asian Width) ライブラリ評価スクリプト
 * 
 * Task-TR1.1: ライブラリ選定・評価
 * 
 * 評価項目:
 * 1. Unicodeの最新バージョンへの追従性
 * 2. 要件定義書 Table TR-001-1 の計算ロジック（W/F=2, N/Na/H=1）との互換性
 * 3. Ambiguous (A) な文字のデフォルト幅を「1（半角）」として扱えること
 */

import { eastAsianWidth as getEastAsianWidth } from 'get-east-asian-width';
// @ts-ignore - CommonJS module
import eaw from 'eastasianwidth';
const { characterLength } = eaw;

// TR-001 要件に基づく期待値の定義
const TR001_EXPECTED_WIDTHS: Array<{ char: string; category: string; expectedWidth: number }> = [
  // N (Neutral): 半角英数・記号
  { char: 'A', category: 'N', expectedWidth: 1 },
  { char: 'B', category: 'N', expectedWidth: 1 },
  { char: '1', category: 'N', expectedWidth: 1 },
  { char: '*', category: 'N', expectedWidth: 1 },
  
  // Na (Narrow): 半角カタカナ
  { char: 'ｱ', category: 'Na', expectedWidth: 1 },
  { char: 'ｲ', category: 'Na', expectedWidth: 1 },
  
  // H (Halfwidth): 半角文字
  // U+FF61-FF9F の範囲の文字をテスト
  
  // W (Wide): 全角文字（ひらがな、漢字等）
  { char: 'あ', category: 'W', expectedWidth: 2 },
  { char: '日', category: 'W', expectedWidth: 2 },
  { char: '語', category: 'W', expectedWidth: 2 },
  { char: '本', category: 'W', expectedWidth: 2 },
  
  // F (Fullwidth): 全角英数
  { char: 'Ａ', category: 'F', expectedWidth: 2 },
  { char: 'Ｂ', category: 'F', expectedWidth: 2 },
  { char: '１', category: 'F', expectedWidth: 2 },
  
  // A (Ambiguous): 曖昧文字（デフォルトは1）
  { char: 'α', category: 'A', expectedWidth: 1 }, // Greek
  { char: 'А', category: 'A', expectedWidth: 1 }, // Cyrillic
  { char: '⛣', category: 'A', expectedWidth: 1 }, // Emoji/Symbol
];

/**
 * get-east-asian-width の評価
 */
function evaluateGetEastAsianWidth(): {
  name: string;
  compatible: boolean;
  issues: string[];
  testResults: Array<{ char: string; expected: number; actual: number; match: boolean }>;
} {
  const name = 'get-east-asian-width';
  const issues: string[] = [];
  const testResults: Array<{ char: string; expected: number; actual: number; match: boolean }> = [];
  
  console.log(`\n=== Evaluating ${name} ===\n`);
  
  for (const test of TR001_EXPECTED_WIDTHS) {
    try {
      // get-east-asian-width requires code point (number)
      const codePoint = test.char.codePointAt(0);
      if (codePoint === undefined) {
        throw new Error('Invalid character');
      }
      const actualWidth = getEastAsianWidth(codePoint, { ambiguousAsWide: false });
      const match = actualWidth === test.expectedWidth;
      
      testResults.push({
        char: test.char,
        expected: test.expectedWidth,
        actual: actualWidth,
        match,
      });
      
      if (!match) {
        console.log(`  ❌ '${test.char}' (${test.category}): expected ${test.expectedWidth}, got ${actualWidth}`);
        issues.push(`'${test.char}' (${test.category}): expected ${test.expectedWidth}, got ${actualWidth}`);
      } else {
        console.log(`  ✅ '${test.char}' (${test.category}): ${actualWidth}`);
      }
    } catch (error) {
      console.log(`  ❌ Error testing '${test.char}':`, error);
      issues.push(`Error testing '${test.char}': ${error}`);
      testResults.push({
        char: test.char,
        expected: test.expectedWidth,
        actual: -1,
        match: false,
      });
    }
  }
  
  const compatible = issues.length === 0;
  console.log(`\n  Summary: ${compatible ? '✅ Compatible' : '❌ Not Compatible'} (${issues.length} issues)`);
  
  return { name, compatible, issues, testResults };
}

/**
 * eastasianwidth の評価
 */
function evaluateEastasianwidth(): {
  name: string;
  compatible: boolean;
  issues: string[];
  testResults: Array<{ char: string; expected: number; actual: number; match: boolean }>;
} {
  const name = 'eastasianwidth';
  const issues: string[] = [];
  const testResults: Array<{ char: string; expected: number; actual: number; match: boolean }> = [];
  
  console.log(`\n=== Evaluating ${name} ===\n`);
  
  for (const test of TR001_EXPECTED_WIDTHS) {
    try {
      // eastasianwidth's characterLength treats A as 2, but TR-001 requires A as 1
      // So we check the type and use custom logic for Ambiguous
      const eawType = eaw.eastAsianWidth(test.char);
      const actualWidth = eawType === 'A' ? 1 : characterLength(test.char); // Override A to 1 per TR-001
      const match = actualWidth === test.expectedWidth;
      
      testResults.push({
        char: test.char,
        expected: test.expectedWidth,
        actual: actualWidth,
        match,
      });
      
      if (!match) {
        console.log(`  ❌ '${test.char}' (${test.category}): expected ${test.expectedWidth}, got ${actualWidth}`);
        issues.push(`'${test.char}' (${test.category}): expected ${test.expectedWidth}, got ${actualWidth}`);
      } else {
        console.log(`  ✅ '${test.char}' (${test.category}): ${actualWidth}`);
      }
    } catch (error) {
      console.log(`  ❌ Error testing '${test.char}':`, error);
      issues.push(`Error testing '${test.char}': ${error}`);
      testResults.push({
        char: test.char,
        expected: test.expectedWidth,
        actual: -1,
        match: false,
      });
    }
  }
  
  const compatible = issues.length === 0;
  console.log(`\n  Summary: ${compatible ? '✅ Compatible' : '❌ Not Compatible'} (${issues.length} issues)`);
  
  return { name, compatible, issues, testResults };
}

/**
 * 文字列全体の幅を計算するヘルパー関数をテスト
 */
function testStringWidthCalculation() {
  console.log(`\n=== Testing String Width Calculation ===\n`);
  
  const testStrings = [
    { str: '日本語', expected: 6 }, // 3 chars × 2 = 6
    { str: 'English', expected: 7 }, // 7 chars × 1 = 7
    { str: '日本語English', expected: 13 }, // 3×2 + 7×1 = 13
    { str: '項目', expected: 4 }, // 2 chars × 2 = 4
    { str: 'Value', expected: 5 }, // 5 chars × 1 = 5
    { str: 'ＡＢ', expected: 4 }, // 2 chars × 2 = 4
    { str: 'AB', expected: 2 }, // 2 chars × 1 = 2
  ];
  
  console.log('Testing get-east-asian-width:');
  for (const test of testStrings) {
    try {
      const actual = [...test.str].reduce((sum, char) => {
        const codePoint = char.codePointAt(0);
        return sum + (codePoint !== undefined ? getEastAsianWidth(codePoint, { ambiguousAsWide: false }) : 0);
      }, 0);
      const match = actual === test.expected;
      console.log(`  ${match ? '✅' : '❌'} '${test.str}': expected ${test.expected}, got ${actual}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }
  
  console.log('\nTesting eastasianwidth:');
  for (const test of testStrings) {
    try {
      const actual = [...test.str].reduce((sum, char) => sum + characterLength(char), 0);
      const match = actual === test.expected;
      console.log(`  ${match ? '✅' : '❌'} '${test.str}': expected ${test.expected}, got ${actual}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }
}

/**
 * メイン評価関数
 */
function main() {
  console.log('========================================');
  console.log('EAW Library Evaluation for TR-001');
  console.log('========================================');
  
  const result1 = evaluateGetEastAsianWidth();
  const result2 = evaluateEastasianwidth();
  
  testStringWidthCalculation();
  
  console.log('\n========================================');
  console.log('Final Recommendation');
  console.log('========================================\n');
  
  if (result1.compatible && result2.compatible) {
    console.log('Both libraries are compatible with TR-001 requirements.');
    console.log('Recommendation: Choose based on maintenance status and API preference.');
  } else if (result1.compatible) {
    console.log('✅ Recommended: get-east-asian-width');
    console.log('   - Fully compatible with TR-001 requirements');
    console.log(`   - ${result2.issues.length} compatibility issues with eastasianwidth`);
  } else if (result2.compatible) {
    console.log('✅ Recommended: eastasianwidth');
    console.log('   - Fully compatible with TR-001 requirements');
    console.log(`   - ${result1.issues.length} compatibility issues with get-east-asian-width`);
  } else {
    console.log('⚠️  Both libraries have compatibility issues:');
    console.log(`   - get-east-asian-width: ${result1.issues.length} issues`);
    console.log(`   - eastasianwidth: ${result2.issues.length} issues`);
    console.log('   Recommendation: Further investigation needed or custom implementation.');
  }
  
  console.log('\n========================================\n');
}

// スクリプトが直接実行された場合のみ評価を実行
main();

