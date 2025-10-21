import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '@/shared/lib/auth/password'
import { createSession, COOKIE_OPTIONS } from '@/shared/lib/auth/session'
import { sanitizeInput } from '@/shared/lib/security/xss-protection'
import { sanitizeSqlInput } from '@/shared/lib/security/sql-injection'
import { Role, type User } from '@/shared/lib/auth/rbac'

// 入力バリデーションスキーマ
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// デモ用のユーザーデータベース（実際の実装では適切なDBを使用）
const DEMO_USERS: Array<User & { hashedPassword: string }> = [
  {
    id: '1',
    email: 'admin@example.com',
    roles: [Role.ADMIN],
    hashedPassword: '$2a$12$rqBZ2LlX5dJ6QOHJw4jfpOP6CXy.JFyLYg8k9H9e8A4OlU5F6p.Iq' // 'AdminPass123!'
  },
  {
    id: '2',
    email: 'user@example.com',
    roles: [Role.USER],
    hashedPassword: '$2a$12$XGJzKM8jUH7e5P7QQyNhYuZ5G.HrH1K2V1A7TLz8Q6WuP.Z4z5h6K' // 'UserPass123!'
  }
]

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを解析
    const body = await request.json()
    
    // 入力値をサニタイズ
    const sanitizedBody = {
      email: sanitizeInput(sanitizeSqlInput(body.email || '')),
      password: body.password || ''
    }
    
    // バリデーション
    const validationResult = loginSchema.safeParse(sanitizedBody)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed',
          errors: validationResult.error.errors.map(e => e.message)
        },
        { status: 400 }
      )
    }
    
    const { email, password } = validationResult.data
    
    // ユーザーを検索（実際の実装では適切なDBクエリを使用）
    const user = DEMO_USERS.find(u => u.email === email)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // パスワード検証
    const isValidPassword = await verifyPassword(password, user.hashedPassword)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // セッション作成
    const sessionToken = await createSession({
      id: user.id,
      email: user.email,
      roles: user.roles
    })
    
    // HttpOnly Cookieでセッションを設定
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles
      }
    })
    
    response.cookies.set('session', sessionToken, COOKIE_OPTIONS)
    
    return response
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}