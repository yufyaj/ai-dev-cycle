package com.aidev.infrastructure.security

import com.aidev.domain.security.InputSanitizer
import org.springframework.stereotype.Service
import java.util.regex.Pattern

@Service
class OwaspInputSanitizer : InputSanitizer {

    companion object {
        private val HTML_PATTERN = Pattern.compile("<[^>]*>")
        private val SCRIPT_PATTERN = Pattern.compile("(?i)<script[^>]*>.*?</script>")
        private val SQL_INJECTION_PATTERNS = listOf(
            Pattern.compile("(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)\\s"),
            Pattern.compile("(?i)(--|#|/\\*|\\*/|'|;)"),
            Pattern.compile("(?i)(or|and)\\s+(1=1|true|false)")
        )
        private val XSS_PATTERNS = listOf(
            Pattern.compile("(?i)(javascript:|vbscript:|onload|onerror|onclick|onmouseover)"),
            Pattern.compile("(?i)(<script|</script|<iframe|</iframe|<object|</object)")
        )
    }

    override fun sanitizeForHtml(input: String): String {
        var sanitized = input
        
        // Remove script tags
        sanitized = SCRIPT_PATTERN.matcher(sanitized).replaceAll("")
        
        // Escape HTML entities
        sanitized = sanitized
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;")
            
        return sanitized
    }

    override fun sanitizeForSql(input: String): String {
        return input
            .replace("'", "''")
            .replace("--", "")
            .replace(";", "")
            .replace("/*", "")
            .replace("*/", "")
    }

    override fun isValidInput(input: String): Boolean {
        // Check for SQL injection patterns
        for (pattern in SQL_INJECTION_PATTERNS) {
            if (pattern.matcher(input).find()) {
                return false
            }
        }
        
        // Check for XSS patterns
        for (pattern in XSS_PATTERNS) {
            if (pattern.matcher(input).find()) {
                return false
            }
        }
        
        return true
    }
}