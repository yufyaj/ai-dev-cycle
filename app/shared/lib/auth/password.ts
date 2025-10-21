import bcrypt from 'bcryptjs'

/**
 * パスワード管理ユーティリティ
 * bcryptを使用した安全なパスワードハッシュ化
 */

const SALT_ROUNDS = 12 // 高いセキュリティレベル

/**
 * パスワードをハッシュ化する
 * @param password プレーンテキストのパスワード
 * @returns ハッシュ化されたパスワード
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string')
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }
  
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS)
    return await bcrypt.hash(password, salt)
  } catch (error) {
    throw new Error('Failed to hash password')
  }
}

/**
 * パスワードを検証する
 * @param password プレーンテキストのパスワード
 * @param hashedPassword ハッシュ化されたパスワード
 * @returns パスワードが一致するかどうか
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false
  }
  
  if (typeof password !== 'string' || typeof hashedPassword !== 'string') {
    return false
  }
  
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    return false
  }
}

/**
 * パスワードの強度を検証する
 * @param password パスワード
 * @returns 検証結果
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!password || typeof password !== 'string') {
    errors.push('Password must be a string')
    return { isValid: false, errors }
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}