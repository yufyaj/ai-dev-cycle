# Stack Profile — Next.js (TypeScript)（docs/tech）

本ドキュメントは profiles/stack_next_ts.md の内容を docs/ 配下へ集約したものです。最新の運用では docs/tech/* を参照してください。

（以下、元プロファイルの内容を転記）

# Stack Profile — Next.js (TypeScript)

## 📁 推奨ディレクトリ構成
frontend/
app/ # App Router （サーバー/クライアントコンポーネント）
api/ # 必要ならBFF的な中継のroute handlers（責務は中継に限定）
features/ # 機能単位（UI/VM/ローカル状態/フック）
shared/
lib/bff/ # fetchラッパ（auth/trace/timeout/再試行/キャッシュ）
ui/ # デザインシステム・共通UI
config/ # env・設定の単一参照点
types/ # API契約・共通型（OpenAPI生成など）
tests/

## 🧰 ツール
- TypeScript / ESLint / Prettier
- テスト: **Vitest** + React Testing Library
- スキーマ検証: **Zod**（BFF境界でレスポンス検証）
- 型生成（任意）: **openapi-typescript** 等
- パフォーマンス計測: **Lighthouse**, **web-vitals**

## 🧪 テスト戦略
- コンポーネント単体（UIの分岐・アクセシビリティ）
- **BFF契約テスト**：msw で I/O 透過性（ステータス・ヘッダ・ボディ）検証
- 重要フローの最小E2E（任意）

## 🔐 セキュリティ方針
- 認証は **HttpOnly Cookie** を前提に、BFF層で Authorization ヘッダへ変換
- ヘッダ強化：CSP / HSTS / X-Content-Type-Options など
- 依存監査：`npm audit` / `pnpm audit`（CIで実行）

## 🧭 観測性
- **traceparent / x-request-id** を前方伝搬（BFF→BE）
- 例外は **Error Boundary** で捕捉し、任意でSaaSに送信
- Web Vitals を継続計測

## ⚙️ CI コマンド例
```bash
# Lint / Test
pnpm install --frozen-lockfile
pnpm lint
pnpm test:ci

# 型生成（必要な場合）
pnpm openapi:gen
```

✅ 守るべき原則（CLAUDE.mdに準拠）
- BFFは中継のみ（認証付与・トレース伝搬・軽微な整形・スキーマ検証）
- DTO→ViewModel 変換は features/*/viewmodels に限定
- サーバー状態とローカル状態を分離、グローバルストア乱用禁止

