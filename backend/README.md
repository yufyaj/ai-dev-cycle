# AI Dev Cycle - Security Implementation

## 概要

Issue #44 で実装されたセキュリティ対策機能です。HTTPS通信、CSP有効化、XSS/SQLインジェクション対策、パスワードハッシュ化、RBAC（ロールベースアクセス制御）、セッション管理（1時間タイムアウト）を含みます。

## 実装されたセキュリティ機能

### 1. パスワードハッシュ化（BCrypt）
- BCryptアルゴリズムを使用したパスワードハッシュ化
- ソルト自動生成によるレインボーテーブル攻撃対策
- コスト設定12による十分な計算コスト

### 2. RBAC（ロールベースアクセス制御）
- USER/ADMINロールによる権限管理
- Permission-based access control
- 階層的権限設計（ADMIN > USER）

### 3. セッション管理
- 1時間の無操作タイムアウト
- HttpOnly, Secure, SameSite=Strict クッキー
- セキュアなセッションID生成（UUID + timestamp + random）

### 4. XSS対策
- OWASPガイドラインに基づく入力サニタイゼーション
- HTMLエスケープ処理
- 危険なスクリプトパターンの検出・除去

### 5. SQLインジェクション対策
- 入力値の事前検証
- 危険なSQLパターンの検出
- パラメータ化クエリ（JPA使用）

### 6. セキュリティヘッダー
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## アーキテクチャ

Clean Architectureに基づく層構造：

```
domain/          # ドメインロジック（フレームワーク非依存）
├── security/
    ├── User.kt          # ユーザーエンティティ
    ├── Session.kt       # セッション管理
    ├── PasswordService.kt    # パスワード処理インターface
    └── InputSanitizer.kt     # 入力サニタイズインターface

usecase/         # ユースケース層
├── security/
    ├── AuthenticationUseCase.kt  # 認証ロジック
    └── AuthorizationUseCase.kt   # 認可ロジック

infrastructure/  # インフラストラクチャ層
├── security/
    ├── BcryptPasswordService.kt  # BCrypt実装
    ├── OwaspInputSanitizer.kt    # OWASP準拠サニタイザ
    └── UuidSessionIdGenerator.kt # セッションID生成
└── persistence/
    ├── UserEntity.kt        # JPA ユーザーエンティティ
    ├── SessionEntity.kt     # JPA セッションエンティティ
    └── JpaUserRepository.kt # ユーザーリポジトリ実装

interface/       # インターface層
├── controller/
    ├── AuthController.kt    # 認証API
    └── GlobalExceptionHandler.kt  # 例外ハンドリング
├── config/
    ├── SecurityConfig.kt    # Spring Security設定
    └── SecurityHeadersFilter.kt   # セキュリティヘッダー設定
└── dto/
    └── AuthDto.kt          # API DTO
```

## API エンドポイント

### POST /api/auth/login
ユーザー認証

**リクエスト:**
```json
{
  "username": "testuser",
  "password": "SecurePass123!"
}
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "message": "Login successful",
  "sessionId": "uuid-timestamp-random",
  "user": {
    "id": 1,
    "username": "testuser",
    "role": "USER",
    "isActive": true
  }
}
```

### POST /api/auth/logout
ログアウト

**リクエスト:**
```json
{
  "sessionId": "uuid-timestamp-random"
}
```

## セキュリティ設定

### パスワード要件
- 最小8文字
- 大文字・小文字・数字・特殊文字を含む
- 一般的なパスワードパターンの拒否

### セッション設定
- タイムアウト: 1時間
- HttpOnly: true
- Secure: true (HTTPS)
- SameSite: Strict

### CSP設定
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

## テスト

### ユニットテスト
- ドメインロジックテスト
- ユースケーステスト
- インフラストラクチャテスト

### 統合テスト
- API エンドポイントテスト
- セキュリティヘッダーテスト
- 認証フローテスト

### Acceptance Test
- Issue #44 の完了条件検証
- XSS/SQLインジェクション対策テスト
- パスワードハッシュ化検証
- セッションタイムアウト検証

## 実行方法

### 開発環境
```bash
./gradlew bootRun
```

### テスト実行
```bash
./gradlew test
```

### プロダクション環境
```bash
./gradlew build
java -jar build/libs/ai-dev-security-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

## 設定ファイル

- `application.yml`: 開発環境設定
- `application-prod.yml`: プロダクション環境設定（HTTPS有効）
- `application-test.yml`: テスト環境設定

## セキュリティ考慮事項

1. **Secrets管理**: 環境変数で機密情報を管理
2. **HTTPS**: プロダクション環境では必須
3. **ログ**: 機密情報をログに出力しない
4. **依存関係**: 定期的な脆弱性スキャン
5. **セッション**: 定期的な期限切れセッション削除