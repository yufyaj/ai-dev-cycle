package com.aidev.infrastructure.security

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class BcryptPasswordServiceTest {

    private val passwordService = BcryptPasswordService()

    @Test
    fun `should hash password correctly`() {
        val plainPassword = "TestPassword123!"
        val hashedPassword = passwordService.hashPassword(plainPassword)
        
        assertTrue(hashedPassword.value.isNotBlank())
        assertNotEquals(plainPassword, hashedPassword.value)
        assertTrue(hashedPassword.value.startsWith("\$2a\$"))
    }

    @Test
    fun `should verify correct password`() {
        val plainPassword = "TestPassword123!"
        val hashedPassword = passwordService.hashPassword(plainPassword)
        
        assertTrue(passwordService.verifyPassword(plainPassword, hashedPassword))
    }

    @Test
    fun `should reject incorrect password`() {
        val plainPassword = "TestPassword123!"
        val wrongPassword = "WrongPassword123!"
        val hashedPassword = passwordService.hashPassword(plainPassword)
        
        assertFalse(passwordService.verifyPassword(wrongPassword, hashedPassword))
    }

    @Test
    fun `should generate different hashes for same password`() {
        val plainPassword = "TestPassword123!"
        val hash1 = passwordService.hashPassword(plainPassword)
        val hash2 = passwordService.hashPassword(plainPassword)
        
        assertNotEquals(hash1.value, hash2.value)
        assertTrue(passwordService.verifyPassword(plainPassword, hash1))
        assertTrue(passwordService.verifyPassword(plainPassword, hash2))
    }

    @Test
    fun `should handle malformed hash gracefully`() {
        val plainPassword = "TestPassword123!"
        val malformedHash = com.aidev.domain.security.HashedPassword("malformed")
        
        assertFalse(passwordService.verifyPassword(plainPassword, malformedHash))
    }
}