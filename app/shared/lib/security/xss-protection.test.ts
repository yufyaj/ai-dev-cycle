import { describe, it, expect } from 'vitest'
import { 
  sanitizeInput, 
  escapeHtml, 
  sanitizeMultipleInputs, 
  sanitizeObject 
} from './xss-protection'

describe('XSS Protection', () => {
  describe('sanitizeInput', () => {
    it('正常系: 通常のテキストはそのまま返す', () => {
      const input = 'Hello World'
      expect(sanitizeInput(input)).toBe('Hello World')
    })

    it('正常系: HTMLタグをすべて除去する', () => {
      const input = '<script>alert("xss")</script>Hello'
      expect(sanitizeInput(input)).toBe('Hello')
    })

    it('正常系: 複数のHTMLタグを除去する', () => {
      const input = '<div><script>alert("xss")</script><p>Hello</p></div>'
      expect(sanitizeInput(input)).toBe('Hello')
    })

    it('正常系: 自己終了タグを除去する', () => {
      const input = 'Hello<br/>World<img src="x"/>'
      expect(sanitizeInput(input)).toBe('HelloWorld')
    })

    it('正常系: ネストしたタグを除去する', () => {
      const input = '<div><span><b>Hello</b></span></div>'
      expect(sanitizeInput(input)).toBe('Hello')
    })

    it('正常系: 属性付きタグを除去する', () => {
      const input = '<div class="test" id="demo">Hello</div>'
      expect(sanitizeInput(input)).toBe('Hello')
    })

    it('異常系: 非文字列入力でエラーを投げる', () => {
      expect(() => sanitizeInput(123 as any)).toThrow('Input must be a string')
      expect(() => sanitizeInput(null as any)).toThrow('Input must be a string')
      expect(() => sanitizeInput(undefined as any)).toThrow('Input must be a string')
    })
  })

  describe('escapeHtml', () => {
    it('正常系: HTMLエスケープを正しく行う', () => {
      const input = '<script>alert("xss")</script>'
      expect(escapeHtml(input)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('正常系: アンパサンドをエスケープする', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B')
    })

    it('正常系: クォートをエスケープする', () => {
      expect(escapeHtml(`"test" & 'value'`)).toBe('&quot;test&quot; &amp; &#039;value&#039;')
    })

    it('異常系: 非文字列入力でエラーを投げる', () => {
      expect(() => escapeHtml(123 as any)).toThrow('Input must be a string')
    })
  })

  describe('sanitizeMultipleInputs', () => {
    it('正常系: 複数の入力をサニタイズする', () => {
      const inputs = ['<script>alert(1)</script>Hello', 'World<br/>']
      const result = sanitizeMultipleInputs(inputs)
      expect(result).toEqual(['Hello', 'World'])
    })

    it('正常系: 空配列を処理する', () => {
      expect(sanitizeMultipleInputs([])).toEqual([])
    })
  })

  describe('sanitizeObject', () => {
    it('正常系: オブジェクトの文字列値をサニタイズする', () => {
      const obj = {
        name: '<script>alert(1)</script>John',
        age: 25,
        bio: 'Hello<br/>World'
      }
      const result = sanitizeObject(obj)
      expect(result).toEqual({
        name: 'John',
        age: 25,
        bio: 'HelloWorld'
      })
    })

    it('正常系: 文字列以外の値は変更しない', () => {
      const obj = {
        name: 'John',
        age: 25,
        active: true,
        data: null
      }
      const result = sanitizeObject(obj)
      expect(result).toEqual(obj)
    })
  })
})