package com.aidev.domain.security

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class UserTest {

    @Test
    fun `should create valid user`() {
        val user = User(
            id = UserId(1L),
            username = Username("testuser"),
            hashedPassword = HashedPassword("hashedpassword123"),
            role = Role.USER,
            isActive = true
        )
        
        assertEquals(1L, user.id.value)
        assertEquals("testuser", user.username.value)
        assertTrue(user.isActive)
    }

    @Test
    fun `should validate user role permissions`() {
        val adminUser = User(
            id = UserId(1L),
            username = Username("admin"),
            hashedPassword = HashedPassword("hashedpassword123"),
            role = Role.ADMIN,
            isActive = true
        )
        
        val regularUser = User(
            id = UserId(2L),
            username = Username("user"),
            hashedPassword = HashedPassword("hashedpassword123"),
            role = Role.USER,
            isActive = true
        )
        
        assertTrue(adminUser.hasRole(Role.USER))
        assertTrue(adminUser.hasRole(Role.ADMIN))
        assertTrue(regularUser.hasRole(Role.USER))
        assertFalse(regularUser.hasRole(Role.ADMIN))
    }
}

class UsernameTest {

    @Test
    fun `should create valid username`() {
        val username = Username("validuser123")
        assertEquals("validuser123", username.value)
    }

    @Test
    fun `should reject blank username`() {
        assertThrows<IllegalArgumentException> {
            Username("")
        }
    }

    @Test
    fun `should reject short username`() {
        assertThrows<IllegalArgumentException> {
            Username("ab")
        }
    }

    @Test
    fun `should reject username with invalid characters`() {
        assertThrows<IllegalArgumentException> {
            Username("user@domain")
        }
    }
}

class PlainPasswordTest {

    @Test
    fun `should create valid password`() {
        val password = PlainPassword("ValidPass123!")
        assertEquals("ValidPass123!", password.value)
    }

    @Test
    fun `should reject password without uppercase`() {
        assertThrows<IllegalArgumentException> {
            PlainPassword("validpass123!")
        }
    }

    @Test
    fun `should reject password without lowercase`() {
        assertThrows<IllegalArgumentException> {
            PlainPassword("VALIDPASS123!")
        }
    }

    @Test
    fun `should reject password without digit`() {
        assertThrows<IllegalArgumentException> {
            PlainPassword("ValidPass!")
        }
    }

    @Test
    fun `should reject password without special character`() {
        assertThrows<IllegalArgumentException> {
            PlainPassword("ValidPass123")
        }
    }

    @Test
    fun `should reject short password`() {
        assertThrows<IllegalArgumentException> {
            PlainPassword("Val1!")
        }
    }
}