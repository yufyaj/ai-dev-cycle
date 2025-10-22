# アーキテクチャ/運用ポリシー（docs/architecture）

- ドキュメントは docs/ 以下に集約します
  - 要件: docs/requirements/BRD.md（正）
  - 変更単位（Issue/PR）: docs/issues/<Issue番号>/README.md
  - 技術スタック: docs/tech/stack_*.md
- 守るべき原則（抜粋）
  - TDD原則、PRにテストを含める
  - 責務分離（UI/BFF/Usecase/Domain/Infra）
  - Secretsをコミットしない
- パイプライン
  - 実装→テスト→レビュー→セキュリティ→PR→（任意）自動マージ→次タスク
- レビュー観点にドキュメント方針を含める（docs 更新必須）

