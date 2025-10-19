import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../login-form'

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('正常系: 有効な認証情報で送信成功', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'user@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123'
      })
    })
  })

  it('異常系: 無効なメールアドレスでエラー表示', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'invalid-email')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByText('有効なメールアドレスを入力してください')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('異常系: パスワードが短すぎる場合エラー表示', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'user@example.com')
    await user.type(screen.getByLabelText('パスワード'), '1234567')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByText('パスワードは8文字以上で入力してください')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('異常系: 悪意のあるスクリプトを含む入力でXSS対策確認', async () => {
    const user = userEvent.setup()
    const maliciousScript = '<script>alert("xss")</script>'
    render(<LoginForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText('メールアドレス'), `user@example.com${maliciousScript}`)
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByText('有効なメールアドレスを入力してください')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
    
    // スクリプトが実行されていないことを確認
    expect(document.querySelector('script')).toBeNull()
  })

  it('正常系: ローディング状態の表示確認', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<LoginForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'user@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(screen.getByText('ログイン中...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})