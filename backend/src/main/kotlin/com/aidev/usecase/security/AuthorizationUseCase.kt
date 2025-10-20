package com.aidev.usecase.security

import com.aidev.domain.security.*
import org.springframework.stereotype.Service

interface AuthorizationUseCase {
    fun hasPermission(userId: UserId, permission: Permission): Boolean
    fun hasRole(userId: UserId, role: Role): Boolean
    fun checkPermission(userId: UserId, permission: Permission): AuthorizationResult
}

@Service
class AuthorizationUseCaseImpl(
    private val userRepository: UserRepository
) : AuthorizationUseCase {

    override fun hasPermission(userId: UserId, permission: Permission): Boolean {
        val user = userRepository.findById(userId) ?: return false
        return user.role.hasPermission(permission)
    }

    override fun hasRole(userId: UserId, role: Role): Boolean {
        val user = userRepository.findById(userId) ?: return false
        return user.hasRole(role)
    }

    override fun checkPermission(userId: UserId, permission: Permission): AuthorizationResult {
        return try {
            val user = userRepository.findById(userId)
                ?: return AuthorizationResult.Denied("User not found")

            if (!user.isActive) {
                return AuthorizationResult.Denied("User is inactive")
            }

            if (user.role.hasPermission(permission)) {
                AuthorizationResult.Granted(user)
            } else {
                AuthorizationResult.Denied("Insufficient permissions")
            }
        } catch (e: Exception) {
            AuthorizationResult.Denied("Authorization check failed")
        }
    }
}

sealed class AuthorizationResult {
    data class Granted(val user: User) : AuthorizationResult()
    data class Failure(val message: String) : AuthorizationResult()
    data class Denied(val message: String) : AuthorizationResult()
}