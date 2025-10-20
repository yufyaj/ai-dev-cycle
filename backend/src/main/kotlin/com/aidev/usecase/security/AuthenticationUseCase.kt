package com.aidev.usecase.security

import com.aidev.domain.security.*
import org.springframework.stereotype.Service
import java.time.Instant

interface AuthenticationUseCase {
    fun authenticate(username: String, password: String): AuthenticationResult
    fun logout(sessionId: String): LogoutResult
    fun validateSession(sessionId: String): SessionValidationResult
}

@Service
class AuthenticationUseCaseImpl(
    private val userRepository: UserRepository,
    private val sessionRepository: SessionRepository,
    private val passwordService: PasswordService,
    private val sessionIdGenerator: SessionIdGenerator
) : AuthenticationUseCase {

    override fun authenticate(username: String, password: String): AuthenticationResult {
        return try {
            val user = userRepository.findByUsername(Username(username))
                ?: return AuthenticationResult.Failure("Invalid credentials")

            if (!user.isActive) {
                return AuthenticationResult.Failure("Account is inactive")
            }

            if (!passwordService.verifyPassword(password, user.hashedPassword)) {
                return AuthenticationResult.Failure("Invalid credentials")
            }

            val sessionId = sessionIdGenerator.generate()
            val now = Instant.now()
            val session = Session(
                id = sessionId,
                userId = user.id,
                createdAt = now,
                lastAccessedAt = now,
                expiresAt = now.plusSeconds(Session.SESSION_TIMEOUT_HOURS * 3600)
            )

            sessionRepository.save(session)
            AuthenticationResult.Success(session, user)
        } catch (e: Exception) {
            AuthenticationResult.Failure("Authentication failed")
        }
    }

    override fun logout(sessionId: String): LogoutResult {
        return try {
            val session = sessionRepository.findById(SessionId(sessionId))
                ?: return LogoutResult.Success

            sessionRepository.delete(session.id)
            LogoutResult.Success
        } catch (e: Exception) {
            LogoutResult.Failure("Logout failed")
        }
    }

    override fun validateSession(sessionId: String): SessionValidationResult {
        return try {
            val session = sessionRepository.findById(SessionId(sessionId))
                ?: return SessionValidationResult.Invalid("Session not found")

            if (!session.isValid()) {
                sessionRepository.delete(session.id)
                return SessionValidationResult.Invalid("Session expired")
            }

            val updatedSession = session.updateLastAccessed()
            sessionRepository.save(updatedSession)

            val user = userRepository.findById(session.userId)
                ?: return SessionValidationResult.Invalid("User not found")

            SessionValidationResult.Valid(updatedSession, user)
        } catch (e: Exception) {
            SessionValidationResult.Invalid("Session validation failed")
        }
    }
}

sealed class AuthenticationResult {
    data class Success(val session: Session, val user: User) : AuthenticationResult()
    data class Failure(val message: String) : AuthenticationResult()
}

sealed class LogoutResult {
    object Success : LogoutResult()
    data class Failure(val message: String) : LogoutResult()
}

sealed class SessionValidationResult {
    data class Valid(val session: Session, val user: User) : SessionValidationResult()
    data class Invalid(val message: String) : SessionValidationResult()
}

interface UserRepository {
    fun findByUsername(username: Username): User?
    fun findById(userId: UserId): User?
    fun save(user: User): User
}

interface SessionRepository {
    fun findById(sessionId: SessionId): Session?
    fun save(session: Session): Session
    fun delete(sessionId: SessionId)
    fun deleteExpiredSessions()
}

interface SessionIdGenerator {
    fun generate(): SessionId
}