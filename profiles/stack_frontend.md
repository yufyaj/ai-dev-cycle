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

## API設計

### 認証
- **JWT**: HttpOnly Cookie
- **CSRF**: トークン必須
- **セッション**: 1時間タイムアウト

### エンドポイント例
```
POST /api/auth/login
POST /api/auth/logout

GET  /api/admin/users
POST /api/admin/users
PUT  /api/admin/users/:id

GET  /api/worker/lists
POST /api/worker/results

GET  /api/client/projects/:id/progress
```

## テスト戦略

### ユニット/コンポーネントテスト（Jest + RTL）
```typescript
// components/LoginForm.test.tsx
describe('LoginForm', () => {
  it('正常系: 有効な認証情報で送信成功', async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(mockLogin).toHaveBeenCalled();
  });

  it('異常系: 無効なメールアドレスでエラー表示', async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'invalid-email');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByText('無効なメールアドレスです')).toBeInTheDocument();
  });
});
```

### E2Eテスト（Playwright）
```typescript
// tests/e2e/worker-result.spec.ts
test('ワーカー実績入力フロー（正常系）', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'worker@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button:has-text("ログイン")');

  await page.click('text=営業リスト001');
  await page.fill('input[name="sentAt"]', '2025-10-19 14:30');
  await page.check('input[value="success"]');
  await page.click('button:has-text("保存")');

  await expect(page.locator('text=実績が保存されました')).toBeVisible();
});

test('ワーカー権限外アクセス（異常系）', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'worker@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button:has-text("ログイン")');

  // 他ワーカーのリストに直接アクセス
  await page.goto('/worker/lists/999');

  await expect(page.locator('text=403')).toBeVisible();
});
```

## セキュリティ

- **XSS対策**: React自動エスケープ、CSP有効化
- **CSRF対策**: トークン検証
- **認可**: BFF層でロール確認
- **入力検証**: Zodスキーマで型安全なバリデーション

## パフォーマンス

- **レスポンスタイム**: 3秒以内（P95）
- **コード分割**: 動的インポート
- **画像最適化**: Next.js Image最適化
- **SSR/SSG**: 適切に使い分け
