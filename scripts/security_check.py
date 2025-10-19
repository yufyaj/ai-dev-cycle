#!/usr/bin/env python3
"""
セキュリティチェックを実行するスクリプト
コードの脆弱性、依存関係の問題、Secretsの検出などを行う
"""

import os
import sys
import json
import re
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple


def check_for_secrets() -> Tuple[bool, List[Dict]]:
    """Secretsやハードコードされた認証情報をチェック"""
    print("🔑 Secrets検出チェック...")
    issues = []

    # 検索パターン
    secret_patterns = [
        # APIキー、トークン
        (r'(?i)(api[_-]?key|apikey|api_secret)\s*[:=]\s*["\']([^"\']+)["\']', 'API Key'),
        (r'(?i)(token|access[_-]?token|auth[_-]?token)\s*[:=]\s*["\']([^"\']+)["\']', 'Token'),
        (r'(?i)(secret|secret[_-]?key)\s*[:=]\s*["\']([^"\']+)["\']', 'Secret'),

        # パスワード
        (r'(?i)(password|passwd|pwd)\s*[:=]\s*["\']([^"\']+)["\']', 'Password'),

        # データベース接続文字列
        (r'(?i)(mongodb|postgres|mysql|redis)://[^"\s]+', 'Database URL'),

        # AWS
        (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
        (r'(?i)aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*["\']([^"\']+)["\']', 'AWS Secret'),

        # プライベートキー
        (r'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----', 'Private Key'),
        (r'-----BEGIN PGP PRIVATE KEY BLOCK-----', 'PGP Private Key'),

        # その他
        (r'(?i)bearer\s+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+', 'JWT Token'),
    ]

    # 除外パターン（環境変数参照など）
    exclude_patterns = [
        r'process\.env\.',
        r'os\.environ',
        r'getenv\(',
        r'\$\{.*?\}',
        r'example\.com',
        r'localhost',
        r'test',
        r'dummy',
        r'fake',
        r'placeholder'
    ]

    # ファイルを検索
    for file_path in Path('.').rglob('*'):
        if file_path.is_file():
            # 除外ディレクトリ
            if any(part in file_path.parts for part in [
                '.git', 'node_modules', '.venv', 'venv', 'env',
                'dist', 'build', 'coverage', '__pycache__'
            ]):
                continue

            # バイナリファイルはスキップ
            if file_path.suffix in ['.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz']:
                continue

            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.splitlines()

                for line_num, line in enumerate(lines, 1):
                    # 除外パターンに一致する場合はスキップ
                    if any(re.search(pattern, line, re.IGNORECASE) for pattern in exclude_patterns):
                        continue

                    # Secretsパターンをチェック
                    for pattern, secret_type in secret_patterns:
                        if re.search(pattern, line):
                            issues.append({
                                'severity': 'critical',
                                'type': f'Hardcoded {secret_type}',
                                'file': str(file_path),
                                'line': line_num,
                                'message': f'{secret_type} が検出されました',
                                'code': line.strip()[:100]  # 最初の100文字のみ
                            })

            except Exception:
                # ファイルが読み込めない場合はスキップ
                pass

    return len(issues) == 0, issues


def check_dependencies() -> Tuple[bool, List[Dict]]:
    """依存関係の脆弱性をチェック"""
    print("📦 依存関係の脆弱性チェック...")
    issues = []

    # Node.js の依存関係チェック
    if Path('package.json').exists():
        result = subprocess.run(
            'npm audit --json',
            shell=True,
            capture_output=True,
            text=True
        )

        try:
            audit_data = json.loads(result.stdout)
            if 'vulnerabilities' in audit_data:
                for vuln_name, vuln_data in audit_data['vulnerabilities'].items():
                    severity = vuln_data.get('severity', 'low')
                    issues.append({
                        'severity': severity if severity in ['critical', 'high'] else 'warning',
                        'type': 'Dependency Vulnerability',
                        'file': 'package.json',
                        'line': 0,
                        'message': f'{vuln_name}: {vuln_data.get("title", "脆弱性")}',
                        'code': f'npm: {vuln_name}'
                    })
        except json.JSONDecodeError:
            pass

    # Python の依存関係チェック
    if Path('requirements.txt').exists():
        # safety がインストールされているか確認
        safety_installed = subprocess.run(
            'safety --version',
            shell=True,
            capture_output=True
        ).returncode == 0

        if safety_installed:
            result = subprocess.run(
                'safety check --json',
                shell=True,
                capture_output=True,
                text=True
            )

            try:
                safety_data = json.loads(result.stdout)
                for vuln in safety_data:
                    issues.append({
                        'severity': 'high' if vuln.get('severity', '') == 'high' else 'warning',
                        'type': 'Dependency Vulnerability',
                        'file': 'requirements.txt',
                        'line': 0,
                        'message': f'{vuln.get("package", "")}: {vuln.get("vulnerability", "")}',
                        'code': f'pip: {vuln.get("package", "")}'
                    })
            except json.JSONDecodeError:
                pass

    return len([i for i in issues if i['severity'] == 'critical']) == 0, issues


def check_code_security() -> Tuple[bool, List[Dict]]:
    """コードのセキュリティ問題をチェック"""
    print("🛡️ コードセキュリティチェック...")
    issues = []

    security_patterns = [
        # SQL Injection
        (r'(?i)(query|execute)\s*\([^)]*[+\s].*?(request|params|body|query)', 'SQL Injection Risk', 'high'),

        # XSS
        (r'(?i)innerHTML\s*=\s*[^;]+?(request|params|body|query)', 'XSS Risk', 'high'),
        (r'(?i)document\.write\s*\([^)]*?(request|params|body|query)', 'XSS Risk', 'high'),

        # Command Injection
        (r'(?i)(exec|system|eval|spawn)\s*\([^)]*?(request|params|body|query)', 'Command Injection Risk', 'critical'),

        # Path Traversal
        (r'\.\./', 'Path Traversal Risk', 'high'),

        # Insecure Random
        (r'Math\.random\(\)', 'Insecure Random for Security', 'warning'),

        # HTTP instead of HTTPS
        (r'http://(?!localhost|127\.0\.0\.1)', 'Insecure HTTP', 'warning'),

        # Weak Cryptography
        (r'(?i)(md5|sha1)\s*\(', 'Weak Cryptography', 'warning'),

        # Debug Mode
        (r'(?i)debug\s*=\s*true', 'Debug Mode Enabled', 'warning'),
    ]

    # コードファイルを検索
    code_extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.php', '.rb']

    for file_path in Path('.').rglob('*'):
        if file_path.is_file() and file_path.suffix in code_extensions:
            # 除外ディレクトリ
            if any(part in file_path.parts for part in [
                '.git', 'node_modules', '.venv', 'venv', 'dist', 'build', 'test', 'tests'
            ]):
                continue

            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.splitlines()

                for line_num, line in enumerate(lines, 1):
                    for pattern, issue_type, severity in security_patterns:
                        if re.search(pattern, line):
                            issues.append({
                                'severity': severity,
                                'type': issue_type,
                                'file': str(file_path),
                                'line': line_num,
                                'message': f'{issue_type} の可能性があります',
                                'code': line.strip()[:100]
                            })

            except Exception:
                pass

    return len([i for i in issues if i['severity'] == 'critical']) == 0, issues


def check_security_headers() -> Tuple[bool, List[Dict]]:
    """セキュリティヘッダーの設定をチェック"""
    print("🔒 セキュリティヘッダーチェック...")
    issues = []

    # Next.js の設定をチェック
    if Path('next.config.js').exists() or Path('next.config.ts').exists():
        config_file = 'next.config.js' if Path('next.config.js').exists() else 'next.config.ts'

        with open(config_file, 'r') as f:
            content = f.read()

        required_headers = [
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Strict-Transport-Security',
            'Content-Security-Policy'
        ]

        for header in required_headers:
            if header not in content:
                issues.append({
                    'severity': 'warning',
                    'type': 'Missing Security Header',
                    'file': config_file,
                    'line': 0,
                    'message': f'{header} ヘッダーが設定されていない可能性があります',
                    'code': header
                })

    return True, issues


def generate_security_report(all_issues: List[Dict]) -> None:
    """セキュリティレポートを生成"""
    os.makedirs('out', exist_ok=True)

    # 重要度別に分類
    critical_issues = [i for i in all_issues if i['severity'] == 'critical']
    high_issues = [i for i in all_issues if i['severity'] == 'high']
    warning_issues = [i for i in all_issues if i['severity'] == 'warning']

    report = {
        'timestamp': subprocess.run(
            'date -Iseconds',
            shell=True,
            capture_output=True,
            text=True
        ).stdout.strip(),
        'issues': all_issues,
        'summary': {
            'total': len(all_issues),
            'critical': len(critical_issues),
            'high': len(high_issues),
            'warning': len(warning_issues)
        },
        'passed': len(critical_issues) == 0
    }

    with open('out/security_report.json', 'w') as f:
        json.dump(report, f, indent=2)

    print("\n📊 セキュリティレポート:")
    print(f"  🚨 Critical: {len(critical_issues)}")
    print(f"  ⚠️  High: {len(high_issues)}")
    print(f"  ⚡ Warning: {len(warning_issues)}")
    print(f"  📝 合計: {len(all_issues)}")


def main():
    """メイン処理"""
    print("🔒 セキュリティチェックを開始...")

    all_issues = []
    all_passed = True

    # Secrets チェック
    passed, issues = check_for_secrets()
    all_issues.extend(issues)
    if not passed:
        all_passed = False
        print(f"  ❌ {len(issues)} 個のSecretsが検出されました")
    else:
        print("  ✅ Secretsは検出されませんでした")

    # 依存関係チェック
    passed, issues = check_dependencies()
    all_issues.extend(issues)
    critical_deps = [i for i in issues if i['severity'] == 'critical']
    if critical_deps:
        all_passed = False
        print(f"  ❌ {len(critical_deps)} 個の重大な脆弱性が検出されました")
    else:
        print(f"  ✅ 重大な脆弱性はありません（警告: {len(issues)}）")

    # コードセキュリティチェック
    passed, issues = check_code_security()
    all_issues.extend(issues)
    critical_code = [i for i in issues if i['severity'] == 'critical']
    if critical_code:
        all_passed = False
        print(f"  ❌ {len(critical_code)} 個の重大なコード問題が検出されました")
    else:
        print(f"  ✅ 重大なコード問題はありません（警告: {len(issues)}）")

    # セキュリティヘッダーチェック
    passed, issues = check_security_headers()
    all_issues.extend(issues)
    if issues:
        print(f"  ⚠️  {len(issues)} 個のヘッダー設定の改善点があります")

    # レポート生成
    generate_security_report(all_issues)

    # 結果をログファイルに保存
    with open('out/security_check.log', 'w') as f:
        for issue in all_issues:
            f.write(f"[{issue['severity'].upper()}] {issue['type']}\n")
            f.write(f"  File: {issue['file']}:{issue['line']}\n")
            f.write(f"  {issue['message']}\n")
            if issue['code']:
                f.write(f"  Code: {issue['code']}\n")
            f.write("\n")

    # 終了コード
    if all_passed:
        print("\n✅ セキュリティチェック完了（重大な問題なし）")
        sys.exit(0)
    else:
        print("\n❌ 重大なセキュリティ問題が検出されました")
        sys.exit(1)


if __name__ == '__main__':
    main()