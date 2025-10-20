package com.aidev.interface.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class LoginRequest(
    @field:NotBlank(message = "Username is required")
    @field:Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @field:Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain alphanumeric characters and underscores")
    val username: String,
    
    @field:NotBlank(message = "Password is required")
    @field:Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    val password: String
)

data class LoginResponse(
    val success: Boolean,
    val message: String,
    val sessionId: String? = null,
    val user: UserDto? = null
)

data class LogoutRequest(
    @field:NotBlank(message = "Session ID is required")
    val sessionId: String
)

data class LogoutResponse(
    val success: Boolean,
    val message: String
)

data class UserDto(
    val id: Long,
    val username: String,
    val role: String,
    val isActive: Boolean
)

data class ErrorResponse(
    val success: Boolean = false,
    val message: String,
    val timestamp: String = java.time.Instant.now().toString()
)