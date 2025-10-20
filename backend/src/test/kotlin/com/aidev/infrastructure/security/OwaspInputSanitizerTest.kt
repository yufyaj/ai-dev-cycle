package com.aidev.infrastructure.security

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class OwaspInputSanitizerTest {

    private val sanitizer = OwaspInputSanitizer()

    @Test
    fun `should sanitize HTML content`() {
        val maliciousInput = "<script>alert('xss')</script><p>Hello</p>"
        val sanitized = sanitizer.sanitizeForHtml(maliciousInput)
        
        assertFalse(sanitized.contains("<script>"))
        assertTrue(sanitized.contains("&lt;p&gt;Hello&lt;/p&gt;"))
    }

    @Test
    fun `should sanitize special characters for HTML`() {
        val input = "Hello & <world> \"test\" 'quote'"
        val sanitized = sanitizer.sanitizeForHtml(input)
        
        assertEquals("Hello &amp; &lt;world&gt; &quot;test&quot; &#39;quote&#39;", sanitized)
    }

    @Test
    fun `should sanitize SQL injection attempts`() {
        val sqlInput = "'; DROP TABLE users; --"
        val sanitized = sanitizer.sanitizeForSql(sqlInput)
        
        assertFalse(sanitized.contains("DROP"))
        assertFalse(sanitized.contains("--"))
        assertFalse(sanitized.contains(";"))
    }

    @Test
    fun `should detect SQL injection patterns`() {
        val maliciousInputs = listOf(
            "1 OR 1=1",
            "'; DROP TABLE users; --",
            "admin'--",
            "1 UNION SELECT * FROM users",
            "/* comment */ SELECT"
        )
        
        maliciousInputs.forEach { input ->
            assertFalse(sanitizer.isValidInput(input), "Should detect malicious input: $input")
        }
    }

    @Test
    fun `should detect XSS patterns`() {
        val maliciousInputs = listOf(
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<iframe src='evil.com'></iframe>",
            "onload=\"alert('xss')\"",
            "<object data='evil.swf'></object>"
        )
        
        maliciousInputs.forEach { input ->
            assertFalse(sanitizer.isValidInput(input), "Should detect XSS input: $input")
        }
    }

    @Test
    fun `should allow valid inputs`() {
        val validInputs = listOf(
            "Hello World",
            "user@example.com",
            "Valid text with numbers 123",
            "Some punctuation: !@#$%^&*()",
            "Multi-word phrase with spaces"
        )
        
        validInputs.forEach { input ->
            assertTrue(sanitizer.isValidInput(input), "Should allow valid input: $input")
        }
    }

    @Test
    fun `should handle empty and null inputs safely`() {
        assertTrue(sanitizer.isValidInput(""))
        assertEquals("", sanitizer.sanitizeForHtml(""))
        assertEquals("", sanitizer.sanitizeForSql(""))
    }
}