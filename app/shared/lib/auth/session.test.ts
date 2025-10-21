import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  createSession, 
  verifySession, 
  refreshSession, 
  isSessionValid, 
  getUserFromSession, 
  getSessionTimeRemaining,
  type SessionData 
} from './session'
import { Role, type User } from './rbac'

describe('Session Management', () => {
  const testUser: User = {
    id: '123',
    email: 'test@example.com',
    roles: [Role.USER]
  }

  beforeEach(() => {
    // 時間をモックする
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createSession', () => {
    it('正常系: 有効なセッショントークンを作成する', async () => {
      const token = await createSession(testUser)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(50)
    })

    it('異常系: 無効なユーザーデータでエラーを投げる', async () => {
      const invalidUser = { id: '', email: '', roles: [] } as User
      
      await expect(createSession(invalidUser)).rejects.toThrow('Invalid user data')
    })

    it('異常系: nullユーザーでエラーを投げる', async () => {
      await expect(createSession(null as any)).rejects.toThrow('Invalid user data')
    })
  })

  describe('verifySession', () => {
    it('正常系: 有効なトークンを検証する', async () => {
      const token = await createSession(testUser)
      const sessionData = await verifySession(token)
      
      expect(sessionData).toBeDefined()
      expect(sessionData?.userId).toBe(testUser.id)
      expect(sessionData?.email).toBe(testUser.email)
      expect(sessionData?.roles).toEqual(testUser.roles)
    })

    it('正常系: タイムアウトしたトークンでnullを返す', async () => {
      const token = await createSession(testUser)
      
      // 2時間進める（セッション有効期限は1時間）
      vi.advanceTimersByTime(2 * 60 * 60 * 1000)
      
      const sessionData = await verifySession(token)
      expect(sessionData).toBeNull()
    })

    it('異常系: 無効なトークンでnullを返す', async () => {
      const sessionData = await verifySession('invalid-token')
      expect(sessionData).toBeNull()
    })

    it('異常系: 空文字列でnullを返す', async () => {
      const sessionData = await verifySession('')
      expect(sessionData).toBeNull()
    })

    it('異常系: null値でnullを返す', async () => {
      const sessionData = await verifySession(null as any)
      expect(sessionData).toBeNull()
    })
  })

  describe('refreshSession', () => {
    it('正常系: 有効なトークンを更新する', async () => {
      const originalToken = await createSession(testUser)
      
      // 30分進める
      vi.advanceTimersByTime(30 * 60 * 1000)
      
      const newToken = await refreshSession(originalToken)
      
      expect(newToken).toBeDefined()
      expect(newToken).not.toBe(originalToken)
      
      const sessionData = await verifySession(newToken!)
      expect(sessionData?.userId).toBe(testUser.id)
    })

    it('異常系: 無効なトークンでnullを返す', async () => {
      const newToken = await refreshSession('invalid-token')
      expect(newToken).toBeNull()
    })

    it('異常系: タイムアウトしたトークンでnullを返す', async () => {
      const originalToken = await createSession(testUser)
      
      // 2時間進める
      vi.advanceTimersByTime(2 * 60 * 60 * 1000)
      
      const newToken = await refreshSession(originalToken)
      expect(newToken).toBeNull()
    })
  })

  describe('isSessionValid', () => {
    it('正常系: 有効なセッションでtrueを返す', async () => {
      const token = await createSession(testUser)
      const isValid = await isSessionValid(token)
      
      expect(isValid).toBe(true)
    })

    it('正常系: 無効なセッションでfalseを返す', async () => {
      const isValid = await isSessionValid('invalid-token')
      expect(isValid).toBe(false)
    })

    it('正常系: タイムアウトしたセッションでfalseを返す', async () => {
      const token = await createSession(testUser)
      
      // 2時間進める
      vi.advanceTimersByTime(2 * 60 * 60 * 1000)
      
      const isValid = await isSessionValid(token)
      expect(isValid).toBe(false)
    })
  })

  describe('getUserFromSession', () => {
    it('正常系: セッションからユーザー情報を取得する', async () => {
      const token = await createSession(testUser)
      const user = await getUserFromSession(token)
      
      expect(user).toBeDefined()
      expect(user?.id).toBe(testUser.id)
      expect(user?.email).toBe(testUser.email)
      expect(user?.roles).toEqual(testUser.roles)
    })

    it('異常系: 無効なトークンでnullを返す', async () => {
      const user = await getUserFromSession('invalid-token')
      expect(user).toBeNull()
    })
  })

  describe('getSessionTimeRemaining', () => {
    it('正常系: セッションの残り時間を正しく計算する', async () => {
      const token = await createSession(testUser)
      
      // 30分進める
      vi.advanceTimersByTime(30 * 60 * 1000)
      
      const remaining = await getSessionTimeRemaining(token)
      
      expect(remaining).toBeDefined()
      expect(remaining).toBe(30 * 60) // 30分 = 1800秒
    })

    it('正常系: タイムアウト時に0を返す', async () => {
      const token = await createSession(testUser)
      
      // 1時間進める
      vi.advanceTimersByTime(60 * 60 * 1000)
      
      const remaining = await getSessionTimeRemaining(token)
      
      expect(remaining).toBeNull()
    })

    it('異常系: 無効なトークンでnullを返す', async () => {
      const remaining = await getSessionTimeRemaining('invalid-token')
      expect(remaining).toBeNull()
    })

    it('正常系: セッション作成直後は1時間（3600秒）を返す', async () => {
      const token = await createSession(testUser)
      const remaining = await getSessionTimeRemaining(token)
      
      expect(remaining).toBe(60 * 60) // 1時間 = 3600秒
    })
  })
})