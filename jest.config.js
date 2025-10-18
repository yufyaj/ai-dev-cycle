/** @type {import('jest').Config} */
module.exports = {
  // テスト環境
  testEnvironment: 'jsdom',

  // テスト対象
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/*.{spec,test}.{js,jsx,ts,tsx}'
  ],

  // テスト除外
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/playwright-report/',
    '/tests/e2e/'
  ],

  // カバレッジ
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    }
  },

  // モジュール解決
  moduleNameMapper: {
    // CSS/画像のモック
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',

    // パスエイリアス（Next.js）
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // セットアップ
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Transform（TypeScript）
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },

  // タイムアウト
  testTimeout: 10_000,

  // 並列実行
  maxWorkers: '50%',
};
