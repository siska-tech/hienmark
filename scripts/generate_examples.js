import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データ定義
const statuses = ['open', 'inprogress', 'done', 'completed', 'pending', 'blocked', 'cancelled'];
const priorities = ['high', 'medium', 'low'];
const assignees = ['田中太郎', '佐藤花子', '鈴木一郎', '山田次郎', '高橋三郎', '伊藤四郎', '中村五郎', '小林六郎', '加藤七郎', '吉田八郎'];
const tags = [
  ['開発', 'フロントエンド', 'React'],
  ['開発', 'バックエンド', 'Rust'],
  ['UI/UX', 'デザイン', 'アクセシビリティ'],
  ['テスト', 'QA', '自動化'],
  ['ドキュメント', '仕様書', '設計'],
  ['インフラ', 'デプロイ', 'CI/CD'],
  ['セキュリティ', '認証', '暗号化'],
  ['パフォーマンス', '最適化', 'キャッシュ'],
  ['データベース', '設計', 'マイグレーション'],
  ['API', 'REST', 'GraphQL'],
  ['モバイル', 'iOS', 'Android'],
  ['分析', 'ダッシュボード', '可視化'],
  ['機能追加', '新機能', 'リリース'],
  ['バグ修正', '修正', '緊急'],
  ['リファクタリング', '改善', 'コード品質'],
];

const titles = [
  'ユーザー認証システムの実装',
  'ダークモード対応とUI改善',
  'パフォーマンス最適化',
  'データベース設計の見直し',
  'API設計と実装',
  'モバイルアプリ対応',
  'セキュリティ強化',
  'テスト自動化の導入',
  'ドキュメント整備',
  'インフラ構築',
  'CI/CDパイプライン構築',
  'アクセシビリティ改善',
  'コードリファクタリング',
  'バグ修正とデバッグ',
  '新機能の追加',
  '既存機能の改善',
  'パフォーマンス監視',
  'ログ分析システム構築',
  'キャッシュ戦略の実装',
  'マイグレーション作業',
];

const descriptions = [
  '## 概要\nプロジェクトの主要機能として、ユーザー認証システムを実装する。',
  '## 背景\nユーザーからの要望を受けて、ダークモード機能を追加する。',
  '## 目的\nアプリケーションのパフォーマンスを改善し、ユーザー体験を向上させる。',
  '## 課題\n現行のデータベース設計を見直し、スケーラビリティを確保する。',
  '## 目標\nRESTful APIを設計し、フロントエンドとの連携を実現する。',
  '## 計画\nモバイルアプリの開発を開始し、クロスプラットフォーム対応を目指す。',
  '## 必要性\nセキュリティホールを修正し、堅牢なアプリケーションを構築する。',
  '## 方針\nテスト自動化を導入し、品質保証の効率化を図る。',
  '## 要求\nプロジェクトのドキュメントを整備し、開発者体験を向上させる。',
  '## 範囲\nクラウドインフラを構築し、スケーラブルな環境を整える。',
];

// 日付生成ヘルパー
function randomDate(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// FrontMatter生成
function generateFrontMatter(i, allTasks) {
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  const assignee = assignees[Math.floor(Math.random() * assignees.length)];
  const tagSet = tags[Math.floor(Math.random() * tags.length)];
  
  const baseDate = new Date('2025-01-01');
  const startDate = randomDate(baseDate, new Date('2025-12-31'));
  const endDate = randomDate(startDate, new Date('2026-12-31'));
  
  const frontMatter = {
    status: status,
    priority: priority,
    assignee: assignee,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    tags: tagSet,
  };
  
  // 50%の確率でdue_dateを追加
  if (Math.random() > 0.5) {
    frontMatter.due_date = formatDate(randomDate(startDate, endDate));
  }
  
  // 30%の確率でdepends_onを追加（既存のタスクを参照）
  if (i > 0 && Math.random() > 0.7) {
    const depCount = Math.floor(Math.random() * 3) + 1; // 1-3個の依存
    const dependencies = [];
    for (let j = 0; j < depCount && j < i; j++) {
      const depIndex = Math.floor(Math.random() * i);
      dependencies.push(`task-${String(depIndex + 1).padStart(3, '0')}`);
    }
    if (dependencies.length > 0) {
      frontMatter.depends_on = dependencies;
    }
  }
  
  // 20%の確率で追加のカスタムタグを追加
  if (Math.random() > 0.8) {
    frontMatter.estimate_hours = Math.floor(Math.random() * 40) + 4;
  }
  
  if (Math.random() > 0.9) {
    frontMatter.sprint = `Sprint-${Math.floor(Math.random() * 10) + 1}`;
  }
  
  if (Math.random() > 0.85) {
    frontMatter.category = ['Bug', 'Feature', 'Enhancement', 'Maintenance'][Math.floor(Math.random() * 4)];
  }
  
  return frontMatter;
}

// YAML形式に変換
function frontMatterToYAML(fm) {
  const lines = ['---'];
  
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    }
  }
  
  lines.push('---');
  return lines.join('\n');
}

// Markdownコンテンツ生成
function generateContent(i) {
  const title = titles[Math.floor(Math.random() * titles.length)];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  const content = `# ${title}

${description}

## タスク

- [${Math.random() > 0.5 ? 'x' : ' '}] 要件定義
- [${Math.random() > 0.5 ? 'x' : ' '}] 設計レビュー
- [${Math.random() > 0.5 ? 'x' : ' '}] 実装
- [${Math.random() > 0.5 ? 'x' : ' '}] テスト
- [ ] ドキュメント化
- [ ] デプロイ

## メモ

${i % 5 === 0 ? '重要なタスクです。優先度を高く設定してください。' : ''}
${i % 7 === 0 ? 'このタスクには注意が必要です。関連するタスクを確認してください。' : ''}
${i % 11 === 0 ? 'ユーザーからの要望が多数寄せられています。' : ''}

## 進捗

現在、実装段階にあります。次のマイルストーンまで進捗しています。
`;

  return content;
}

// ファイル生成
const examplesDir = path.join(__dirname, 'examples');

if (!fs.existsSync(examplesDir)) {
  fs.mkdirSync(examplesDir);
}

console.log('Generating 100 example task files...');

const allTasks = [];
for (let i = 1; i <= 100; i++) {
  const taskId = `task-${String(i).padStart(3, '0')}`;
  const frontMatter = generateFrontMatter(i, allTasks);
  const content = generateContent(i);
  
  const yamlFrontMatter = frontMatterToYAML(frontMatter);
  const markdown = `${yamlFrontMatter}\n\n${content}\n`;
  
  const filename = path.join(examplesDir, `${taskId}.md`);
  fs.writeFileSync(filename, markdown, 'utf8');
  
  allTasks.push({ id: taskId, frontMatter });
  
  if (i % 10 === 0) {
    console.log(`Generated ${i}/100 files...`);
  }
}

console.log('✓ Successfully generated 100 example task files in /examples/');

