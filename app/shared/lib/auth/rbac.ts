/**
 * RBAC (Role-Based Access Control) 実装
 * ロールベースアクセス制御システム
 */

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
  GUEST = 'guest'
}

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
  MODERATE = 'moderate'
}

export interface User {
  id: string
  email: string
  roles: Role[]
}

// ロールと権限のマッピング
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN, Permission.MODERATE],
  [Role.MODERATOR]: [Permission.READ, Permission.WRITE, Permission.MODERATE],
  [Role.USER]: [Permission.READ, Permission.WRITE],
  [Role.GUEST]: [Permission.READ]
}

/**
 * ユーザーが特定の権限を持っているかチェック
 * @param user ユーザー
 * @param permission 必要な権限
 * @returns 権限があるかどうか
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user || !user.roles || user.roles.length === 0) {
    return false
  }
  
  return user.roles.some(role => {
    const permissions = ROLE_PERMISSIONS[role]
    return permissions && permissions.includes(permission)
  })
}

/**
 * ユーザーが特定のロールを持っているかチェック
 * @param user ユーザー
 * @param role 必要なロール
 * @returns ロールを持っているかどうか
 */
export function hasRole(user: User | null, role: Role): boolean {
  if (!user || !user.roles) {
    return false
  }
  
  return user.roles.includes(role)
}

/**
 * ユーザーがリソースにアクセス可能かチェック
 * @param user ユーザー
 * @param resource リソース情報
 * @param action 実行するアクション
 * @returns アクセス可能かどうか
 */
export function canAccessResource(
  user: User | null,
  resource: { ownerId?: string; isPublic?: boolean },
  action: Permission
): boolean {
  if (!user) {
    // ゲストは公開リソースの読み取りのみ可能
    return resource.isPublic === true && action === Permission.READ
  }
  
  // 管理者は全てのリソースにアクセス可能
  if (hasRole(user, Role.ADMIN)) {
    return true
  }
  
  // 所有者は自分のリソースに対して全ての権限を持つ
  if (resource.ownerId === user.id) {
    return hasPermission(user, action)
  }
  
  // 公開リソースの場合は権限チェック
  if (resource.isPublic === true) {
    return hasPermission(user, action)
  }
  
  // プライベートリソースで所有者でない場合はアクセス拒否
  return false
}

/**
 * 権限チェック用デコレータ関数
 * @param requiredPermission 必要な権限
 * @returns デコレータ関数
 */
export function requirePermission(requiredPermission: Permission) {
  return function(user: User | null): boolean {
    return hasPermission(user, requiredPermission)
  }
}

/**
 * ロールチェック用デコレータ関数
 * @param requiredRole 必要なロール
 * @returns デコレータ関数
 */
export function requireRole(requiredRole: Role) {
  return function(user: User | null): boolean {
    return hasRole(user, requiredRole)
  }
}

/**
 * ユーザーのすべての権限を取得
 * @param user ユーザー
 * @returns 権限の配列
 */
export function getUserPermissions(user: User | null): Permission[] {
  if (!user || !user.roles) {
    return []
  }
  
  const permissions = new Set<Permission>()
  
  user.roles.forEach(role => {
    const rolePermissions = ROLE_PERMISSIONS[role]
    if (rolePermissions) {
      rolePermissions.forEach(permission => permissions.add(permission))
    }
  })
  
  return Array.from(permissions)
}