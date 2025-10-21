import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { authenticateRequest, withAuth, getAuthStatus } from './middleware'
import { Role, Permission, type User } from './rbac'

// セッション管理をモック
vi.mock('./session', () => ({
  getUserFromSession: vi.fn(),
  getSessionTimeRemaining: vi.fn(),
  refreshSession: vi.fn(),
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 3600,
    path: '/'
  }
}))

describe('Authentication Middleware', () => {
  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    roles: [Role.USER]
  }

  const adminUser: User = {
    id: '456',
    email: 'admin@example.com',
    roles: [Role.ADMIN]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authenticateRequest', () => {
    it('正常系: 有効なセッションで認証成功', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost', {
        headers: {
          cookie: 'session=valid-token'
        }
      })

      const result = await authenticateRequest(request)

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.message).toBe('Authentication successful')
    })

    it('正常系: セッションCookieがない場合', async () => {
      const request = new NextRequest('http://localhost')

      const result = await authenticateRequest(request)

      expect(result.success).toBe(false)
      expect(result.user).toBeNull()
      expect(result.message).toBe('No session token provided')
    })

    it('正常系: 無効なセッションで認証失敗', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost', {
        headers: {
          cookie: 'session=invalid-token'
        }
      })

      const result = await authenticateRequest(request)

      expect(result.success).toBe(false)
      expect(result.user).toBeNull()
      expect(result.message).toBe('Invalid or expired session')
    })
  })

  describe('withAuth', () => {
    it('正常系: 認証済みユーザーでハンドラーを実行', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(mockUser)

      const mockHandler = vi.fn().mockResolvedValue(new Response('success'))
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost', {
        headers: {
          cookie: 'session=valid-token'
        }
      })

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { user: mockUser }
      )
    })

    it('正常系: 未認証ユーザーで401を返す', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(null)

      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost')

      const response = await wrappedHandler(request)

      expect(response.status).toBe(401)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('正常系: 権限不足で403を返す', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(mockUser)

      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler, {
        requiredPermission: Permission.ADMIN
      })

      const request = new NextRequest('http://localhost', {
        headers: {
          cookie: 'session=valid-token'
        }
      })

      const response = await wrappedHandler(request)

      expect(response.status).toBe(403)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('正常系: 管理者権限で実行成功', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(adminUser)

      const mockHandler = vi.fn().mockResolvedValue(new Response('success'))
      const wrappedHandler = withAuth(mockHandler, {
        requiredRole: Role.ADMIN
      })

      const request = new NextRequest('http://localhost', {
        headers: {
          cookie: 'session=valid-token'
        }
      })

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { user: adminUser }
      )
    })

    it('正常系: ゲストアクセス許可時は未認証でも実行', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(null)

      const mockHandler = vi.fn().mockResolvedValue(new Response('success'))
      const wrappedHandler = withAuth(mockHandler, {
        allowGuest: true
      })

      const request = new NextRequest('http://localhost')

      await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalled()
    })
  })

  describe('getAuthStatus', () => {
    it('正常系: 認証済みユーザーの状態を返す', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost', {
        headers: {
          cookie: 'session=valid-token'
        }
      })

      const response = await getAuthStatus(request)
      const data = await response.json()

      expect(data.authenticated).toBe(true)
      expect(data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        roles: mockUser.roles
      })
    })

    it('正常系: 未認証ユーザーの状態を返す', async () => {
      const { getUserFromSession } = await import('./session')
      vi.mocked(getUserFromSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost')

      const response = await getAuthStatus(request)
      const data = await response.json()

      expect(data.authenticated).toBe(false)
      expect(data.user).toBeNull()
    })
  })
})