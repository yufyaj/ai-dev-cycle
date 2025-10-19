package com.formsales.interface.auth

import com.formsales.usecase.auth.AuthService
import com.formsales.usecase.auth.AuthenticationException
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = ["http://localhost:3000"], credentials = true)
class AuthController(
    private val authService: AuthService
) {
    
    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        response: HttpServletResponse
    ): ResponseEntity<LoginResponse> {
        return try {
            val result = authService.authenticate(request.email, request.password)
            
            // HttpOnly Cookie でトークンを設定
            response.addHeader("Set-Cookie", 
                "auth_token=${result.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/")
            
            ResponseEntity.ok(
                LoginResponse(
                    user = result.user,
                    message = "ログインに成功しました"
                )
            )
        } catch (e: AuthenticationException) {
            ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(LoginResponse(message = e.message ?: "認証に失敗しました"))
        }
    }
    
    @PostMapping("/logout")
    fun logout(response: HttpServletResponse): ResponseEntity<LogoutResponse> {
        // Cookie を削除
        response.addHeader("Set-Cookie", 
            "auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/")
        
        return ResponseEntity.ok(LogoutResponse("ログアウトしました"))
    }
    
    @GetMapping("/verify")
    fun verifyToken(@CookieValue("auth_token") token: String?): ResponseEntity<VerifyResponse> {
        if (token.isNullOrBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(VerifyResponse(message = "認証が必要です"))
        }
        
        return try {
            val userInfo = authService.verifyToken(token)
            ResponseEntity.ok(VerifyResponse(user = userInfo))
        } catch (e: AuthenticationException) {
            ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(VerifyResponse(message = e.message ?: "認証に失敗しました"))
        }
    }
}

data class LoginRequest(
    @field:NotBlank(message = "メールアドレスは必須です")
    @field:Email(message = "有効なメールアドレスを入力してください")
    val email: String,
    
    @field:NotBlank(message = "パスワードは必須です")
    @field:Size(min = 8, message = "パスワードは8文字以上で入力してください")
    val password: String
)

data class LoginResponse(
    val user: com.formsales.usecase.auth.UserInfo? = null,
    val message: String
)

data class LogoutResponse(
    val message: String
)

data class VerifyResponse(
    val user: com.formsales.usecase.auth.UserInfo? = null,
    val message: String? = null
)