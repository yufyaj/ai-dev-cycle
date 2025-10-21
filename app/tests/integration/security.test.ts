import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizeInput } from '@/shared/lib/security/xss-protection'
import { hashPassword, verifyPassword } from '@/shared/lib/auth/password'
import { createSession, verifySession } from '@/shared/lib/auth/session'
import { hasPermission, Role, Permission, type User } from '@/shared/lib/auth/rbac'
import { isSqlInjectionAttempt, sanitizeSqlInput } from '@/shared/lib/security/sql-injection'

describe('Security Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Complete Authentication Flow', () => {
    it('正常系: ユーザー登録からログインまでの完全なフロー', async () => {
      // 1. パスワードハッシュ化（登録時）
      const plainPassword = 'TestPass123!'
      const hashedPassword = await hashPassword(plainPassword)
      
      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(plainPassword)
      
      // 2. ユーザー作成
      const user: User = {
        id: '1',
        email: 'test@example.com',
        roles: [Role.USER]
      }
      
      // 3. ログイン時のパスワード検証
      const isValidPassword = await verifyPassword(plainPassword, hashedPassword)
      expect(isValidPassword).toBe(true)
      
      // 4. セッション作成
      const sessionToken = await createSession(user)
      expect(sessionToken).toBeDefined()
      
      // 5. セッション検証
      const sessionData = await verifySession(sessionToken)
      expect(sessionData).toBeDefined()
      expect(sessionData?.userId).toBe(user.id)
      
      // 6. 権限チェック
      expect(hasPermission(user, Permission.READ)).toBe(true)
      expect(hasPermission(user, Permission.WRITE)).toBe(true)
      expect(hasPermission(user, Permission.ADMIN)).toBe(false)
    })

    it('異常系: セッションタイムアウト後のアクセス拒否', async () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        roles: [Role.USER]
      }
      
      // セッション作成
      const sessionToken = await createSession(user)
      
      // 2時間進める（1時間でタイムアウト）
      vi.advanceTimersByTime(2 * 60 * 60 * 1000)
      
      // セッション検証（失敗する）
      const sessionData = await verifySession(sessionToken)
      expect(sessionData).toBeNull()
    })
  })

  describe('XSS攻撃防御の統合テスト', () => {
    it('正常系: フォーム入力のXSS攻撃を防ぐ', () => {
      // 悪意のあるスクリプトを含む入力
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<div onclick="alert(\'xss\')">Click me</div>',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(1)"></iframe>'
      ]
      
      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        
        // HTMLタグがすべて除去されることを確認
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
        expect(sanitized).not.toContain('script')
        expect(sanitized).not.toContain('onerror')
        expect(sanitized).not.toContain('onclick')
      })
    })

    it('正常系: ユーザープロフィール更新時のXSS対策', () => {
      const userInput = {
        name: '<script>alert("hack")</script>John Doe',
        bio: 'Hello <img src="x" onerror="alert(1)"> World',
        website: 'https://example.com<script>alert(1)</script>'
      }
      
      const sanitizedInput = {
        name: sanitizeInput(userInput.name),
        bio: sanitizeInput(userInput.bio),
        website: sanitizeInput(userInput.website)
      }
      
      expect(sanitizedInput.name).toBe('John Doe')
      expect(sanitizedInput.bio).toBe('Hello  World')
      expect(sanitizedInput.website).toBe('https://example.com')
    })
  })

  describe('SQLインジェクション攻撃防御の統合テスト', () => {
    it('正常系: 検索クエリのSQLインジェクション攻撃を防ぐ', () => {
      const maliciousQueries = [
        "'; DROP TABLE users; --",
        "admin' OR '1'='1",
        "1; UPDATE users SET password='hacked' WHERE id=1; --",
        "UNION SELECT password FROM admin_users",
        "'; INSERT INTO users (name) VALUES ('hacker'); --"
      ]
      
      maliciousQueries.forEach(query => {
        // SQLインジェクション攻撃を検出
        expect(isSqlInjectionAttempt(query)).toBe(true)
        
        // 危険な文字を除去
        const sanitized = sanitizeSqlInput(query)
        expect(sanitized).not.toContain("'")
        expect(sanitized).not.toContain(';')
        expect(sanitized).not.toContain('--')
      })
    })

    it('正常系: ユーザー検索での安全な入力処理', () => {
      const safeSearchTerms = [
        'john doe',
        'user@example.com',
        'company name inc',
        '123-456-7890'
      ]
      
      safeSearchTerms.forEach(term => {
        expect(isSqlInjectionAttempt(term)).toBe(false)
        
        const sanitized = sanitizeSqlInput(term)
        expect(sanitized).toBe(term) // 安全な入力は変更されない
      })
    })
  })

  describe('ロールベースアクセス制御の統合テスト', () => {
    it('正常系: 管理者機能への適切なアクセス制御', () => {
      const adminUser: User = {
        id: '1',
        email: 'admin@example.com',
        roles: [Role.ADMIN]
      }
      
      const regularUser: User = {
        id: '2',
        email: 'user@example.com',
        roles: [Role.USER]
      }
      
      // 管理者は全ての操作が可能
      expect(hasPermission(adminUser, Permission.READ)).toBe(true)
      expect(hasPermission(adminUser, Permission.WRITE)).toBe(true)
      expect(hasPermission(adminUser, Permission.DELETE)).toBe(true)
      expect(hasPermission(adminUser, Permission.ADMIN)).toBe(true)
      
      // 一般ユーザーは制限された操作のみ可能
      expect(hasPermission(regularUser, Permission.READ)).toBe(true)
      expect(hasPermission(regularUser, Permission.WRITE)).toBe(true)
      expect(hasPermission(regularUser, Permission.DELETE)).toBe(false)
      expect(hasPermission(regularUser, Permission.ADMIN)).toBe(false)
    })

    it('正常系: リソースアクセス制御のシナリオ', () => {
      const ownerUser: User = {
        id: '1',
        email: 'owner@example.com',
        roles: [Role.USER]
      }
      
      const otherUser: User = {
        id: '2',
        email: 'other@example.com',
        roles: [Role.USER]
      }
      
      const { canAccessResource } = require('@/shared/lib/auth/rbac')
      
      // プライベートリソース
      const privateResource = {
        ownerId: '1',
        isPublic: false
      }
      
      // 所有者はアクセス可能
      expect(canAccessResource(ownerUser, privateResource, Permission.READ)).toBe(true)
      expect(canAccessResource(ownerUser, privateResource, Permission.WRITE)).toBe(true)
      
      // 他のユーザーはアクセス不可
      expect(canAccessResource(otherUser, privateResource, Permission.READ)).toBe(false)
      expect(canAccessResource(otherUser, privateResource, Permission.WRITE)).toBe(false)
      
      // 公開リソース
      const publicResource = {
        ownerId: '1',
        isPublic: true
      }
      
      // 両方のユーザーが読み取り可能
      expect(canAccessResource(ownerUser, publicResource, Permission.READ)).toBe(true)
      expect(canAccessResource(otherUser, publicResource, Permission.READ)).toBe(true)
    })
  })

  describe('セキュリティイベントの統合テスト', () => {
    it('正常系: 複数の攻撃ベクターを組み合わせた攻撃の防御', () => {
      // XSSとSQLインジェクションを組み合わせた攻撃
      const complexAttack = `<script>
        fetch('/api/users?id=' + encodeURIComponent("1' OR '1'='1"))
        .then(() => alert('XSS + SQL Injection'))
      </script>`
      
      // XSS対策
      const xssSanitized = sanitizeInput(complexAttack)
      expect(xssSanitized).not.toContain('<script>')
      expect(xssSanitized).not.toContain('</script>')
      
      // SQLインジェクション検出
      expect(isSqlInjectionAttempt(complexAttack)).toBe(true)
      
      // SQL入力サニタイズ
      const sqlSanitized = sanitizeSqlInput(complexAttack)
      expect(sqlSanitized).not.toContain("'")
      expect(sqlSanitized).not.toContain(';')
    })

    it('正常系: セッションハイジャック攻撃の防御', async () => {
      const user: User = {
        id: '1',
        email: 'user@example.com',
        roles: [Role.USER]
      }
      
      // 正常なセッション作成
      const sessionToken1 = await createSession(user)
      const sessionToken2 = await createSession(user)
      
      // 異なるセッショントークンが生成される
      expect(sessionToken1).not.toBe(sessionToken2)
      
      // 両方のセッションが有効
      const session1Data = await verifySession(sessionToken1)
      const session2Data = await verifySession(sessionToken2)
      
      expect(session1Data?.userId).toBe(user.id)
      expect(session2Data?.userId).toBe(user.id)
      
      // セッションが独立している
      expect(session1Data?.createdAt).not.toBe(session2Data?.createdAt)
    })
  })
})