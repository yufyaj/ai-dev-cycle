package com.aidev.interface.controller

import com.aidev.domain.security.*
import com.aidev.usecase.security.AuthenticationResult
import com.aidev.usecase.security.AuthenticationUseCase
import com.fasterxml.jackson.databind.ObjectMapper
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.Instant

@WebMvcTest(AuthController::class)
class AuthControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @TestConfiguration
    class TestConfig {
        @Bean
        @Primary
        fun authenticationUseCase(): AuthenticationUseCase = mockk()

        @Bean
        @Primary
        fun inputSanitizer(): InputSanitizer = mockk()
    }

    @Autowired
    private lateinit var authenticationUseCase: AuthenticationUseCase

    @Autowired
    private lateinit var inputSanitizer: InputSanitizer

    @Test
    fun `should login successfully with valid credentials`() {
        val loginRequest = mapOf(
            "username" to "testuser",
            "password" to "TestPassword123!"
        )
        
        val user = User(
            id = UserId(1L),
            username = Username("testuser"),
            hashedPassword = HashedPassword("hashedpassword"),
            role = Role.USER,
            isActive = true
        )
        
        val session = Session(
            id = SessionId("session123"),
            userId = UserId(1L),
            createdAt = Instant.now(),
            lastAccessedAt = Instant.now(),
            expiresAt = Instant.now().plusSeconds(3600)
        )

        every { inputSanitizer.isValidInput("testuser") } returns true
        every { inputSanitizer.isValidInput("TestPassword123!") } returns true
        every { inputSanitizer.sanitizeForHtml("testuser") } returns "testuser"
        every { authenticationUseCase.authenticate("testuser", "TestPassword123!") } returns 
            AuthenticationResult.Success(session, user)

        mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("Login successful"))
            .andExpect(jsonPath("$.sessionId").value("session123"))
            .andExpect(jsonPath("$.user.username").value("testuser"))
            .andExpect(header().exists("Set-Cookie"))
    }

    @Test
    fun `should reject login with invalid credentials`() {
        val loginRequest = mapOf(
            "username" to "testuser",
            "password" to "wrongpassword"
        )

        every { inputSanitizer.isValidInput("testuser") } returns true
        every { inputSanitizer.isValidInput("wrongpassword") } returns true
        every { inputSanitizer.sanitizeForHtml("testuser") } returns "testuser"
        every { authenticationUseCase.authenticate("testuser", "wrongpassword") } returns 
            AuthenticationResult.Failure("Invalid credentials")

        mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid credentials"))
    }

    @Test
    fun `should reject login with malicious input`() {
        val loginRequest = mapOf(
            "username" to "<script>alert('xss')</script>",
            "password" to "TestPassword123!"
        )

        every { inputSanitizer.isValidInput("<script>alert('xss')</script>") } returns false
        every { inputSanitizer.isValidInput("TestPassword123!") } returns true

        mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid input detected"))
    }

    @Test
    fun `should reject login with invalid username format`() {
        val loginRequest = mapOf(
            "username" to "a", // Too short
            "password" to "TestPassword123!"
        )

        mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").contains("Validation failed"))
    }

    @Test
    fun `should reject login with missing fields`() {
        val loginRequest = mapOf(
            "username" to "testuser"
            // Missing password
        )

        mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
    }

    @Test
    fun `should handle SQL injection attempt in username`() {
        val loginRequest = mapOf(
            "username" to "admin'; DROP TABLE users; --",
            "password" to "TestPassword123!"
        )

        every { inputSanitizer.isValidInput("admin'; DROP TABLE users; --") } returns false
        every { inputSanitizer.isValidInput("TestPassword123!") } returns true

        mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid input detected"))
    }
}