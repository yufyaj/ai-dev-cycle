import { SignJWT, jwtVerify } from 'jose'
import type { User } from './rbac'

/**
 * セッション管理ユーティリティ
 * JWTを使用した安全なセッション管理（1時間タイムアウト）
 */

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

const SESSION_TIMEOUT = 60 * 60 * 1000 // 1時間（ミリ秒）
const ALGORITHM = 'HS256'

export interface SessionData {
  userId: string
  email: string
  roles: string[]
  createdAt: number
  expiresAt: number
}

/**
 * セッショントークンを作成する
 * @param user ユーザー情報
 * @returns JWTトークン
 */
export async function createSession(user: User): Promise<string> {
  if (!user || !user.id || !user.email) {
    throw new Error('Invalid user data')
  }

  const now = Date.now()
  const expiresAt = now + SESSION_TIMEOUT

  const payload: SessionData = {
    userId: user.id,
    email: user.email,
    roles: user.roles,
    createdAt: now,
    expiresAt
  }

  try {
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: ALGORITHM })
      .setIssuedAt(now / 1000)
      .setExpirationTime(expiresAt / 1000)
      .setSubject(user.id)
      .sign(JWT_SECRET)

    return jwt
  } catch (error) {
    throw new Error('Failed to create session token')
  }
}

/**
 * セッショントークンを検証する
 * @param token JWTトークン
 * @returns セッションデータまたはnull
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  if (!token || typeof token !== 'string') {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: [ALGORITHM]
    })

    const sessionData = payload as unknown as SessionData
    const now = Date.now()

    // タイムアウトチェック
    if (sessionData.expiresAt < now) {
      return null
    }

    // セッションの有効性チェック
    if (!sessionData.userId || !sessionData.email) {
      return null
    }

    return sessionData
  } catch (error) {
    return null
  }
}

/**
 * セッションを更新する（新しい有効期限を設定）
 * @param token 既存のセッショントークン
 * @returns 新しいセッショントークンまたはnull
 */
export async function refreshSession(token: string): Promise<string | null> {
  const sessionData = await verifySession(token)
  
  if (!sessionData) {
    return null
  }

  const user: User = {
    id: sessionData.userId,
    email: sessionData.email,
    roles: sessionData.roles as any[]
  }

  try {
    return await createSession(user)
  } catch (error) {
    return null
  }
}

/**
 * セッションが有効かチェックする
 * @param token JWTトークン
 * @returns セッションが有効かどうか
 */
export async function isSessionValid(token: string): Promise<boolean> {
  const sessionData = await verifySession(token)
  return sessionData !== null
}

/**
 * セッションからユーザー情報を取得する
 * @param token JWTトークン
 * @returns ユーザー情報またはnull
 */
export async function getUserFromSession(token: string): Promise<User | null> {
  const sessionData = await verifySession(token)
  
  if (!sessionData) {
    return null
  }

  return {
    id: sessionData.userId,
    email: sessionData.email,
    roles: sessionData.roles as any[]
  }
}

/**
 * セッションの残り時間を取得する（秒）
 * @param token JWTトークン
 * @returns 残り時間（秒）またはnull
 */
export async function getSessionTimeRemaining(token: string): Promise<number | null> {
  const sessionData = await verifySession(token)
  
  if (!sessionData) {
    return null
  }

  const now = Date.now()
  const remaining = Math.max(0, sessionData.expiresAt - now)
  
  return Math.floor(remaining / 1000) // 秒に変換
}

/**
 * HttpOnly Cookieの設定オプション
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: SESSION_TIMEOUT / 1000, // 秒に変換
  path: '/'
}