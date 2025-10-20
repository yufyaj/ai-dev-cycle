package com.aidev.domain.security

interface PasswordService {
    fun hashPassword(plainPassword: String): HashedPassword
    fun verifyPassword(plainPassword: String, hashedPassword: HashedPassword): Boolean
}

@JvmInline
value class PlainPassword(val value: String) {
    init {
        require(value.isNotBlank()) { "Password cannot be blank" }
        require(value.length >= 8) { "Password must be at least 8 characters" }
        require(value.any { it.isUpperCase() }) { "Password must contain at least one uppercase letter" }
        require(value.any { it.isLowerCase() }) { "Password must contain at least one lowercase letter" }
        require(value.any { it.isDigit() }) { "Password must contain at least one digit" }
        require(value.any { !it.isLetterOrDigit() }) { "Password must contain at least one special character" }
    }
}