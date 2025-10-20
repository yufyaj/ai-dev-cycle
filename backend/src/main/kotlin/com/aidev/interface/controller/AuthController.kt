package com.aidev.interface.controller

import com.aidev.domain.security.InputSanitizer
import com.aidev.interface.dto.*
import com.aidev.usecase.security.AuthenticationResult
import com.aidev.usecase.security.AuthenticationUseCase
import com.aidev.usecase.security.LogoutResult
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.BindingResult
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authenticationUseCase: AuthenticationUseCase,
    private val inputSanitizer: InputSanitizer
) {
    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        bindingResult: BindingResult,
        response: HttpServletResponse
    ): ResponseEntity<LoginResponse> {
        if (bindingResult.hasErrors()) {
            val errors = bindingResult.fieldErrors.joinToString(", ") { it.defaultMessage ?: "Invalid input" }
            return ResponseEntity.badRequest().body(
                LoginResponse(success = false, message = "Validation failed: $errors")
            )
        }

        return try {
            // Input sanitization
            if (!inputSanitizer.isValidInput(request.username) || !inputSanitizer.isValidInput(request.password)) {
                logger.warn("Potentially malicious input detected for username: ${request.username}")
                return ResponseEntity.badRequest().body(
                    LoginResponse(success = false, message = "Invalid input detected")
                )
            }

            val sanitizedUsername = inputSanitizer.sanitizeForHtml(request.username)
            
            when (val result = authenticationUseCase.authenticate(sanitizedUsername, request.password)) {
                is AuthenticationResult.Success -> {
                    // Set HttpOnly session cookie
                    val sessionCookie = Cookie("sessionId", result.session.id.value).apply {
                        isHttpOnly = true
                        secure = true
                        maxAge = 3600 // 1 hour
                        path = "/"
                        setAttribute("SameSite", "Strict")
                    }
                    response.addCookie(sessionCookie)

                    logger.info("User ${result.user.username.value} authenticated successfully")
                    ResponseEntity.ok(
                        LoginResponse(
                            success = true,
                            message = "Login successful",
                            sessionId = result.session.id.value,
                            user = UserDto(
                                id = result.user.id.value,
                                username = result.user.username.value,
                                role = result.user.role.name,
                                isActive = result.user.isActive
                            )
                        )
                    )
                }
                is AuthenticationResult.Failure -> {
                    logger.warn("Authentication failed for username: $sanitizedUsername - ${result.message}")
                    ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                        LoginResponse(success = false, message = result.message)
                    )
                }
            }
        } catch (e: Exception) {
            logger.error("Login error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                LoginResponse(success = false, message = "Login failed")
            )
        }
    }

    @PostMapping("/logout")
    fun logout(
        @Valid @RequestBody request: LogoutRequest,
        response: HttpServletResponse
    ): ResponseEntity<LogoutResponse> {
        return try {
            if (!inputSanitizer.isValidInput(request.sessionId)) {
                return ResponseEntity.badRequest().body(
                    LogoutResponse(success = false, message = "Invalid session ID")
                )
            }

            when (authenticationUseCase.logout(request.sessionId)) {
                is LogoutResult.Success -> {
                    // Clear session cookie
                    val sessionCookie = Cookie("sessionId", "").apply {
                        isHttpOnly = true
                        secure = true
                        maxAge = 0
                        path = "/"
                    }
                    response.addCookie(sessionCookie)

                    logger.info("User logged out successfully")
                    ResponseEntity.ok(LogoutResponse(success = true, message = "Logout successful"))
                }
                is LogoutResult.Failure -> {
                    logger.warn("Logout failed: ${(authenticationUseCase.logout(request.sessionId) as LogoutResult.Failure).message}")
                    ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                        LogoutResponse(success = false, message = "Logout failed")
                    )
                }
            }
        } catch (e: Exception) {
            logger.error("Logout error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                LogoutResponse(success = false, message = "Logout failed")
            )
        }
    }
}