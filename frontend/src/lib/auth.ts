'use client'

import { type AuthSession, type User } from '@/types/auth'

const SESSION_TIMEOUT = 60 * 60 * 1000 // 1時間

export class SessionManager {
  private static instance: SessionManager
  private session: AuthSession | null = null
  private timeoutId: NodeJS.Timeout | null = null

  private constructor() {
    if (typeof window !== 'undefined') {
      this.loadSession()
      this.setupActivityListeners()
    }
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem('auth_session')
      if (stored) {
        const session = JSON.parse(stored)
        if (new Date() < new Date(session.expiresAt)) {
          this.session = {
            ...session,
            expiresAt: new Date(session.expiresAt)
          }
          this.refreshTimeout()
        } else {
          this.clearSession()
        }
      }
    } catch {
      this.clearSession()
    }
  }

  private setupActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    const resetTimeout = () => {
      if (this.session?.isAuthenticated) {
        this.refreshTimeout()
      }
    }

    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true)
    })
  }

  private refreshTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }

    this.timeoutId = setTimeout(() => {
      this.clearSession()
      window.location.href = '/login?timeout=true'
    }, SESSION_TIMEOUT)
  }

  setSession(user: User, token: string): void {
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT)
    
    this.session = {
      user,
      expiresAt,
      isAuthenticated: true
    }

    localStorage.setItem('auth_session', JSON.stringify(this.session))
    localStorage.setItem('auth_token', token)
    
    this.refreshTimeout()
  }

  getSession(): AuthSession | null {
    return this.session
  }

  clearSession(): void {
    this.session = null
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    localStorage.removeItem('auth_session')
    localStorage.removeItem('auth_token')
  }

  isAuthenticated(): boolean {
    return this.session?.isAuthenticated ?? false
  }

  hasRole(role: string): boolean {
    return this.session?.user.role === role
  }
}