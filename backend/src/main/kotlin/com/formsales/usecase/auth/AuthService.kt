package com.formsales.usecase.auth

import com.formsales.domain.user.User
import com.formsales.domain.user.UserRole
import com.formsales.infrastructure.security.JwtTokenProvider
import com.formsales.infrastructure.user.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider
) {
    
    fun authenticate(email: String, password: String): AuthResult {
        val user = userRepository.findByEmailAndIsActive(email, true)
            ?: throw AuthenticationException("認証に失敗しました")
        
        if (!passwordEncoder.matches(password, user.passwordHash)) {
            throw AuthenticationException("認証に失敗しました")
        }
        
        val token = jwtTokenProvider.generateToken(user.id.toString(), user.role.name)
        
        return AuthResult(
            user = UserInfo(
                id = user.id.toString(),
                email = user.email,
                role = user.role.name.lowercase(),
                name = user.name
            ),
            token = token
        )
    }
    
    fun createUser(email: String, password: String, role: UserRole, name: String? = null): User {
        if (userRepository.existsByEmail(email)) {
            throw IllegalArgumentException("このメールアドレスは既に使用されています")
        }
        
        validatePassword(password)
        
        val hashedPassword = passwordEncoder.encode(password)
        val user = User(
            email = email,
            passwordHash = hashedPassword,
            role = role,
            name = name
        )
        
        return userRepository.save(user)
    }
    
    fun verifyToken(token: String): UserInfo {
        if (!jwtTokenProvider.validateToken(token)) {
            throw AuthenticationException("無効なトークンです")
        }
        
        val userId = jwtTokenProvider.getUserIdFromToken(token)
        val user = userRepository.findById(userId.toLong())
            .orElseThrow { AuthenticationException("ユーザーが見つかりません") }
        
        if (!user.isActive) {
            throw AuthenticationException("アカウントが無効です")
        }
        
        return UserInfo(
            id = user.id.toString(),
            email = user.email,
            role = user.role.name.lowercase(),
            name = user.name
        )
    }
    
    private fun validatePassword(password: String) {
        if (password.length < 8) {
            throw IllegalArgumentException("パスワードは8文字以上で入力してください")
        }
        
        if (!password.matches(Regex("^[a-zA-Z0-9!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]*$"))) {
            throw IllegalArgumentException("使用できない文字が含まれています")
        }
    }
}

data class AuthResult(
    val user: UserInfo,
    val token: String
)

data class UserInfo(
    val id: String,
    val email: String,
    val role: String,
    val name: String?
)

class AuthenticationException(message: String) : RuntimeException(message)