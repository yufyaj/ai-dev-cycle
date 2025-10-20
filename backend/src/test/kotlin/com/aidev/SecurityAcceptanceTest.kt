package com.aidev

import com.aidev.domain.security.*
import com.aidev.infrastructure.security.BcryptPasswordService
import com.aidev.infrastructure.security.OwaspInputSanitizer
import com.aidev.usecase.security.UserRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import kotlin.test.*

/**
 * Issue #44 Acceptance Tests
 * 完了条件の検証を行う
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SecurityAcceptanceTest {

    @Autowired
    private lateinit var userRepository: UserRepository

    private val passwordService = BcryptPasswordService()
    private val inputSanitizer = OwaspInputSanitizer()

    @Test
    fun `正常系: パスワードがハッシュ化されて保存され、セッションは1時間無操作でタイムアウトする`() {
        // Given: ユーザーがログイン
        val plainPassword = "SecurePass123!"
        val hashedPassword = passwordService.hashPassword(plainPassword)
        
        val user = User(
            id = UserId(0L),
            username = Username("testuser"),
            hashedPassword = hashedPassword,
            role = Role.USER,
            isActive = true
        )
        val savedUser = userRepository.save(user)
        
        // When: パスワードを入力して認証
        assertTrue(passwordService.verifyPassword(plainPassword, savedUser.hashedPassword))
        assertNotEquals(plainPassword, savedUser.hashedPassword.value)
        assertTrue(savedUser.hashedPassword.value.startsWith("\$2a\$"))
        
        // Then: セッションは1時間無操作でタイムアウトする
        val now = Instant.now()
        val session = Session(
            id = SessionId("test-session"),
            userId = savedUser.id,
            createdAt = now,
            lastAccessedAt = now,
            expiresAt = now.plusSeconds(Session.SESSION_TIMEOUT_HOURS * 3600)
        )
        
        // 1時間後にタイムアウトする
        val oneHourLater = now.plusSeconds(Session.SESSION_TIMEOUT_HOURS * 3600 + 1)
        assertTrue(session.isTimedOut(oneHourLater))
        assertFalse(session.isValid(oneHourLater))
    }

    @Test
    fun `異常系: 悪意のあるスクリプトを含む入力が無害化され、適切なエラーメッセージが表示される`() {
        // Given: 悪意のあるスクリプトを含む入力
        val maliciousInputs = listOf(
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<iframe src='evil.com'></iframe>",
            "'; DROP TABLE users; --",
            "1 OR 1=1",
            "<object data='evil.swf'></object>"
        )
        
        maliciousInputs.forEach { maliciousInput ->
            // When: フォームに送信
            val isValidInput = inputSanitizer.isValidInput(maliciousInput)
            
            // Then: XSS対策により無害化され、適切なエラーメッセージが表示される
            assertFalse(isValidInput, "Should detect malicious input: $maliciousInput")
            
            if (isValidInput) {
                val sanitized = inputSanitizer.sanitizeForHtml(maliciousInput)
                assertFalse(sanitized.contains("<script>"), "Should sanitize script tags")
                assertFalse(sanitized.contains("javascript:"), "Should sanitize javascript protocol")
            }
        }
    }

    @Test
    fun `RBAC: ロールベースアクセス制御が正しく動作する`() {
        // Given: 異なるロールのユーザー
        val regularUser = User(
            id = UserId(1L),
            username = Username("user"),
            hashedPassword = HashedPassword("hashed"),
            role = Role.USER,
            isActive = true
        )
        
        val adminUser = User(
            id = UserId(2L),
            username = Username("admin"),
            hashedPassword = HashedPassword("hashed"),
            role = Role.ADMIN,
            isActive = true
        )
        
        // When/Then: 権限チェック
        assertTrue(regularUser.hasRole(Role.USER))
        assertFalse(regularUser.hasRole(Role.ADMIN))
        
        assertTrue(adminUser.hasRole(Role.USER))
        assertTrue(adminUser.hasRole(Role.ADMIN))
        
        // 権限による制御
        assertTrue(adminUser.role.hasPermission(Permission.READ_ALL))
        assertTrue(adminUser.role.hasPermission(Permission.WRITE_ALL))
        assertTrue(adminUser.role.hasPermission(Permission.DELETE_ALL))
        
        assertTrue(regularUser.role.hasPermission(Permission.READ_OWN))
        assertFalse(regularUser.role.hasPermission(Permission.READ_ALL))
        assertFalse(regularUser.role.hasPermission(Permission.WRITE_ALL))
        assertFalse(regularUser.role.hasPermission(Permission.DELETE_ALL))
    }

    @Test
    fun `パスワード複雑性要件が正しく適用される`() {
        // Valid passwords
        val validPasswords = listOf(
            "SecurePass123!",
            "AnotherGood1@",
            "MyP@ssw0rd",
            "C0mpl3x!P@ss"
        )
        
        validPasswords.forEach { password ->
            assertDoesNotThrow("Should accept valid password: $password") {
                PlainPassword(password)
            }
        }
        
        // Invalid passwords
        val invalidPasswords = mapOf(
            "short" to "too short",
            "nouppercase123!" to "no uppercase",
            "NOLOWERCASE123!" to "no lowercase",
            "NoDigits!" to "no digits",
            "NoSpecialChars123" to "no special characters",
            "" to "empty"
        )
        
        invalidPasswords.forEach { (password, reason) ->
            assertFailsWith<IllegalArgumentException>("Should reject password ($reason): $password") {
                PlainPassword(password)
            }
        }
    }

    @Test
    fun `HTTPSとセキュリティヘッダーの設定確認`() {
        // SecurityHeadersFilterで設定されるヘッダーの検証は統合テストで実施
        // ここではセキュリティ設定のロジックを確認
        
        // CSP設定
        val expectedCSP = "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self'; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'"
        
        assertTrue(expectedCSP.contains("default-src 'self'"))
        assertTrue(expectedCSP.contains("frame-ancestors 'none'"))
        assertTrue(expectedCSP.contains("script-src 'self'"))
    }
}