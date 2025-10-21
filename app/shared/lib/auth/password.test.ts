import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, validatePasswordStrength } from './password'

describe('Password Management', () => {
  describe('hashPassword', () => {
    it('正常系: パスワードを正しくハッシュ化する', async () => {
      const password = 'TestPass123!'
      const hashed = await hashPassword(password)
      
      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)
      expect(hashed.length).toBeGreaterThan(50)
    })

    it('正常系: 同じパスワードでも異なるハッシュを生成する', async () => {
      const password = 'TestPass123!'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })

    it('異常系: 空のパスワードでエラーを投げる', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string')
    })

    it('異常系: 非文字列パスワードでエラーを投げる', async () => {
      await expect(hashPassword(123 as any)).rejects.toThrow('Password must be a non-empty string')
    })

    it('異常系: 短すぎるパスワードでエラーを投げる', async () => {
      await expect(hashPassword('123')).rejects.toThrow('Password must be at least 8 characters long')
    })
  })

  describe('verifyPassword', () => {
    it('正常系: 正しいパスワードで true を返す', async () => {
      const password = 'TestPass123!'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword(password, hashed)
      
      expect(isValid).toBe(true)
    })

    it('正常系: 間違ったパスワードで false を返す', async () => {
      const password = 'TestPass123!'
      const wrongPassword = 'WrongPass123!'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hashed)
      
      expect(isValid).toBe(false)
    })

    it('異常系: 空のパスワードで false を返す', async () => {
      const hashed = await hashPassword('TestPass123!')
      const isValid = await verifyPassword('', hashed)
      
      expect(isValid).toBe(false)
    })

    it('異常系: 空のハッシュで false を返す', async () => {
      const isValid = await verifyPassword('TestPass123!', '')
      
      expect(isValid).toBe(false)
    })

    it('異常系: 非文字列入力で false を返す', async () => {
      const hashed = await hashPassword('TestPass123!')
      const isValid = await verifyPassword(123 as any, hashed)
      
      expect(isValid).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('正常系: 強いパスワードで valid を返す', () => {
      const password = 'TestPass123!'
      const result = validatePasswordStrength(password)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('異常系: 短いパスワードで invalid を返す', () => {
      const password = 'Test1!'
      const result = validatePasswordStrength(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('異常系: 大文字がないパスワードで invalid を返す', () => {
      const password = 'testpass123!'
      const result = validatePasswordStrength(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('異常系: 小文字がないパスワードで invalid を返す', () => {
      const password = 'TESTPASS123!'
      const result = validatePasswordStrength(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('異常系: 数字がないパスワードで invalid を返す', () => {
      const password = 'TestPassword!'
      const result = validatePasswordStrength(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('異常系: 特殊文字がないパスワードで invalid を返す', () => {
      const password = 'TestPass123'
      const result = validatePasswordStrength(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('異常系: 非文字列入力で invalid を返す', () => {
      const result = validatePasswordStrength(123 as any)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be a string')
    })
  })
})