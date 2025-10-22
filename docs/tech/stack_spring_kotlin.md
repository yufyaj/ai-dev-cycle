# Stack Profile — Spring Boot (Kotlin)（docs/tech）

本ドキュメントは profiles/stack_spring_kotlin.md の内容を docs/ 配下へ集約したものです。最新の運用では docs/tech/* を参照してください。

（以下、元プロファイルの内容を転記）

# Stack Profile — Spring Boot (Kotlin)

## 📁 推奨ディレクトリ構成（Clean Architecture）
backend/
domain/ # Entity / ValueObject / DomainService（純粋ロジック）
usecase/ # Application Service（Ports）
interface/ # Adapters（Controller, DTO, Presenter, Mapper）
infrastructure/ # DB/外部API/Repository実装
test/

## 🧰 ツール
- Kotlin / Spring Boot / Gradle Kotlin DSL
- テスト: **JUnit5** + **MockK**
- Webテスト: **MockMvc**（または WebTestClient）
- 静的解析: **ktlint** / **detekt**（任意）
- 依存監査: **OWASP Dependency-Check**（任意）

## 🧪 テスト戦略
- **Domain**：純粋ユニット
- **Usecase**：ポートをモックしたユニット
- **Interface**：Controller スライス（MockMvc/WebTestClient）
- 例外の共通化：`@ControllerAdvice` で統一エラースキーマにマッピング

## 🔐 セキュリティ方針
- 認証・認可はサーバー側で安全に処理（セッション or トークン）
- 入出力のバリデーション（Bean Validation）を境界で徹底
- ログに機密情報を出力しない（マスキング）
- 依存・脆弱性の定期スキャン

## 🧭 観測性
- **traceparent / x-request-id** を受け取り、ログへ相関IDとして出力
- 構造化ログ（JSON）推奨
- 健康監視：Actuator（/health, /metrics）有効化（必要に応じて）

## ⚙️ CI コマンド例
```bash
# Lint / Test
./gradlew ktlintCheck
./gradlew test

# 依存監査（導入時）
./gradlew dependencyCheckAnalyze
```

✅ 守るべき原則（CLAUDE.mdに準拠）
- Controller は Usecase のみ呼び出す（外部境界は DTO）
- domain はフレームワーク非依存
- 依存方向：infrastructure → interface → usecase → domain の内向きのみ
- ビジネスロジックはバックエンドに集約（BFF/UIへ置かない）

