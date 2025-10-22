# フロントエンドスタックプロファイル（docs/tech）

本ドキュメントは profiles/stack_frontend.md の内容を docs/ 配下へ集約したものです。最新の運用では docs/tech/* を参照してください。

（以下、元プロファイルの内容を転記）

# フロントエンドスタックプロファイル

## 技術スタック

### フレームワーク
- **Next.js 14+** (App Router)
  - React Server Components対応
  - TypeScript必須
  - ファイルベースルーティング

### UI/スタイリング
- **TailwindCSS 3+**
  - ユーティリティファーストCSS
  - レスポンシブデザイン対応（PC/タブレット）
- **Shadcn/ui** (オプション)
  - アクセシブルなUIコンポーネント

### 状態管理
- **React Query (TanStack Query)**
  - サーバー状態管理
  - キャッシュ・リフェッチ自動化
- **Zustand** (オプション)
  - グローバルクライアント状態管理（最小限）

### フォーム
- **React Hook Form**
  - バリデーション: Zod
  - 型安全なフォーム管理

### テスト
- **Jest + React Testing Library**
  - ユニット/コンポーネントテスト
  - カバレッジ目標: 80%以上
- **Playwright**
  - E2Eテスト（全機能）
  - ヘッドレスモード、並列実行

### Lint/Format
- **ESLint**
  - Next.js推奨設定
  - TypeScript対応
- **Prettier**
  - コード自動フォーマット

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証グループ
│   │   ├── login/
│   │   └── register/
│   ├── (admin)/           # 管理者グループ
│   │   ├── users/
│   │   ├── projects/
│   │   └── lists/
│   ├── (worker)/          # ワーカーグループ
│   │   ├── dashboard/
│   │   └── results/
│   ├── (client)/          # 顧客グループ
│   │   └── dashboard/
│   ├── api/               # BFF層（API Routes）
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── worker/
│   │   └── client/
│   ├── layout.tsx
│   └── page.tsx
├── components/            # 共通コンポーネント
│   ├── ui/               # 基本UIコンポーネント
│   ├── forms/            # フォームコンポーネント
│   └── layouts/          # レイアウトコンポーネント
├── lib/                   # ユーティリティ・設定
│   ├── api/              # APIクライアント
│   ├── hooks/            # カスタムフック
│   ├── utils/            # ユーティリティ関数
│   └── validation/       # Zodスキーマ
├── types/                 # 型定義
└── __tests__/            # テスト

tests/
└── e2e/                   # Playwright E2Eテスト
    ├── auth.spec.ts
    ├── admin.spec.ts
    ├── worker.spec.ts
    └── client.spec.ts
```

## 責務分離（CLAUDE.md準拠）

### UI層 (`src/app/**/*.tsx`, `src/components/`)
- **責務**: 表示と最小限の入力検証のみ
- **禁止**: ビジネスロジック、直接的なAPI呼び出し
- **ルール**:
  - コンポーネントは純粋関数として設計
  - サーバー状態はReact Queryで管理
  - グローバル状態は最小限（Zustand）

### BFF層 (`src/app/api/**/route.ts`)
- **責務**: 中継・認証・トレース伝搬・軽微な整形のみ
- **禁止**: ビジネスロジック、複雑な計算
- **ルール**:
  - バックエンドAPIへのプロキシ
  - JWTトークン検証
  - リクエストにトレースID付与
  - レスポンスの型変換（DTO → UI用）

## API設計（抜粋）
- 認証: JWT (HttpOnly Cookie), CSRF対策必須
- 例エンドポイント: /api/auth/login, /api/admin/users, /api/worker/results など

## テスト戦略（抜粋）
- ユニット/コンポーネント: Jest + RTL
- E2E: Playwright（失敗時スクショ・動画・トレース保存）

## セキュリティ/性能（抜粋）
- XSS/CSRF対策, ロール認可, ZodでI/Oバリデーション
- レスポンスタイム P95 3秒以内, 画像最適化, コード分割

