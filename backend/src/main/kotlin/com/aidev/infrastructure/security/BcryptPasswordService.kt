package com.aidev.infrastructure.security

import com.aidev.domain.security.HashedPassword
import com.aidev.domain.security.PasswordService
import org.mindrot.jbcrypt.BCrypt
import org.springframework.stereotype.Service

@Service
class BcryptPasswordService : PasswordService {
    
    companion object {
        private const val BCRYPT_ROUNDS = 12
    }

    override fun hashPassword(plainPassword: String): HashedPassword {
        val salt = BCrypt.gensalt(BCRYPT_ROUNDS)
        val hashed = BCrypt.hashpw(plainPassword, salt)
        return HashedPassword(hashed)
    }

    override fun verifyPassword(plainPassword: String, hashedPassword: HashedPassword): Boolean {
        return try {
            BCrypt.checkpw(plainPassword, hashedPassword.value)
        } catch (e: Exception) {
            false
        }
    }
}