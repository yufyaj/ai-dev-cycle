export type UserRole = 'admin' | 'worker' | 'client'

export interface User {
  id: string
  email: string
  role: UserRole
  name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface AuthSession {
  user: User
  expiresAt: Date
  isAuthenticated: boolean
}