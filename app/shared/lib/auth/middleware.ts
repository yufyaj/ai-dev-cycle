import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserFromSession } from './session'
import { hasPermission, hasRole, type User } from './rbac'
import type { Permission, Role } from './rbac'

/**
 * 認証ミドルウェアの結果
 */
export interface AuthResult {
  success: boolean
  user: User | null
  message?: string
}

/**
 * リクエストから認証情報を取得する
 * @param request Next.js リクエストオブジェクト
 * @returns 認証結果
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // セッションCookieを取得
    const sessionToken = request.cookies.get('session')?.value
    
    if (!sessionToken) {
      return {
        success: false,
        user: null,
        message: 'No session token provided'
      }
    }
    
    // セッションを検証
    const user = await getUserFromSession(sessionToken)
    
    if (!user) {
      return {
        success: false,
        user: null,
        message: 'Invalid or expired session'
      }
    }
    
    return {
      success: true,
      user,
      message: 'Authentication successful'
    }
    
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      user: null,
      message: 'Authentication failed'
    }
  }
}

/**
 * 認証が必要なAPIルートハンドラー用のラッパー
 * @param handler 元のハンドラー関数
 * @param options 認証オプション
 * @returns ラップされたハンドラー
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: { user: User }, ...args: T) => Promise<NextResponse>,
  options: {
    requiredPermission?: Permission
    requiredRole?: Role
    allowGuest?: boolean
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request)
    
    // 認証失敗
    if (!authResult.success || !authResult.user) {
      if (options.allowGuest) {
        // ゲストアクセスを許可
        return handler(request, { user: authResult.user! }, ...args)
      }
      
      return NextResponse.json(
        { success: false, message: authResult.message || 'Authentication required' },
        { status: 401 }
      )
    }
    
    const user = authResult.user
    
    // 権限チェック
    if (options.requiredPermission && !hasPermission(user, options.requiredPermission)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // ロールチェック
    if (options.requiredRole && !hasRole(user, options.requiredRole)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient role privileges' },
        { status: 403 }
      )
    }
    
    // 認証・認可が成功した場合、元のハンドラーを実行
    return handler(request, { user }, ...args)
  }
}

/**
 * セッション更新用のミドルウェア
 * @param request Next.js リクエストオブジェクト
 * @param response Next.js レスポンスオブジェクト
 * @returns 更新されたレスポンス
 */
export async function refreshSessionMiddleware(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  try {
    const sessionToken = request.cookies.get('session')?.value
    
    if (!sessionToken) {
      return response
    }
    
    // セッションの残り時間をチェック
    const { getSessionTimeRemaining, refreshSession } = await import('./session')
    const timeRemaining = await getSessionTimeRemaining(sessionToken)
    
    // 残り時間が15分以下の場合、セッションを更新
    if (timeRemaining !== null && timeRemaining < 15 * 60) {
      const newToken = await refreshSession(sessionToken)
      
      if (newToken) {
        const { COOKIE_OPTIONS } = await import('./session')
        response.cookies.set('session', newToken, COOKIE_OPTIONS)
      }
    }
    
    return response
    
  } catch (error) {
    console.error('Session refresh error:', error)
    return response
  }
}

/**
 * 認証状態を返すAPI用のヘルパー
 * @param request Next.js リクエストオブジェクト
 * @returns 認証状態のレスポンス
 */
export async function getAuthStatus(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateRequest(request)
  
  if (authResult.success && authResult.user) {
    return NextResponse.json({
      authenticated: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        roles: authResult.user.roles
      }
    })
  }
  
  return NextResponse.json({
    authenticated: false,
    user: null
  })
}