import { NextRequest, NextResponse } from 'next/server'
import { type UserRole } from '@/types/auth'

const ROLE_ROUTES: Record<UserRole, string[]> = {
  admin: ['/admin', '/api/admin'],
  worker: ['/worker', '/api/worker'],
  client: ['/client', '/api/client']
}

const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/logout']

export function checkRoleAccess(pathname: string, userRole: UserRole): boolean {
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return true
  }

  const allowedRoutes = ROLE_ROUTES[userRole] || []
  return allowedRoutes.some(route => pathname.startsWith(route))
}

export function createRBACMiddleware() {
  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const response = await fetch(`${request.nextUrl.origin}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': request.headers.get('cookie') || ''
        }
      })

      if (!response.ok) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const { user } = await response.json()
      
      if (!checkRoleAccess(pathname, user.role)) {
        return new NextResponse('Forbidden', { status: 403 })
      }

      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
}