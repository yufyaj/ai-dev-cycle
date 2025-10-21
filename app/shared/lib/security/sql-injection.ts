/**
 * SQLインジェクション対策ユーティリティ
 * 入力値のサニタイズとバリデーション
 */

/**
 * SQLインジェクション攻撃に使用される危険な文字とパターン
 */
const DANGEROUS_SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+[\w\s]*\s*=\s*[\w\s]*\b)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\s*;\s*)/g,
  /(\b\d+\s*=\s*\d+\b)/g,
  /([\'\"][\s\w]*[\'\"])/g
]

/**
 * 危険な文字の一覧
 */
const DANGEROUS_CHARS = [
  "'", '"', ';', '--', '#', '/*', '*/', '=', 
  '<', '>', '(', ')', '{', '}', '[', ']'
]

/**
 * SQLインジェクション攻撃の可能性をチェック
 * @param input チェックする文字列
 * @returns 危険な入力かどうか
 */
export function isSqlInjectionAttempt(input: string): boolean {
  if (typeof input !== 'string') {
    return false
  }

  const lowerInput = input.toLowerCase()

  // 危険なSQLパターンをチェック
  return DANGEROUS_SQL_PATTERNS.some(pattern => pattern.test(lowerInput))
}

/**
 * SQLインジェクション対策のため入力をサニタイズ
 * @param input サニタイズする文字列
 * @returns サニタイズ済みの文字列
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }

  let sanitized = input

  // 危険な文字をエスケープ
  DANGEROUS_CHARS.forEach(char => {
    const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedChar, 'g')
    sanitized = sanitized.replace(regex, '')
  })

  // 連続する空白を単一の空白に変換
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  return sanitized
}

/**
 * SQLクエリ用のパラメータをエスケープ
 * @param value エスケープする値
 * @returns エスケープ済みの値
 */
export function escapeSqlParameter(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0'
  }

  if (typeof value === 'string') {
    // シングルクォートをダブルクォートでエスケープ
    return `'${value.replace(/'/g, "''")}'`
  }

  // その他の型は文字列に変換してエスケープ
  return escapeSqlParameter(String(value))
}

/**
 * SQLクエリのWHERE句で使用する値をサニタイズ
 * @param input WHERE句で使用する値
 * @returns サニタイズ済みの値
 */
export function sanitizeWhereClause(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }

  // SQLインジェクション攻撃をチェック
  if (isSqlInjectionAttempt(input)) {
    throw new Error('Potential SQL injection detected')
  }

  return sanitizeSqlInput(input)
}

/**
 * 複数の入力値をまとめてサニタイズ
 * @param inputs サニタイズする値の配列
 * @returns サニタイズ済みの値の配列
 */
export function sanitizeMultipleSqlInputs(inputs: string[]): string[] {
  return inputs.map(input => sanitizeSqlInput(input))
}

/**
 * オブジェクトの文字列プロパティをSQLインジェクション対策
 * @param obj サニタイズするオブジェクト
 * @returns サニタイズ済みのオブジェクト
 */
export function sanitizeSqlObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeSqlInput(sanitized[key])
    }
  }

  return sanitized
}

/**
 * クエリパラメータの型チェックとバリデーション
 * @param params パラメータオブジェクト
 * @param schema 期待される型のスキーマ
 * @returns バリデーション結果
 */
export function validateQueryParameters(
  params: Record<string, any>,
  schema: Record<string, 'string' | 'number' | 'boolean'>
): {
  isValid: boolean
  errors: string[]
  sanitizedParams: Record<string, any>
} {
  const errors: string[] = []
  const sanitizedParams: Record<string, any> = {}

  for (const [key, expectedType] of Object.entries(schema)) {
    const value = params[key]

    if (value === undefined || value === null) {
      errors.push(`Missing required parameter: ${key}`)
      continue
    }

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Parameter ${key} must be a string`)
        } else {
          try {
            sanitizedParams[key] = sanitizeSqlInput(value)
          } catch (error) {
            errors.push(`Invalid parameter ${key}: ${error}`)
          }
        }
        break

      case 'number':
        if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
          errors.push(`Parameter ${key} must be a number`)
        } else {
          sanitizedParams[key] = Number(value)
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(`Parameter ${key} must be a boolean`)
        } else {
          sanitizedParams[key] = value === true || value === 'true'
        }
        break
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedParams
  }
}