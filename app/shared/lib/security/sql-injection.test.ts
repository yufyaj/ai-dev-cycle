import { describe, it, expect } from 'vitest'
import {
  isSqlInjectionAttempt,
  sanitizeSqlInput,
  escapeSqlParameter,
  sanitizeWhereClause,
  sanitizeMultipleSqlInputs,
  sanitizeSqlObject,
  validateQueryParameters
} from './sql-injection'

describe('SQL Injection Protection', () => {
  describe('isSqlInjectionAttempt', () => {
    it('正常系: 通常のテキストで false を返す', () => {
      expect(isSqlInjectionAttempt('Hello World')).toBe(false)
      expect(isSqlInjectionAttempt('user@example.com')).toBe(false)
      expect(isSqlInjectionAttempt('John Doe')).toBe(false)
    })

    it('正常系: SQLインジェクション攻撃パターンで true を返す', () => {
      expect(isSqlInjectionAttempt("' OR 1=1 --")).toBe(true)
      expect(isSqlInjectionAttempt('SELECT * FROM users')).toBe(true)
      expect(isSqlInjectionAttempt('DROP TABLE users')).toBe(true)
      expect(isSqlInjectionAttempt("admin'; DELETE FROM users; --")).toBe(true)
      expect(isSqlInjectionAttempt('UNION SELECT password FROM admin')).toBe(true)
    })

    it('正常系: 非文字列入力で false を返す', () => {
      expect(isSqlInjectionAttempt(123 as any)).toBe(false)
      expect(isSqlInjectionAttempt(null as any)).toBe(false)
      expect(isSqlInjectionAttempt(undefined as any)).toBe(false)
    })
  })

  describe('sanitizeSqlInput', () => {
    it('正常系: 通常のテキストはそのまま返す', () => {
      expect(sanitizeSqlInput('Hello World')).toBe('Hello World')
      expect(sanitizeSqlInput('user@example.com')).toBe('user@example.com')
    })

    it('正常系: 危険な文字を除去する', () => {
      expect(sanitizeSqlInput("test'value")).toBe('testvalue')
      expect(sanitizeSqlInput('test"value')).toBe('testvalue')
      expect(sanitizeSqlInput('test;value')).toBe('testvalue')
      expect(sanitizeSqlInput('test--value')).toBe('testvalue')
      expect(sanitizeSqlInput('test/*comment*/value')).toBe('testvalue')
    })

    it('正常系: 連続する空白を単一の空白に変換', () => {
      expect(sanitizeSqlInput('test   value')).toBe('test value')
      expect(sanitizeSqlInput('  test  value  ')).toBe('test value')
    })

    it('異常系: 非文字列入力でエラーを投げる', () => {
      expect(() => sanitizeSqlInput(123 as any)).toThrow('Input must be a string')
      expect(() => sanitizeSqlInput(null as any)).toThrow('Input must be a string')
    })
  })

  describe('escapeSqlParameter', () => {
    it('正常系: 文字列を正しくエスケープする', () => {
      expect(escapeSqlParameter('test')).toBe("'test'")
      expect(escapeSqlParameter("test'value")).toBe("'test''value'")
      expect(escapeSqlParameter('test"value')).toBe("'test\"value'")
    })

    it('正常系: 数値をそのまま返す', () => {
      expect(escapeSqlParameter(123)).toBe('123')
      expect(escapeSqlParameter(0)).toBe('0')
      expect(escapeSqlParameter(-45.67)).toBe('-45.67')
    })

    it('正常系: 真偽値を数値に変換', () => {
      expect(escapeSqlParameter(true)).toBe('1')
      expect(escapeSqlParameter(false)).toBe('0')
    })

    it('正常系: null/undefined を NULL に変換', () => {
      expect(escapeSqlParameter(null)).toBe('NULL')
      expect(escapeSqlParameter(undefined)).toBe('NULL')
    })
  })

  describe('sanitizeWhereClause', () => {
    it('正常系: 安全な入力をそのまま返す', () => {
      expect(sanitizeWhereClause('user123')).toBe('user123')
      expect(sanitizeWhereClause('example@email.com')).toBe('example@email.com')
    })

    it('異常系: SQLインジェクション攻撃でエラーを投げる', () => {
      expect(() => sanitizeWhereClause("' OR 1=1 --")).toThrow('Potential SQL injection detected')
      expect(() => sanitizeWhereClause('SELECT * FROM users')).toThrow('Potential SQL injection detected')
    })

    it('異常系: 非文字列入力でエラーを投げる', () => {
      expect(() => sanitizeWhereClause(123 as any)).toThrow('Input must be a string')
    })
  })

  describe('sanitizeMultipleSqlInputs', () => {
    it('正常系: 複数の入力をサニタイズする', () => {
      const inputs = ['test"value', "another'input", 'normal text']
      const result = sanitizeMultipleSqlInputs(inputs)
      
      expect(result).toEqual(['testvalue', 'anotherinput', 'normal text'])
    })

    it('正常系: 空配列を処理する', () => {
      expect(sanitizeMultipleSqlInputs([])).toEqual([])
    })
  })

  describe('sanitizeSqlObject', () => {
    it('正常系: オブジェクトの文字列プロパティをサニタイズ', () => {
      const obj = {
        name: "test'value",
        age: 25,
        email: 'user"@example.com'
      }
      
      const result = sanitizeSqlObject(obj)
      
      expect(result).toEqual({
        name: 'testvalue',
        age: 25,
        email: 'user@example.com'
      })
    })

    it('正常系: 文字列以外のプロパティは変更しない', () => {
      const obj = {
        name: 'John',
        age: 30,
        active: true,
        data: null
      }
      
      const result = sanitizeSqlObject(obj)
      expect(result).toEqual(obj)
    })
  })

  describe('validateQueryParameters', () => {
    const schema = {
      name: 'string' as const,
      age: 'number' as const,
      active: 'boolean' as const
    }

    it('正常系: 有効なパラメータを検証する', () => {
      const params = {
        name: 'John Doe',
        age: 30,
        active: true
      }
      
      const result = validateQueryParameters(params, schema)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedParams).toEqual({
        name: 'John Doe',
        age: 30,
        active: true
      })
    })

    it('正常系: 文字列の数値と真偽値を変換する', () => {
      const params = {
        name: 'John Doe',
        age: '30',
        active: 'true'
      }
      
      const result = validateQueryParameters(params, schema)
      
      expect(result.isValid).toBe(true)
      expect(result.sanitizedParams).toEqual({
        name: 'John Doe',
        age: 30,
        active: true
      })
    })

    it('異常系: 必須パラメータが不足している場合', () => {
      const params = {
        name: 'John Doe'
        // age と active が不足
      }
      
      const result = validateQueryParameters(params, schema)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing required parameter: age')
      expect(result.errors).toContain('Missing required parameter: active')
    })

    it('異常系: 型が一致しない場合', () => {
      const params = {
        name: 123, // 文字列である必要がある
        age: 'not-a-number', // 数値である必要がある
        active: 'maybe' // 真偽値である必要がある
      }
      
      const result = validateQueryParameters(params, schema)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Parameter name must be a string')
      expect(result.errors).toContain('Parameter age must be a number')
      expect(result.errors).toContain('Parameter active must be a boolean')
    })

    it('異常系: SQLインジェクション攻撃を含む文字列パラメータ', () => {
      const params = {
        name: "'; DROP TABLE users; --",
        age: 30,
        active: true
      }
      
      const result = validateQueryParameters(params, schema)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('Invalid parameter name'))).toBe(true)
    })
  })
})