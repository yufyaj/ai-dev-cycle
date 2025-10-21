import { describe, it, expect } from 'vitest'
import { 
  Role, 
  Permission, 
  hasPermission, 
  hasRole, 
  canAccessResource, 
  requirePermission, 
  requireRole, 
  getUserPermissions,
  type User 
} from './rbac'

describe('RBAC (Role-Based Access Control)', () => {
  const adminUser: User = {
    id: '1',
    email: 'admin@example.com',
    roles: [Role.ADMIN]
  }

  const moderatorUser: User = {
    id: '2',
    email: 'mod@example.com',
    roles: [Role.MODERATOR]
  }

  const regularUser: User = {
    id: '3',
    email: 'user@example.com',
    roles: [Role.USER]
  }

  const guestUser: User = {
    id: '4',
    email: 'guest@example.com',
    roles: [Role.GUEST]
  }

  describe('hasPermission', () => {
    it('正常系: 管理者は全ての権限を持つ', () => {
      expect(hasPermission(adminUser, Permission.READ)).toBe(true)
      expect(hasPermission(adminUser, Permission.WRITE)).toBe(true)
      expect(hasPermission(adminUser, Permission.DELETE)).toBe(true)
      expect(hasPermission(adminUser, Permission.ADMIN)).toBe(true)
      expect(hasPermission(adminUser, Permission.MODERATE)).toBe(true)
    })

    it('正常系: モデレーターは適切な権限を持つ', () => {
      expect(hasPermission(moderatorUser, Permission.READ)).toBe(true)
      expect(hasPermission(moderatorUser, Permission.WRITE)).toBe(true)
      expect(hasPermission(moderatorUser, Permission.MODERATE)).toBe(true)
      expect(hasPermission(moderatorUser, Permission.DELETE)).toBe(false)
      expect(hasPermission(moderatorUser, Permission.ADMIN)).toBe(false)
    })

    it('正常系: 一般ユーザーは基本権限のみ持つ', () => {
      expect(hasPermission(regularUser, Permission.READ)).toBe(true)
      expect(hasPermission(regularUser, Permission.WRITE)).toBe(true)
      expect(hasPermission(regularUser, Permission.DELETE)).toBe(false)
      expect(hasPermission(regularUser, Permission.ADMIN)).toBe(false)
      expect(hasPermission(regularUser, Permission.MODERATE)).toBe(false)
    })

    it('正常系: ゲストは読み取り権限のみ持つ', () => {
      expect(hasPermission(guestUser, Permission.READ)).toBe(true)
      expect(hasPermission(guestUser, Permission.WRITE)).toBe(false)
      expect(hasPermission(guestUser, Permission.DELETE)).toBe(false)
      expect(hasPermission(guestUser, Permission.ADMIN)).toBe(false)
      expect(hasPermission(guestUser, Permission.MODERATE)).toBe(false)
    })

    it('異常系: null ユーザーは権限を持たない', () => {
      expect(hasPermission(null, Permission.READ)).toBe(false)
      expect(hasPermission(null, Permission.WRITE)).toBe(false)
    })

    it('異常系: ロールのないユーザーは権限を持たない', () => {
      const userWithoutRoles: User = {
        id: '5',
        email: 'norole@example.com',
        roles: []
      }
      expect(hasPermission(userWithoutRoles, Permission.READ)).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('正常系: ユーザーが指定されたロールを持つ', () => {
      expect(hasRole(adminUser, Role.ADMIN)).toBe(true)
      expect(hasRole(moderatorUser, Role.MODERATOR)).toBe(true)
      expect(hasRole(regularUser, Role.USER)).toBe(true)
      expect(hasRole(guestUser, Role.GUEST)).toBe(true)
    })

    it('正常系: ユーザーが指定されたロールを持たない', () => {
      expect(hasRole(regularUser, Role.ADMIN)).toBe(false)
      expect(hasRole(guestUser, Role.MODERATOR)).toBe(false)
    })

    it('異常系: null ユーザーはロールを持たない', () => {
      expect(hasRole(null, Role.USER)).toBe(false)
    })
  })

  describe('canAccessResource', () => {
    const publicResource = { ownerId: '999', isPublic: true }
    const privateResource = { ownerId: '3', isPublic: false }
    const userOwnedResource = { ownerId: '3', isPublic: false }

    it('正常系: 管理者は全てのリソースにアクセス可能', () => {
      expect(canAccessResource(adminUser, privateResource, Permission.DELETE)).toBe(true)
      expect(canAccessResource(adminUser, publicResource, Permission.WRITE)).toBe(true)
    })

    it('正常系: 所有者は自分のリソースにアクセス可能', () => {
      expect(canAccessResource(regularUser, userOwnedResource, Permission.READ)).toBe(true)
      expect(canAccessResource(regularUser, userOwnedResource, Permission.WRITE)).toBe(true)
    })

    it('正常系: 公開リソースには権限に応じてアクセス可能', () => {
      expect(canAccessResource(regularUser, publicResource, Permission.READ)).toBe(true)
      expect(canAccessResource(regularUser, publicResource, Permission.WRITE)).toBe(true)
      expect(canAccessResource(guestUser, publicResource, Permission.READ)).toBe(true)
    })

    it('正常系: ゲストは公開リソースの読み取りのみ可能', () => {
      expect(canAccessResource(guestUser, publicResource, Permission.READ)).toBe(true)
      expect(canAccessResource(guestUser, publicResource, Permission.WRITE)).toBe(false)
    })

    it('正常系: 非ログインユーザーは公開リソースの読み取りのみ可能', () => {
      expect(canAccessResource(null, publicResource, Permission.READ)).toBe(true)
      expect(canAccessResource(null, publicResource, Permission.WRITE)).toBe(false)
    })

    it('異常系: プライベートリソースの所有者でない場合はアクセス拒否', () => {
      expect(canAccessResource(regularUser, privateResource, Permission.READ)).toBe(false)
      expect(canAccessResource(guestUser, privateResource, Permission.READ)).toBe(false)
    })
  })

  describe('requirePermission', () => {
    it('正常系: 権限チェック関数が正しく動作する', () => {
      const requireRead = requirePermission(Permission.READ)
      const requireAdmin = requirePermission(Permission.ADMIN)

      expect(requireRead(regularUser)).toBe(true)
      expect(requireRead(guestUser)).toBe(true)
      expect(requireAdmin(adminUser)).toBe(true)
      expect(requireAdmin(regularUser)).toBe(false)
    })
  })

  describe('requireRole', () => {
    it('正常系: ロールチェック関数が正しく動作する', () => {
      const requireAdmin = requireRole(Role.ADMIN)
      const requireUser = requireRole(Role.USER)

      expect(requireAdmin(adminUser)).toBe(true)
      expect(requireAdmin(regularUser)).toBe(false)
      expect(requireUser(regularUser)).toBe(true)
      expect(requireUser(guestUser)).toBe(false)
    })
  })

  describe('getUserPermissions', () => {
    it('正常系: ユーザーの全権限を正しく取得する', () => {
      const adminPermissions = getUserPermissions(adminUser)
      expect(adminPermissions).toContain(Permission.READ)
      expect(adminPermissions).toContain(Permission.WRITE)
      expect(adminPermissions).toContain(Permission.DELETE)
      expect(adminPermissions).toContain(Permission.ADMIN)
      expect(adminPermissions).toContain(Permission.MODERATE)

      const guestPermissions = getUserPermissions(guestUser)
      expect(guestPermissions).toContain(Permission.READ)
      expect(guestPermissions).not.toContain(Permission.WRITE)
    })

    it('正常系: 複数ロールを持つユーザーの権限を取得する', () => {
      const multiRoleUser: User = {
        id: '6',
        email: 'multi@example.com',
        roles: [Role.USER, Role.MODERATOR]
      }

      const permissions = getUserPermissions(multiRoleUser)
      expect(permissions).toContain(Permission.READ)
      expect(permissions).toContain(Permission.WRITE)
      expect(permissions).toContain(Permission.MODERATE)
      expect(permissions).not.toContain(Permission.DELETE)
      expect(permissions).not.toContain(Permission.ADMIN)
    })

    it('異常系: null ユーザーは空の権限配列を返す', () => {
      expect(getUserPermissions(null)).toEqual([])
    })
  })
})