#!/usr/bin/env python3
"""
プロジェクトのすべてのテストを実行するスクリプト
Node.js (Jest/Vitest) と Python (pytest) の両方をサポート
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple


def detect_project_type() -> List[str]:
    """プロジェクトタイプを検出"""
    project_types = []

    if Path('package.json').exists():
        project_types.append('nodejs')

    if Path('requirements.txt').exists() or Path('setup.py').exists() or Path('pyproject.toml').exists():
        project_types.append('python')

    return project_types


def run_nodejs_tests() -> Tuple[bool, str, Dict]:
    """Node.js のテストを実行"""
    print("🧪 Node.js テストを実行中...")
    results = {
        'type': 'nodejs',
        'success': False,
        'tests_passed': 0,
        'tests_failed': 0,
        'coverage': 0
    }

    # package.json を読み込み
    with open('package.json', 'r') as f:
        package_data = json.load(f)

    scripts = package_data.get('scripts', {})

    # テストコマンドを特定
    test_commands = []
    if 'test' in scripts:
        test_commands.append('npm test')
    if 'test:unit' in scripts:
        test_commands.append('npm run test:unit')
    if 'test:integration' in scripts:
        test_commands.append('npm run test:integration')
    if 'test:e2e' in scripts:
        test_commands.append('npm run test:e2e')

    if not test_commands:
        # デフォルトでJest/Vitestを試す
        if Path('node_modules/.bin/jest').exists():
            test_commands.append('npx jest --coverage')
        elif Path('node_modules/.bin/vitest').exists():
            test_commands.append('npx vitest run --coverage')
        else:
            return False, "テストコマンドが見つかりません", results

    all_output = []
    all_success = True

    for cmd in test_commands:
        print(f"  実行: {cmd}")
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True
        )

        all_output.append(f"=== {cmd} ===\n{result.stdout}\n{result.stderr}")
        if result.returncode != 0:
            all_success = False

        # テスト結果をパース（簡略化）
        output = result.stdout + result.stderr
        if 'Tests:' in output or 'Test Suites:' in output:
            # Jest形式のパース
            import re
            passed_match = re.search(r'(\d+) passed', output)
            failed_match = re.search(r'(\d+) failed', output)

            if passed_match:
                results['tests_passed'] += int(passed_match.group(1))
            if failed_match:
                results['tests_failed'] += int(failed_match.group(1))

        # カバレッジ情報をパース
        if 'Coverage' in output or 'Statements' in output:
            coverage_match = re.search(r'All files.*?(\d+\.?\d*)%', output)
            if coverage_match:
                results['coverage'] = float(coverage_match.group(1))

    results['success'] = all_success
    return all_success, '\n'.join(all_output), results


def run_python_tests() -> Tuple[bool, str, Dict]:
    """Python のテストを実行"""
    print("🧪 Python テストを実行中...")
    results = {
        'type': 'python',
        'success': False,
        'tests_passed': 0,
        'tests_failed': 0,
        'coverage': 0
    }

    # pytest がインストールされているか確認
    pytest_installed = subprocess.run(
        'python -m pytest --version',
        shell=True,
        capture_output=True,
        text=True
    ).returncode == 0

    if not pytest_installed:
        print("  pytest をインストール中...")
        subprocess.run('pip install pytest pytest-cov', shell=True)

    # テスト実行
    test_dirs = []
    if Path('tests').exists():
        test_dirs.append('tests')
    if Path('test').exists():
        test_dirs.append('test')

    # srcディレクトリ内のtest_*.pyも検索
    test_files = list(Path('.').rglob('test_*.py'))
    test_files.extend(list(Path('.').rglob('*_test.py')))

    if not test_dirs and not test_files:
        return True, "テストファイルが見つかりません（スキップ）", results

    # pytest 実行
    cmd = 'python -m pytest'
    if test_dirs:
        cmd += ' ' + ' '.join(test_dirs)
    cmd += ' --cov --cov-report=term --cov-report=json -v'

    print(f"  実行: {cmd}")
    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True
    )

    output = result.stdout + result.stderr

    # テスト結果をパース
    import re
    # "5 passed, 2 failed" のようなパターンを検索
    passed_match = re.search(r'(\d+) passed', output)
    failed_match = re.search(r'(\d+) failed', output)

    if passed_match:
        results['tests_passed'] = int(passed_match.group(1))
    if failed_match:
        results['tests_failed'] = int(failed_match.group(1))

    # カバレッジ情報を取得
    if Path('coverage.json').exists():
        with open('coverage.json', 'r') as f:
            cov_data = json.load(f)
            results['coverage'] = cov_data.get('totals', {}).get('percent_covered', 0)

    results['success'] = result.returncode == 0
    return result.returncode == 0, output, results


def generate_test_report(all_results: List[Dict]) -> None:
    """テストレポートを生成"""
    os.makedirs('out', exist_ok=True)

    report = {
        'timestamp': subprocess.run(
            'date -Iseconds',
            shell=True,
            capture_output=True,
            text=True
        ).stdout.strip(),
        'results': all_results,
        'summary': {
            'total_tests_passed': sum(r['tests_passed'] for r in all_results),
            'total_tests_failed': sum(r['tests_failed'] for r in all_results),
            'average_coverage': sum(r['coverage'] for r in all_results) / len(all_results) if all_results else 0,
            'all_passed': all(r['success'] for r in all_results)
        }
    }

    with open('out/test_report.json', 'w') as f:
        json.dump(report, f, indent=2)

    print("\n📊 テストレポート:")
    print(f"  ✅ 成功: {report['summary']['total_tests_passed']}")
    print(f"  ❌ 失敗: {report['summary']['total_tests_failed']}")
    print(f"  📈 カバレッジ: {report['summary']['average_coverage']:.1f}%")


def main():
    """メイン処理"""
    print("🚀 全テストを実行します...")

    # プロジェクトタイプを検出
    project_types = detect_project_type()
    if not project_types:
        print("⚠️ プロジェクトタイプを検出できませんでした")
        print("ℹ️ テストをスキップします（成功として扱います）")
        # outディレクトリとダミーファイルを作成
        os.makedirs('out', exist_ok=True)
        with open('out/test_results.log', 'w') as f:
            f.write("No tests found - skipping\n")
        # 何もテストがない場合は成功として扱う
        sys.exit(0)

    all_results = []
    all_outputs = []
    overall_success = True

    # 各プロジェクトタイプのテストを実行
    if 'nodejs' in project_types:
        success, output, results = run_nodejs_tests()
        all_results.append(results)
        all_outputs.append(output)
        if not success:
            overall_success = False

    if 'python' in project_types:
        success, output, results = run_python_tests()
        all_results.append(results)
        all_outputs.append(output)
        if not success:
            overall_success = False

    # 結果をファイルに保存
    os.makedirs('out', exist_ok=True)
    with open('out/test_results.log', 'w') as f:
        f.write('\n'.join(all_outputs))

    # テストレポートを生成
    generate_test_report(all_results)

    # 終了コード
    if overall_success:
        print("\n✅ すべてのテストに成功しました！")
        sys.exit(0)
    else:
        print("\n❌ 一部のテストが失敗しました")
        sys.exit(1)


if __name__ == '__main__':
    main()