package com.formsales.usecase.auth

import com.formsales.domain.user.User
import com.formsales.domain.user.UserRole
import com.formsales.infrastructure.security.JwtTokenProvider
import com.formsales.infrastructure.user.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.crypto.password.PasswordEncoder
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class AuthServiceTest {
    
    private val userRepository = mockk<UserRepository>()
    private val passwordEncoder = mockk<PasswordEncoder>()
    private val jwtTokenProvider = mockk<JwtTokenProvider>()
    private val authService = AuthService(userRepository, passwordEncoder, jwtTokenProvider)
    
    @Test
    fun `正常系: 有効な認証情報でログイン成功`() {
        // Arrange
        val email = "user@example.com"
        val password = "password123"
        val hashedPassword = "hashedPassword"
        val token = "jwt-token"
        
        val user = User(
            id = 1L,
            email = email,
            passwordHash = hashedPassword,
            role = UserRole.WORKER,
            name = "Test User"
        )
        
        every { userRepository.findByEmailAndIsActive(email, true) } returns user
        every { passwordEncoder.matches(password, hashedPassword) } returns true
        every { jwtTokenProvider.generateToken("1", "WORKER") } returns token
        
        // Act
        val result = authService.authenticate(email, password)
        
        // Assert
        assertEquals("1", result.user.id)
        assertEquals(email, result.user.email)
        assertEquals("worker", result.user.role)
        assertEquals("Test User", result.user.name)
        assertEquals(token, result.token)
    }
    
    @Test
    fun `異常系: 存在しないユーザーで認証失敗`() {
        // Arrange
        val email = "nonexistent@example.com"
        val password = "password123"
        
        every { userRepository.findByEmailAndIsActive(email, true) } returns null
        
        // Act & Assert
        val exception = assertThrows<AuthenticationException> {
            authService.authenticate(email, password)
        }
        assertEquals("認証に失敗しました", exception.message)
    }
    
    @Test
    fun `異常系: パスワード不一致で認証失敗`() {
        // Arrange
        val email = "user@example.com"
        val password = "wrongpassword"
        val hashedPassword = "hashedPassword"
        
        val user = User(
            id = 1L,
            email = email,
            passwordHash = hashedPassword,
            role = UserRole.WORKER
        )
        
        every { userRepository.findByEmailAndIsActive(email, true) } returns user
        every { passwordEncoder.matches(password, hashedPassword) } returns false
        
        // Act & Assert
        val exception = assertThrows<AuthenticationException> {
            authService.authenticate(email, password)
        }
        assertEquals("認証に失敗しました", exception.message)
    }
    
    @Test
    fun `正常系: ユーザー作成成功`() {
        // Arrange
        val email = "newuser@example.com"
        val password = "password123"
        val hashedPassword = "hashedPassword"
        val role = UserRole.WORKER
        val name = "New User"
        
        val savedUser = User(
            id = 1L,
            email = email,
            passwordHash = hashedPassword,
            role = role,
            name = name
        )
        
        every { userRepository.existsByEmail(email) } returns false
        every { passwordEncoder.encode(password) } returns hashedPassword
        every { userRepository.save(any()) } returns savedUser
        
        // Act
        val result = authService.createUser(email, password, role, name)
        
        // Assert
        assertEquals(email, result.email)
        assertEquals(hashedPassword, result.passwordHash)
        assertEquals(role, result.role)
        assertEquals(name, result.name)
        
        verify { userRepository.save(any()) }
    }
    
    @Test
    fun `異常系: 既存メールアドレスでユーザー作成失敗`() {
        // Arrange
        val email = "existing@example.com"
        val password = "password123"
        val role = UserRole.WORKER
        
        every { userRepository.existsByEmail(email) } returns true
        
        // Act & Assert
        val exception = assertThrows<IllegalArgumentException> {
            authService.createUser(email, password, role)
        }
        assertEquals("このメールアドレスは既に使用されています", exception.message)
    }
    
    @Test
    fun `異常系: パスワードが短すぎる場合エラー`() {
        // Arrange
        val email = "user@example.com"
        val password = "1234567" // 7文字
        val role = UserRole.WORKER
        
        every { userRepository.existsByEmail(email) } returns false
        
        // Act & Assert
        val exception = assertThrows<IllegalArgumentException> {
            authService.createUser(email, password, role)
        }
        assertEquals("パスワードは8文字以上で入力してください", exception.message)
    }
    
    @Test
    fun `正常系: トークン検証成功`() {
        // Arrange
        val token = "valid-token"
        val userId = "1"
        val user = User(
            id = 1L,
            email = "user@example.com",
            passwordHash = "hashedPassword",
            role = UserRole.WORKER,
            name = "Test User",
            isActive = true
        )
        
        every { jwtTokenProvider.validateToken(token) } returns true
        every { jwtTokenProvider.getUserIdFromToken(token) } returns userId
        every { userRepository.findById(1L) } returns java.util.Optional.of(user)
        
        // Act
        val result = authService.verifyToken(token)
        
        // Assert
        assertEquals("1", result.id)
        assertEquals("user@example.com", result.email)
        assertEquals("worker", result.role)
        assertEquals("Test User", result.name)
    }
}