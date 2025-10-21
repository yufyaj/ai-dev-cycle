/**
 * XSS攻撃対策ユーティリティ
 * すべてのHTMLタグを削除してサニタイズする
 */

/**
 * HTMLタグを全て除去してXSS攻撃を防ぐ
 * @param input サニタイズする文字列
 * @returns サニタイズ済みの文字列
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  
  // すべてのHTMLタグを削除する正規表現
  return input.replace(/<[^>]*>/g, '')
}

/**
 * HTMLエスケープを行う
 * @param unsafe エスケープする文字列
 * @returns エスケープ済みの文字列
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    throw new Error('Input must be a string')
  }
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 複数の入力をサニタイズする
 * @param inputs サニタイズする文字列の配列
 * @returns サニタイズ済みの文字列の配列
 */
export function sanitizeMultipleInputs(inputs: string[]): string[] {
  return inputs.map(input => sanitizeInput(input))
}

/**
 * オブジェクトの文字列値をすべてサニタイズする
 * @param obj サニタイズするオブジェクト
 * @returns サニタイズ済みのオブジェクト
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key])
    }
  }
  
  return sanitized
}