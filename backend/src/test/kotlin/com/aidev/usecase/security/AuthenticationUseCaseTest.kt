package com.aidev.usecase.security

import com.aidev.domain.security.*
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Test
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AuthenticationUseCaseTest {

    private val userRepository = mockk<UserRepository>()
    private val sessionRepository = mockk<SessionRepository>()
    private val passwordService = mockk<PasswordService>()
    private val sessionIdGenerator = mockk<SessionIdGenerator>()
    
    private val authenticationUseCase = AuthenticationUseCaseImpl(
        userRepository, sessionRepository, passwordService, sessionIdGenerator
    )

    @Test
    fun `should authenticate valid user successfully`() {
        val username = "testuser"
        val password = "TestPassword123!"
        val user = User(
            id = UserId(1L),
            username = Username(username),
            hashedPassword = HashedPassword("hashedpassword"),
            role = Role.USER,
            isActive = true
        )
        val sessionId = SessionId("session123")
        
        every { userRepository.findByUsername(Username(username)) } returns user
        every { passwordService.verifyPassword(password, user.hashedPassword) } returns true
        every { sessionIdGenerator.generate() } returns sessionId
        every { sessionRepository.save(any()) } returns mockk()
        
        val result = authenticationUseCase.authenticate(username, password)
        
        assertTrue(result is AuthenticationResult.Success)
        val successResult = result as AuthenticationResult.Success
        assertEquals(user.id, successResult.user.id)
        assertEquals(sessionId, successResult.session.id)
        
        verify { sessionRepository.save(any()) }
    }

    @Test
    fun `should reject authentication for non-existent user`() {
        val username = "nonexistent"
        val password = "password"
        
        every { userRepository.findByUsername(Username(username)) } returns null
        
        val result = authenticationUseCase.authenticate(username, password)
        
        assertTrue(result is AuthenticationResult.Failure)
        assertEquals("Invalid credentials", (result as AuthenticationResult.Failure).message)
    }

    @Test
    fun `should reject authentication for inactive user`() {
        val username = "inactiveuser"
        val password = "password"
        val user = User(
            id = UserId(1L),
            username = Username(username),
            hashedPassword = HashedPassword("hashedpassword"),
            role = Role.USER,
            isActive = false
        )
        
        every { userRepository.findByUsername(Username(username)) } returns user
        
        val result = authenticationUseCase.authenticate(username, password)
        
        assertTrue(result is AuthenticationResult.Failure)
        assertEquals("Account is inactive", (result as AuthenticationResult.Failure).message)
    }

    @Test
    fun `should reject authentication for wrong password`() {
        val username = "testuser"
        val password = "wrongpassword"
        val user = User(
            id = UserId(1L),
            username = Username(username),
            hashedPassword = HashedPassword("hashedpassword"),
            role = Role.USER,
            isActive = true
        )
        
        every { userRepository.findByUsername(Username(username)) } returns user
        every { passwordService.verifyPassword(password, user.hashedPassword) } returns false
        
        val result = authenticationUseCase.authenticate(username, password)
        
        assertTrue(result is AuthenticationResult.Failure)
        assertEquals("Invalid credentials", (result as AuthenticationResult.Failure).message)
    }

    @Test
    fun `should validate active session successfully`() {
        val sessionId = "session123"
        val now = Instant.now()
        val session = Session(
            id = SessionId(sessionId),
            userId = UserId(1L),
            createdAt = now.minusSeconds(1800),
            lastAccessedAt = now.minusSeconds(300),
            expiresAt = now.plusSeconds(3600),
            isActive = true
        )
        val user = User(
            id = UserId(1L),
            username = Username("testuser"),
            hashedPassword = HashedPassword("hashedpassword"),
            role = Role.USER,
            isActive = true
        )
        
        every { sessionRepository.findById(SessionId(sessionId)) } returns session
        every { sessionRepository.save(any()) } returns mockk()
        every { userRepository.findById(session.userId) } returns user
        
        val result = authenticationUseCase.validateSession(sessionId)
        
        assertTrue(result is SessionValidationResult.Valid)
        val validResult = result as SessionValidationResult.Valid
        assertEquals(user.id, validResult.user.id)
        
        verify { sessionRepository.save(any()) }
    }

    @Test
    fun `should invalidate expired session`() {
        val sessionId = "session123"
        val now = Instant.now()
        val expiredSession = Session(
            id = SessionId(sessionId),
            userId = UserId(1L),
            createdAt = now.minusSeconds(7200),
            lastAccessedAt = now.minusSeconds(7200),
            expiresAt = now.minusSeconds(3600),
            isActive = true
        )
        
        every { sessionRepository.findById(SessionId(sessionId)) } returns expiredSession
        every { sessionRepository.delete(SessionId(sessionId)) } returns Unit
        
        val result = authenticationUseCase.validateSession(sessionId)
        
        assertTrue(result is SessionValidationResult.Invalid)
        assertEquals("Session expired", (result as SessionValidationResult.Invalid).message)
        
        verify { sessionRepository.delete(SessionId(sessionId)) }
    }

    @Test
    fun `should logout successfully`() {
        val sessionId = "session123"
        val session = Session(
            id = SessionId(sessionId),
            userId = UserId(1L),
            createdAt = Instant.now(),
            lastAccessedAt = Instant.now(),
            expiresAt = Instant.now().plusSeconds(3600)
        )
        
        every { sessionRepository.findById(SessionId(sessionId)) } returns session
        every { sessionRepository.delete(SessionId(sessionId)) } returns Unit
        
        val result = authenticationUseCase.logout(sessionId)
        
        assertTrue(result is LogoutResult.Success)
        verify { sessionRepository.delete(SessionId(sessionId)) }
    }
}