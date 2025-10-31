# 国際化（i18n）システム

## ディレクトリ構造

```
src/i18n/
├── types.ts                    # 翻訳の型定義
├── contexts/
│   └── LanguageContext.tsx     # 言語コンテキスト
└── locales/
    ├── index.ts                # 翻訳リソースのエクスポート
    ├── ja/                     # 日本語翻訳
    │   ├── common.ts           # 共通UI要素
    │   ├── app.ts              # アプリケーション全体
    │   ├── taskBrowser.ts      # タスク一覧
    │   ├── taskEditor.ts       # タスクエディター
    │   ├── tags.ts             # タグシステム
    │   ├── tagConfig.ts        # タグ設定
    │   ├── templates.ts        # テンプレート機能
    │   ├── settings.ts         # 設定
    │   ├── languages.ts        # 言語名
    │   ├── customFilterSort.ts # カスタムフィルター/ソート
    │   └── index.ts            # 日本語翻訳の集約
    ├── en/                     # 英語翻訳（同じ構造）
    │   └── ...
    └── vi/                     # ベトナム語翻訳（同じ構造）
        └── ...
```

## 利点

### 1. モジュール性
- 各コンポーネントの翻訳が独立したファイルに分離
- 関連する翻訳を見つけやすい
- 変更の影響範囲が明確

### 2. スケーラビリティ
- 新しいコンポーネントの翻訳を簡単に追加
- ファイルサイズが適切に分散
- Git差分が追いやすい

### 3. 保守性
- コンポーネントごとに翻訳を更新可能
- 翻訳者が作業しやすい
- レビューが容易

### 4. パフォーマンス
- 必要な翻訳のみインポート可能（将来的に動的インポートも可能）
- TypeScriptのコンパイル時間の短縮
- より小さなチャンクサイズ

## 使用方法

### コンポーネントで翻訳を使用

```typescript
import { useLanguage } from '../../contexts/LanguageContext';

function MyComponent() {
  const { t } = useLanguage();

  return (
    <div>
      <h1>{t.app.title}</h1>
      <button>{t.common.save}</button>
      <p>{t.taskBrowser.noTasks}</p>
    </div>
  );
}
```

### 新しい翻訳キーの追加

1. **型定義を追加** (`src/i18n/types.ts`)
```typescript
export interface Translations {
  myNewComponent: {
    title: string;
    description: string;
  };
}
```

2. **各言語の翻訳ファイルを作成**

`src/i18n/locales/ja/myNewComponent.ts`:
```typescript
export const myNewComponent = {
  title: '新しいコンポーネント',
  description: '説明文',
};
```

`src/i18n/locales/en/myNewComponent.ts`:
```typescript
export const myNewComponent = {
  title: 'New Component',
  description: 'Description text',
};
```

`src/i18n/locales/vi/myNewComponent.ts`:
```typescript
export const myNewComponent = {
  title: 'Thành phần mới',
  description: 'Văn bản mô tả',
};
```

3. **各言語のindex.tsで集約**

`src/i18n/locales/ja/index.ts`:
```typescript
import { myNewComponent } from './myNewComponent';

export const ja: Translations = {
  // ... existing imports
  myNewComponent,
};
```

同様に `en/index.ts` と `vi/index.ts` も更新。

### 新しい言語の追加

1. **型定義を更新** (`src/i18n/types.ts`)
```typescript
export type Language = 'ja' | 'en' | 'vi' | 'fr'; // フランス語を追加
```

2. **新しい言語ディレクトリを作成**
```bash
mkdir src/i18n/locales/fr
```

3. **既存の言語ファイルを参考に翻訳ファイルを作成**
- `fr/common.ts`
- `fr/app.ts`
- ... (全てのファイル)
- `fr/index.ts`

4. **メインindex.tsで登録** (`src/i18n/locales/index.ts`)
```typescript
import { fr } from './fr';

export const translations: Record<Language, Translations> = {
  ja,
  en,
  vi,
  fr, // 追加
};
```

5. **言語選択UIに追加** (`Settings.tsx`)
```typescript
<button onClick={() => handleLanguageChange('fr')}>
  {t.languages.fr}
</button>
```

## ファイル命名規則

- **ファイル名**: キャメルケース（例: `taskBrowser.ts`, `customFilterSort.ts`）
- **エクスポート名**: ファイル名と同じ（例: `export const taskBrowser = { ... }`）
- **一貫性**: 全ての言語で同じファイル構造を維持

## ベストプラクティス

### 1. 翻訳キーの命名
- 明確で説明的な名前を使用
- 動詞形（例: `save`, `delete`）または名詞形（例: `title`, `description`）
- 省略形は避ける

### 2. 翻訳の品質
- 自然な表現を心がける
- 文脈を考慮した翻訳
- UIの文字数制限を意識
- 専門用語は統一

### 3. 型安全性
- 全ての翻訳キーは `types.ts` で定義
- TypeScriptの型チェックを活用
- 存在しないキーへのアクセスはコンパイルエラー

### 4. レビュー
- ネイティブスピーカーによる確認
- UI上での実際の表示確認
- 文字列の長さによるレイアウト崩れをチェック

## トラブルシューティング

### ビルドエラー: "Type error: Property 'xxx' does not exist"

**原因**: 翻訳キーが全ての言語ファイルに存在しない

**解決方法**:
1. `types.ts` の定義を確認
2. 全ての言語（ja, en, vi）に同じキーが存在するか確認
3. エクスポート漏れがないか確認

### 翻訳が反映されない

**原因**: キャッシュまたはインポートの問題

**解決方法**:
1. ブラウザのキャッシュをクリア
2. `npm run build` でリビルド
3. インポートパスが正しいか確認

### 言語切り替えが動作しない

**原因**: LanguageProviderの設定漏れ

**解決方法**:
1. `App.tsx` が `LanguageProvider` でラップされているか確認
2. `useLanguage` フックを正しくインポートしているか確認

## 参考リンク

- [TypeScript Handbook - Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- [React Context API](https://react.dev/reference/react/useContext)
- [i18n Best Practices](https://phrase.com/blog/posts/i18n-best-practices/)

## 貢献

翻訳の改善や新しい言語の追加は大歓迎です！プルリクエストをお送りください。
